// Photo background worker.
//
// Two jobs, both driven by polling the photos table:
//
//   1. Conversion  — RAW/HEIC uploads land with image_url NULL. Convert them to
//                    JPEG and fill in image_url.
//   2. Derivatives — every photo with a real image but no thumb_url gets a
//                    640px thumbnail and a 2048px display copy generated. This
//                    also backfills photos uploaded before derivatives existed.
//   3. Resume      — the resume PDF is rasterised to WebP page images so the
//                    resume page can display it without a PDF embed.
const { Pool } = require('pg');
const { exiftool } = require('exiftool-vendored');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const derivatives = require('./derivatives');
const resume = require('./resume');

const POLL_MS = parseInt(process.env.WORKER_POLL_MS || '5000', 10);
const BATCH_SIZE = parseInt(process.env.WORKER_BATCH || '5', 10);
const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads';
const BASE_URL = process.env.API_SERVER_URL;
const KEEP_RAW = (process.env.KEEP_RAW || 'false').toLowerCase() === 'true';

if (!BASE_URL) {
  console.error('API_SERVER_URL is required for worker');
  process.exit(1);
}

const RAW_EXTS = new Set(['.nef', '.dng', '.cr2', '.cr3', '.arw', '.rw2', '.orf', '.raf', '.srw']);
const HEIC_EXTS = new Set(['.heic', '.heif']);

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
});

const makeJpegName = () => `photo-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;

const publicUrl = (storageKey) => `${BASE_URL}/uploads/${storageKey}`;

/** The storage key for a photo's viewable image, whatever route it arrived by. */
const imageStorageKey = (row) => {
  if (row.storage_key && !RAW_EXTS.has(path.extname(row.storage_key).toLowerCase())
      && !HEIC_EXTS.has(path.extname(row.storage_key).toLowerCase())) {
    return row.storage_key;
  }
  // Converted RAW/HEIC: storage_key still points at the (possibly deleted)
  // original, so recover the JPEG name from the stored URL instead.
  if (!row.image_url) return null;
  try {
    const pathname = new URL(row.image_url).pathname;
    const marker = '/uploads/';
    const idx = pathname.indexOf(marker);
    return idx === -1 ? null : decodeURIComponent(pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
};

const convertRaw = async (inputPath, outputPath) => {
  await exiftool.extractJpgFromRaw(inputPath, outputPath);
};

const convertHeic = async (inputPath, outputPath) => {
  await sharp(inputPath).rotate().jpeg({ quality: 90 }).toFile(outputPath);
};

// --- Job 1: RAW/HEIC -> JPEG ---------------------------------------------

const convertRow = async (row) => {
  if (!row.storage_key) return;
  const ext = path.extname(row.storage_key).toLowerCase();
  const inputPath = path.join(UPLOADS_DIR, row.storage_key);
  if (!fs.existsSync(inputPath)) {
    console.warn(`Missing file for photo ${row.id}: ${inputPath}`);
    return;
  }

  const jpegName = makeJpegName();
  const outputPath = path.join(UPLOADS_DIR, jpegName);

  if (RAW_EXTS.has(ext)) {
    await convertRaw(inputPath, outputPath);
  } else if (HEIC_EXTS.has(ext)) {
    await convertHeic(inputPath, outputPath);
  } else {
    console.warn(`Unsupported extension for conversion: ${row.storage_key}`);
    return;
  }

  await pool.query(
    'UPDATE photos SET image_url = $1 WHERE id = $2 AND image_url IS NULL',
    [publicUrl(jpegName), row.id]
  );

  if (!KEEP_RAW) {
    try { fs.unlinkSync(inputPath); } catch (e) { console.warn('Failed to delete raw file', e); }
  }
};

const pollConversions = async () => {
  const { rows } = await pool.query(
    `SELECT id, storage_key
       FROM photos
      WHERE image_url IS NULL AND storage_key IS NOT NULL
      ORDER BY created_at ASC
      LIMIT $1`,
    [BATCH_SIZE]
  );
  for (const row of rows) {
    try {
      await convertRow(row);
    } catch (e) {
      console.error(`Failed to convert photo ${row.id}`, e);
    }
  }
  return rows.length;
};

// --- Job 2: thumbnail + display derivatives -------------------------------

const derivativeRow = async (row) => {
  const sourceKey = imageStorageKey(row);
  if (!sourceKey) {
    throw new Error(`Cannot resolve source image for photo ${row.id}`);
  }
  const result = await derivatives.generate(UPLOADS_DIR, sourceKey);
  await pool.query(
    `UPDATE photos
        SET thumb_url = $1,
            display_url = $2,
            width = $3,
            height = $4,
            bytes = $5,
            derivatives_failed = FALSE
      WHERE id = $6`,
    [
      publicUrl(result.thumbKey),
      publicUrl(result.displayKey),
      result.width,
      result.height,
      result.bytes,
      row.id,
    ]
  );
  console.log(
    `Derivatives ready for photo ${row.id} (${sourceKey}, ${(result.bytes / 1e6).toFixed(1)} MB original)`
  );
};

const pollDerivatives = async () => {
  const { rows } = await pool.query(
    `SELECT id, storage_key, image_url
       FROM photos
      WHERE image_url IS NOT NULL
        AND thumb_url IS NULL
        AND derivatives_failed = FALSE
      ORDER BY created_at DESC
      LIMIT $1`,
    [BATCH_SIZE]
  );
  for (const row of rows) {
    try {
      await derivativeRow(row);
    } catch (e) {
      console.error(`Failed to build derivatives for photo ${row.id}`, e.message);
      // Flag it so one broken file doesn't stall the queue forever. Clearing
      // derivatives_failed in the DB re-queues it.
      await pool
        .query('UPDATE photos SET derivatives_failed = TRUE WHERE id = $1', [row.id])
        .catch(() => {});
    }
  }
  return rows.length;
};

let running = false;

// --- Job 3: resume PDF -> page images ------------------------------------

const pollResume = async () => {
  try {
    const { rendered, pages } = await resume.render(UPLOADS_DIR);
    if (rendered) console.log(`Resume rendered to ${pages} page image(s)`);
  } catch (e) {
    // Never let a bad PDF take the worker down; the resume page falls back to
    // offering the raw PDF.
    console.error('Failed to render resume pages', e.message);
  }
};

const poll = async () => {
  if (running) return; // a slow batch must not overlap the next tick
  running = true;
  try {
    await pollConversions();
    await pollDerivatives();
    await pollResume();
  } catch (e) {
    console.error('Worker poll failed', e);
  } finally {
    running = false;
  }
};

const start = async () => {
  console.log('Photo worker started');
  await poll();
  setInterval(poll, POLL_MS);
};

const shutdown = async () => {
  try { await exiftool.end(); } catch (e) {}
  try { await pool.end(); } catch (e) {}
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
