// Photo background worker.
//
// Two jobs, both driven by polling the photos table:
//
//   1. Conversion  — non-JPEG uploads (RAW, HEIC, PNG, WebP, TIFF, AVIF) land
//                    with image_url NULL. Convert them to JPEG and fill in
//                    image_url.
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
const { execFile } = require('child_process');
const { promisify } = require('util');
const derivatives = require('./derivatives');
const resume = require('./resume');

const execFileAsync = promisify(execFile);

const POLL_MS = parseInt(process.env.WORKER_POLL_MS || '5000', 10);
const BATCH_SIZE = parseInt(process.env.WORKER_BATCH || '5', 10);
const UPLOADS_DIR = process.env.UPLOADS_DIR || '/app/uploads';
const BASE_URL = process.env.API_SERVER_URL;
const KEEP_RAW = (process.env.KEEP_RAW || 'false').toLowerCase() === 'true';

if (!BASE_URL) {
  console.error('API_SERVER_URL is required for worker');
  process.exit(1);
}

// Anything that is not already a JPEG is uploaded into uploads/raw/ and
// converted here. The extension lists mirror PHOTO_EXTS in server/index.js.
const RAW_EXTS = new Set(['.nef', '.dng', '.cr2', '.cr3', '.arw', '.rw2', '.orf', '.raf', '.srw']);
const HEIC_EXTS = new Set(['.heic', '.heif']);
const SHARP_EXTS = new Set(['.png', '.webp', '.tif', '.tiff', '.avif']);

const JPEG_QUALITY = 92;
// An embedded RAW preview at least this long on its long edge is used as-is;
// smaller ones (typical of phone DNGs) are replaced by a full LibRaw decode.
const MIN_PREVIEW_EDGE = 2048;

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
  // JPEG uploads are stored and served as-is.
  if (row.storage_key && !row.storage_key.startsWith('raw/')) return row.storage_key;
  // Converted uploads: storage_key still points at the (usually deleted)
  // source under raw/, so recover the JPEG name from the stored URL instead.
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

/**
 * Encode `input` as a JPEG at `outputPath`, baking in its EXIF orientation
 * unless `autoOrient` is false because the decoder already applied it. The
 * output carries no metadata, so nothing downstream can rotate it again.
 */
const writeJpeg = async (input, outputPath, { autoOrient = true } = {}) => {
  let pipeline = sharp(input);
  if (autoOrient) pipeline = pipeline.rotate();
  await pipeline
    .flatten({ background: '#ffffff' }) // PNG/WebP transparency has no JPEG equivalent
    .toColourspace('srgb')
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toFile(outputPath);
};

const fileExists = (p) => {
  try {
    return fs.statSync(p).size > 0;
  } catch {
    return false;
  }
};

// iPhone HEICs are HEVC-coded. sharp's prebuilt libvips cannot decode HEVC,
// so decode with libheif's heif-dec (built with libde265) to PNG first.
// libheif applies the file's rotation/mirror transforms while decoding.
const convertHeic = async (inputPath, outputPath, tmpDir) => {
  const pngPath = path.join(tmpDir, 'decoded.png');
  await execFileAsync('heif-dec', [inputPath, pngPath], { timeout: 120000 });
  if (!fileExists(pngPath)) throw new Error('heif-dec produced no output');
  await writeJpeg(pngPath, outputPath, { autoOrient: false });
};

// Camera RAWs embed a full-size JPEG rendered with the camera's own colour
// settings, which looks better than a generic demosaic and costs nothing to
// extract. Fall back to decoding the sensor data with LibRaw when there is
// no preview or only a small one.
const convertRaw = async (inputPath, outputPath, tmpDir) => {
  const tags = await exiftool.read(inputPath);
  const orientation = Number(tags.Orientation) || 1;

  let best = null;
  const extractors = [
    ['JpgFromRaw', (out) => exiftool.extractJpgFromRaw(inputPath, out)],
    ['PreviewImage', (out) => exiftool.extractPreview(inputPath, out)],
  ];
  for (const [name, extract] of extractors) {
    const out = path.join(tmpDir, `${name}.jpg`);
    try {
      await extract(out);
      if (!fileExists(out)) continue;
      const { width, height } = await sharp(out).metadata();
      const edge = Math.max(width || 0, height || 0);
      if (!best || edge > best.edge) best = { out, edge };
    } catch {
      // This format has no such tag; try the next one.
    }
  }

  if (best && best.edge >= MIN_PREVIEW_EDGE) {
    // Already a finished JPEG, so keep its bytes. Previews are stored
    // unrotated and the RAW's Orientation tag says how to display them; copy
    // that tag across losslessly; the derivatives honour it.
    fs.copyFileSync(best.out, outputPath);
    if (orientation !== 1) {
      await exiftool.write(outputPath, { Orientation: orientation }, { writeArgs: ['-n', '-overwrite_original'] });
    }
    return `embedded ${best.edge}px preview, orientation ${orientation}`;
  }

  // dcraw_emu writes <input>.tiff; -w camera white balance, -o 1 sRGB,
  // -q 3 AHD interpolation, -T TIFF output. It applies orientation itself.
  const tmpInput = path.join(tmpDir, `source${path.extname(inputPath)}`);
  fs.copyFileSync(inputPath, tmpInput);
  await execFileAsync('dcraw_emu', ['-w', '-o', '1', '-q', '3', '-T', tmpInput], {
    timeout: 300000,
  });
  const tiffPath = `${tmpInput}.tiff`;
  if (!fileExists(tiffPath)) throw new Error('dcraw_emu produced no output');
  await writeJpeg(tiffPath, outputPath, { autoOrient: false });
  return best ? `LibRaw decode (preview only ${best.edge}px)` : 'LibRaw decode (no preview)';
};

// --- Job 1: non-JPEG uploads -> JPEG --------------------------------------

const convertRow = async (row) => {
  if (!row.storage_key) throw new Error('Photo has no storage_key');
  const ext = path.extname(row.storage_key).toLowerCase();
  const inputPath = path.join(UPLOADS_DIR, row.storage_key);
  if (!fs.existsSync(inputPath)) throw new Error(`Missing file: ${inputPath}`);

  const jpegName = makeJpegName();
  const outputPath = path.join(UPLOADS_DIR, jpegName);
  // Scratch space on the uploads volume (not the container's RAM-backed /tmp):
  // a decoded 45MP frame is hundreds of MB. uploads/raw/ is never served.
  const tmpDir = path.join(UPLOADS_DIR, 'raw', `.convert-${row.id}-${crypto.randomUUID().slice(0, 8)}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  let how;
  try {
    if (RAW_EXTS.has(ext)) {
      how = await convertRaw(inputPath, outputPath, tmpDir);
    } else if (HEIC_EXTS.has(ext)) {
      await convertHeic(inputPath, outputPath, tmpDir);
      how = 'libheif';
    } else if (SHARP_EXTS.has(ext)) {
      await writeJpeg(inputPath, outputPath);
      how = 'sharp';
    } else {
      throw new Error(`Unsupported extension for conversion: ${row.storage_key}`);
    }
  } catch (e) {
    try { fs.unlinkSync(outputPath); } catch {}
    throw e;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  await pool.query(
    'UPDATE photos SET image_url = $1 WHERE id = $2 AND image_url IS NULL',
    [publicUrl(jpegName), row.id]
  );
  console.log(`Converted photo ${row.id} (${row.storage_key}) via ${how}`);

  if (!KEEP_RAW) {
    try { fs.unlinkSync(inputPath); } catch (e) { console.warn('Failed to delete source file', e); }
  }
};

const pollConversions = async () => {
  const { rows } = await pool.query(
    `SELECT id, storage_key
       FROM photos
      WHERE image_url IS NULL
        AND storage_key IS NOT NULL
        AND conversion_failed = FALSE
      ORDER BY created_at ASC
      LIMIT $1`,
    [BATCH_SIZE]
  );
  for (const row of rows) {
    try {
      await convertRow(row);
    } catch (e) {
      console.error(`Failed to convert photo ${row.id} (${row.storage_key}):`, e.message);
      // Flag it so one unreadable file can't block every upload behind it.
      // Clearing conversion_failed in the DB re-queues it.
      await pool
        .query('UPDATE photos SET conversion_failed = TRUE WHERE id = $1', [row.id])
        .catch(() => {});
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
