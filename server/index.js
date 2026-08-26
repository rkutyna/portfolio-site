// 1. Import Express
// This line uses Node.js's `require` function to import the Express library
// that we just installed. We need this to use Express's features.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken'); // NEW: JWT for admin auth
const logger = require('./logger'); // centralized winston logger
const geoip = require('geoip-lite');
const morgan = require('morgan');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://rogerkutyna.com',
    'https://api.rogerkutyna.com',
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.API_SERVER_URL,
  ],
  // credentials: true // Uncomment if you ever use cookies for auth
}));
app.use(express.json({ limit: '1mb' })); // Add this middleware to parse JSON bodies

// --- Editable site copy ---
// Every one of these keys is exposed at GET /api/content and editable from
// /admin/content. Defaults are seeded once; after that the DB row wins.
const CONTENT_DEFAULTS = {
  site_title: "R. Kutyna | Roger Kutyna's ML/AI Portfolio",
  site_description: "Roger Kutyna's ML/AI portfolio.",
  brand_name: 'Roger Kutyna',
  hero_title: 'Roger Kutyna',
  hero_subtitle:
    'ML and applied AI engineer. M.Sc. Information Technology (Generative AI), Clark University. Bird photographer.',
  hero_primary_label: 'View My Work',
  hero_primary_href: '#projects',
  contact_email: 'rkutyna@clarku.edu',
  about_heading: 'About',
  about_body:
    "I'm an ML and applied AI engineer with an M.Sc. in Information Technology (Generative AI) from Clark University. I build practical systems that put machine learning to work, and when I'm not doing that you'll usually find me outside with a camera pointed at a bird.",
  projects_heading: 'Projects',
  blogs_heading: 'Blog Posts',
  photos_heading: 'Photo Gallery',
  photos_intro: '',
  contact_heading: 'Contact',
  contact_body: "The fastest way to reach me is email. I'm always happy to talk about ML, engineering work, or birds.",
  resume_heading: 'Resume',
  footer_text: 'All rights reserved.',
};

const CONTENT_KEYS = new Set(Object.keys(CONTENT_DEFAULTS));
const CONTENT_MAX_LEN = 20000;

// --- JWT Admin Auth Middleware ---
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.admin = user;
    next();
  });
};

// HTTP request logging via morgan (writes through winston)
morgan.token('client-ip', (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown');
const morganFormat = ':client-ip :method :url :status :res[content-length] - :response-time ms';
app.use(morgan(morganFormat, {
  stream: {
    write: (message) => logger.http(message.trim())
  }
}));

// Fallback performance logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`[${req.method}] ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// --- Admin Login Endpoint ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('/api/admin/verify', requireAdmin, (req, res) => {
  res.json({ ok: true });
});

app.post('/api/admin/login', loginLimiter, (req, res) => {
  const { secret } = req.body;
  if (!secret || secret !== process.env.ADMIN_SECRET_KEY) {
    return res.status(401).json({ error: 'Invalid secret key' });
  }
  // Issue JWT
  const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
});

// Serve static files from the 'uploads' directory with CORS headers for images
app.use('/uploads', (req, res, next) => {
  if (req.path.startsWith('/raw/')) {
    return res.status(403).end();
  }
  const allowedOrigins = [
    'https://rogerkutyna.com',
    'https://api.rogerkutyna.com',
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.API_SERVER_URL,
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  // Upload filenames embed a timestamp and are never rewritten in place, so the
  // bytes at a given URL never change. The one exception is resume.pdf, which is
  // overwritten on re-upload and is served through /api/resume anyway.
  maxAge: '365d',
  immutable: true,
  setHeaders: (res, filePath) => {
    if (path.basename(filePath) === 'resume.pdf') {
      res.setHeader('Cache-Control', 'public, max-age=300');
    }
  },
}));

// Set up multer for file storage
const uploadsRoot = path.resolve(__dirname, 'uploads');
const rawUploadsDir = path.join(uploadsRoot, 'raw');
const videosDir = path.join(uploadsRoot, 'videos');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const isJpeg = ext === '.jpg' || ext === '.jpeg';
    const targetDir = isJpeg ? uploadsRoot : rawUploadsDir;
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename to avoid overwrites
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const projectMediaStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const targetDir = file.fieldname === 'video' ? videosDir : uploadsRoot;
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const isAllowedImage = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isJpeg = file.mimetype === 'image/jpeg' && (ext === '.jpg' || ext === '.jpeg');
  return isJpeg;
};

const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.avi', '.mkv']);
const isAllowedVideo = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  return VIDEO_EXTS.has(ext);
};

const uploadImages = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    if (!isAllowedImage(file)) {
      return cb(new Error('Only JPEG images are allowed.'));
    }
    cb(null, true);
  }
});

// Used for project creation: handles both image files and one video file
const uploadProjectMedia = multer({
  storage: projectMediaStorage,
  limits: {
    fileSize: 500 * 1024 * 1024,
    files: 11, // up to 10 images + 1 video
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      if (!isAllowedVideo(file)) {
        return cb(new Error('Only MP4, WebM, MOV, AVI, or MKV video files are allowed.'));
      }
    } else {
      if (!isAllowedImage(file)) {
        return cb(new Error('Only JPEG images are allowed.'));
      }
    }
    cb(null, true);
  }
});

// Chunked video upload — each chunk stored in /tmp/video-chunks/<uploadId>/
const UPLOAD_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const chunkStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadId = req.body.uploadId;
    if (!uploadId || !UPLOAD_ID_RE.test(uploadId)) {
      return cb(new Error('Invalid uploadId'));
    }
    const dir = path.join('/tmp', 'video-chunks', uploadId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const idx = parseInt(req.body.chunkIndex, 10);
    if (isNaN(idx) || idx < 0) return cb(new Error('Invalid chunkIndex'));
    cb(null, `chunk-${String(idx).padStart(6, '0')}`);
  },
});
const uploadChunk = multer({
  storage: chunkStorage,
  limits: { fileSize: 55 * 1024 * 1024, files: 1 },
});

// Resume upload — single PDF stored as uploads/resume.pdf (overwrites previous)
const resumeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    fs.mkdirSync(uploadsRoot, { recursive: true });
    cb(null, uploadsRoot);
  },
  filename: function (req, file, cb) {
    cb(null, 'resume.pdf');
  }
});

const uploadResume = multer({
  storage: resumeStorage,
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed for the resume.'));
    }
    cb(null, true);
  }
});

app.get('/api/resume', (req, res) => {
  const resumePath = path.join(uploadsRoot, 'resume.pdf');
  if (!fs.existsSync(resumePath)) {
    return res.status(404).json({ error: 'No resume uploaded yet.' });
  }
  res.sendFile(resumePath);
});

// Rendered page images for the resume, produced by the worker.
//
// The resume used to be embedded as a PDF via <object>/<iframe>, which the
// browser blocks: the PDF is served from this origin but framed on the site's
// origin, and helmet sends X-Frame-Options: SAMEORIGIN. Mobile browsers will
// not inline-render a PDF embed regardless. Serving page images sidesteps both.
app.get('/api/resume/pages', (req, res) => {
  const manifestPath = path.join(uploadsRoot, 'resume-pages', 'manifest.json');
  const baseUrl = process.env.API_SERVER_URL || `${req.protocol}://${req.get('host')}`;
  try {
    if (!fs.existsSync(manifestPath)) {
      // Not rendered yet (or no resume uploaded). The client falls back to
      // offering the PDF directly rather than showing an error.
      return res.json({ pages: [], pending: fs.existsSync(path.join(uploadsRoot, 'resume.pdf')) });
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      pages: (manifest.pages || []).map((page) => ({
        url: `${baseUrl}/uploads/${page.key}`,
        width: page.width,
        height: page.height,
      })),
      renderedAt: manifest.renderedAt || null,
      pending: false,
    });
  } catch (err) {
    logger.error('Error reading resume manifest', { err: err.message });
    res.json({ pages: [], pending: false });
  }
});

app.post('/api/resume', requireAdmin, uploadResume.single('resume'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const baseUrl = process.env.API_SERVER_URL || `${req.protocol}://${req.get('host')}`;
  res.json({ url: `${baseUrl}/api/resume` });
});

// --- Chunked Video Upload Endpoints ---

// Receive one chunk from the client
app.post('/api/upload/video/chunk', requireAdmin, uploadChunk.single('chunk'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No chunk data received' });
  res.json({ ok: true });
});

// Assemble all chunks into the final video file
app.post('/api/upload/video/assemble', requireAdmin, async (req, res) => {
  const { uploadId, originalFilename, totalChunks } = req.body;

  if (!uploadId || !UPLOAD_ID_RE.test(uploadId)) {
    return res.status(400).json({ error: 'Invalid uploadId' });
  }
  const total = parseInt(totalChunks, 10);
  if (isNaN(total) || total < 1 || total > 200) {
    return res.status(400).json({ error: 'Invalid totalChunks' });
  }
  const ext = path.extname(originalFilename || '').toLowerCase();
  if (!VIDEO_EXTS.has(ext)) {
    return res.status(400).json({ error: 'Invalid video extension' });
  }

  const chunkDir = path.join('/tmp', 'video-chunks', uploadId);
  const finalFilename = `video-${Date.now()}${ext}`;
  fs.mkdirSync(videosDir, { recursive: true });
  const finalPath = path.join(videosDir, finalFilename);

  // Verify all chunks exist before writing
  for (let i = 0; i < total; i++) {
    const chunkPath = path.join(chunkDir, `chunk-${String(i).padStart(6, '0')}`);
    if (!fs.existsSync(chunkPath)) {
      return res.status(400).json({ error: `Missing chunk ${i}` });
    }
  }

  let writeStream = null;
  try {
    writeStream = fs.createWriteStream(finalPath);
    for (let i = 0; i < total; i++) {
      const chunkPath = path.join(chunkDir, `chunk-${String(i).padStart(6, '0')}`);
      await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(chunkPath);
        readStream.on('error', reject);
        readStream.on('end', resolve);
        readStream.pipe(writeStream, { end: false });
      });
    }
    await new Promise((resolve, reject) => {
      writeStream.end();
      writeStream.once('finish', resolve);
      writeStream.once('error', reject);
    });

    fs.rmSync(chunkDir, { recursive: true, force: true });

    const baseUrl = process.env.API_SERVER_URL || `${req.protocol}://${req.get('host')}`;
    res.json({ url: `${baseUrl}/uploads/videos/${finalFilename}` });
  } catch (err) {
    if (writeStream) writeStream.destroy();
    try { if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath); } catch {}
    try { fs.rmSync(chunkDir, { recursive: true, force: true }); } catch {}
    logger.error('Error assembling video chunks', { err: err.message });
    res.status(500).json({ error: 'Failed to assemble video' });
  }
});

const RAW_EXTS = new Set(['.nef', '.dng', '.cr2', '.cr3', '.arw', '.rw2', '.orf', '.raf', '.srw']);
const HEIC_EXTS = new Set(['.heic', '.heif']);
const PHOTO_EXTS = new Set(['.jpg', '.jpeg', ...RAW_EXTS, ...HEIC_EXTS]);

const isAllowedPhoto = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  return PHOTO_EXTS.has(ext);
};

const uploadPhotos = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
    files: 25,
  },
  fileFilter: (req, file, cb) => {
    if (!isAllowedPhoto(file)) {
      return cb(new Error('Only JPEG, RAW, or HEIC images are allowed.'));
    }
    cb(null, true);
  }
});

// --- Site Content Endpoints ---
// Public read: returns every key, falling back to the compiled-in default so
// the site still renders correctly if a row was never seeded.
app.get('/api/content', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT key, value FROM site_content');
    const content = { ...CONTENT_DEFAULTS };
    for (const row of rows) {
      if (CONTENT_KEYS.has(row.key)) content[row.key] = row.value;
    }
    res.set('Cache-Control', 'public, max-age=30');
    res.json(content);
  } catch (err) {
    logger.error('Error reading site content', { err: err.message });
    // Never fail the page render over copy — fall back to defaults.
    res.json({ ...CONTENT_DEFAULTS });
  }
});

// Admin bulk update. Accepts a partial map; unknown keys are rejected outright
// so the table can't be used as arbitrary storage.
app.put('/api/content', requireAdmin, async (req, res) => {
  const updates = req.body || {};
  const entries = Object.entries(updates);
  if (!entries.length) return res.status(400).json({ error: 'No content supplied' });

  const unknown = entries.filter(([k]) => !CONTENT_KEYS.has(k)).map(([k]) => k);
  if (unknown.length) {
    return res.status(400).json({ error: `Unknown content keys: ${unknown.join(', ')}` });
  }
  const tooLong = entries.filter(([, v]) => typeof v === 'string' && v.length > CONTENT_MAX_LEN);
  if (tooLong.length) {
    return res.status(400).json({ error: `Value too long for: ${tooLong.map(([k]) => k).join(', ')}` });
  }
  const badType = entries.filter(([, v]) => typeof v !== 'string');
  if (badType.length) {
    return res.status(400).json({ error: `Values must be strings: ${badType.map(([k]) => k).join(', ')}` });
  }

  try {
    await pool.query(
      `INSERT INTO site_content (key, value, updated_at)
       SELECT k, v, NOW() FROM UNNEST($1::text[], $2::text[]) AS t(k, v)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [entries.map(([k]) => k), entries.map(([, v]) => v)]
    );
    const { rows } = await pool.query('SELECT key, value FROM site_content');
    const content = { ...CONTENT_DEFAULTS };
    for (const row of rows) {
      if (CONTENT_KEYS.has(row.key)) content[row.key] = row.value;
    }
    res.json(content);
  } catch (err) {
    logger.error('Error updating site content', { err: err.message });
    res.status(500).json({ error: 'Failed to update site content' });
  }
});

// Restore one key to its shipped default.
app.delete('/api/content/:key', requireAdmin, async (req, res) => {
  const { key } = req.params;
  if (!CONTENT_KEYS.has(key)) return res.status(404).json({ error: 'Unknown content key' });
  try {
    await pool.query(
      `INSERT INTO site_content (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, CONTENT_DEFAULTS[key]]
    );
    res.json({ key, value: CONTENT_DEFAULTS[key] });
  } catch (err) {
    logger.error('Error resetting site content', { err: err.message });
    res.status(500).json({ error: 'Failed to reset content key' });
  }
});

// Remove every file a photo row points at: the original, its derivatives, and
// any RAW source. Paths come from the DB rather than being recomputed, so a
// rename in the derivative naming scheme can never orphan old files.
const uploadsDirAbs = path.resolve(__dirname, 'uploads');

const deleteUploadByUrl = (fileUrl) => {
  if (!fileUrl) return;
  try {
    const filename = path.basename(new URL(fileUrl).pathname);
    const filePath = path.join(uploadsDirAbs, filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    logger.warn('Failed to delete upload file', { url: fileUrl, err: e.message });
  }
};

const deletePhotoFiles = (photo) => {
  deleteUploadByUrl(photo.image_url);
  deleteUploadByUrl(photo.raw_url);
  deleteUploadByUrl(photo.thumb_url);
  deleteUploadByUrl(photo.display_url);
  if (photo.storage_key) {
    // storage_key may sit under uploads/raw/, so resolve and bounds-check it.
    const storagePath = path.resolve(uploadsDirAbs, photo.storage_key);
    if (storagePath.startsWith(uploadsDirAbs + path.sep)) {
      try {
        if (fs.existsSync(storagePath)) fs.unlinkSync(storagePath);
      } catch (e) {
        logger.warn('Failed to delete storage_key file', { key: photo.storage_key, err: e.message });
      }
    }
  }
};

// --- Photos Endpoints ---
// List photos
app.get('/api/photos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        MIN(id) AS id,
        MIN(title) AS title,
        MIN(caption) AS caption,
        MIN(upload_group_id) AS upload_group_id,
        COALESCE(
          array_agg(image_url ORDER BY created_at ASC, id ASC) FILTER (WHERE image_url IS NOT NULL),
          ARRAY[]::text[]
        ) AS image_urls,
        -- Derivatives fall back to the original so a photo whose thumbnail has
        -- not been generated yet still renders instead of vanishing.
        COALESCE(
          array_agg(COALESCE(thumb_url, image_url) ORDER BY created_at ASC, id ASC)
            FILTER (WHERE image_url IS NOT NULL),
          ARRAY[]::text[]
        ) AS thumb_urls,
        COALESCE(
          array_agg(COALESCE(display_url, image_url) ORDER BY created_at ASC, id ASC)
            FILTER (WHERE image_url IS NOT NULL),
          ARRAY[]::text[]
        ) AS display_urls,
        COALESCE(
          array_agg(COALESCE(bytes, 0) ORDER BY created_at ASC, id ASC)
            FILTER (WHERE image_url IS NOT NULL),
          ARRAY[]::bigint[]
        ) AS image_bytes,
        COUNT(*) FILTER (WHERE image_url IS NULL) AS pending_count,
        MIN(created_at) AS created_at
      FROM photos
      GROUP BY COALESCE(upload_group_id, id::text)
      ORDER BY MIN(created_at) DESC NULLS LAST, MIN(id) DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

const processPhotoFile = async (file, baseUrl) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const isJpeg = ext === '.jpg' || ext === '.jpeg';
  if (isJpeg) {
    return {
      imageUrl: `${baseUrl}/uploads/${file.filename}`,
      rawUrl: null,
      storageKey: file.filename,
    };
  }
  return {
    imageUrl: null,
    rawUrl: null,
    storageKey: path.posix.join('raw', file.filename),
  };
};

// Create photos (supports RAW/HEIC -> JPEG conversion and deletes originals)
app.post('/api/photos', requireAdmin, uploadLimiter, uploadPhotos.array('photos'), async (req, res) => {
  const { title = null, caption = null, upload_group_id = null } = req.body || {};
  const files = req.files || [];
  if (!files.length) return res.status(400).json({ error: 'Missing photo files' });

  const baseUrl = process.env.API_SERVER_URL || `${req.protocol}://${req.get('host')}`;
  try {
    const uploadGroupId = upload_group_id || crypto.randomUUID();
    const inserted = [];
    for (const file of files) {
      const { imageUrl, rawUrl, storageKey } = await processPhotoFile(file, baseUrl);
      const result = await pool.query(
        'INSERT INTO photos (title, caption, image_url, raw_url, upload_group_id, storage_key) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [title, caption, imageUrl, rawUrl, uploadGroupId, storageKey]
      );
      inserted.push(result.rows[0]);
    }
    res.status(201).json({ upload_group_id: uploadGroupId, photos: inserted });
  } catch (err) {
    console.error('Error processing photo upload', err);
    res.status(500).json({ error: 'Failed to process photo upload' });
  }
});

// Get single photo
app.get('/api/photos/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM photos WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).send('Photo not found');
    const photo = result.rows[0];
    if (photo.upload_group_id) {
      const group = await pool.query(
        'SELECT * FROM photos WHERE upload_group_id = $1 ORDER BY created_at ASC, id ASC',
        [photo.upload_group_id]
      );
      res.json({ photo, group: group.rows });
    } else {
      res.json({ photo, group: [photo] });
    }
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// Update photo metadata (title/caption)
app.put('/api/photos/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title = null, caption = null } = req.body || {};
  try {
    // ensure exists
    const check = await pool.query('SELECT * FROM photos WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).send('Photo not found');
    const result = await pool.query(
      `UPDATE photos
       SET title = COALESCE($1, title),
           caption = COALESCE($2, caption)
       WHERE id = $3
       RETURNING *`,
      [title, caption, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// Update title/caption for every photo in an upload group.
// The gallery presents a group as a single card, so metadata edits have to
// apply to the whole group rather than to whichever row happened to be first.
app.put('/api/photos/group/:groupId', requireAdmin, async (req, res) => {
  const { groupId } = req.params;
  const { title = null, caption = null } = req.body || {};
  try {
    const result = await pool.query(
      `UPDATE photos
          SET title = $1, caption = $2
        WHERE upload_group_id = $3
        RETURNING id`,
      [title, caption, groupId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Photo group not found' });
    res.json({ upload_group_id: groupId, updated: result.rowCount });
  } catch (err) {
    logger.error('Error updating photo group', { err: err.message });
    res.status(500).json({ error: 'Failed to update photo group' });
  }
});

// Delete all photos in an upload group
app.delete('/api/photos/group/:groupId', requireAdmin, async (req, res) => {
  const { groupId } = req.params;
  try {
    const check = await pool.query('SELECT * FROM photos WHERE upload_group_id = $1', [groupId]);
    if (check.rows.length === 0) return res.status(404).send('Photo group not found');

    await pool.query('DELETE FROM photos WHERE upload_group_id = $1', [groupId]);
    for (const photo of check.rows) {
      deletePhotoFiles(photo);
    }
    res.status(204).end();
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// Delete photo (and attempt to delete files)
app.delete('/api/photos/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT * FROM photos WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).send('Photo not found');
    const photo = check.rows[0];

    await pool.query('DELETE FROM photos WHERE id = $1', [id]);
    deletePhotoFiles(photo);
    res.status(204).end();
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

process.once('SIGINT', () => process.exit(0));
process.once('SIGTERM', () => process.exit(0));

// 2. Create an Express App
// This line creates an instance of the Express application. The `app` variable
// is now our main tool for building the server.

// 3. Define a Port
// This will be the network port our server listens on. We choose 3001 to avoid
// conflict with our frontend React app, which is running on port 3000.
const port = 3001;

// Set up the connection pool to the PostgreSQL database
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Function to initialize the database
// Creates the projects table if it doesn't exist and seeds it with initial data.
const initDb = async () => {
  try {
    // Perform a simple query to confirm connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful.');

    // Check if the projects table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        image_url TEXT,
        project_url TEXT,
        video_url TEXT
      );
    `);

    await pool.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS video_url TEXT;
    `);



    // Check if the blog table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blogs (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT,
        image_url TEXT,
        date TIMESTAMPTZ
      );
    `);

    // NEW: Create images tables for projects and blogs (multi-image support)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_images (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS blog_images (
        id SERIAL PRIMARY KEY,
        blog_id INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        position INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Photos table for the gallery
    await pool.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        caption TEXT,
        image_url TEXT NOT NULL,
        raw_url TEXT,
        storage_key TEXT,
        upload_group_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await pool.query(`
      ALTER TABLE photos
      ADD COLUMN IF NOT EXISTS upload_group_id TEXT;
    `);

    await pool.query(`
      ALTER TABLE photos
      ADD COLUMN IF NOT EXISTS storage_key TEXT;
    `);

    // Derivative image columns: small thumbnail + web-sized display copy.
    // The original stays on disk and is linked as a full-resolution download.
    await pool.query(`
      ALTER TABLE photos
      ADD COLUMN IF NOT EXISTS thumb_url TEXT,
      ADD COLUMN IF NOT EXISTS display_url TEXT,
      ADD COLUMN IF NOT EXISTS width INTEGER,
      ADD COLUMN IF NOT EXISTS height INTEGER,
      ADD COLUMN IF NOT EXISTS bytes BIGINT,
      ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS derivatives_failed BOOLEAN NOT NULL DEFAULT FALSE;
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS photos_group_idx ON photos(upload_group_id);
    `);

    // Editable site copy: every string the admin can change lives here as a
    // key/value row so it can be edited without a rebuild.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_content (
        key VARCHAR(64) PRIMARY KEY,
        value TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed defaults only when a key is absent, so edits are never overwritten.
    const seedRows = Object.entries(CONTENT_DEFAULTS);
    await pool.query(
      `INSERT INTO site_content (key, value)
       SELECT * FROM UNNEST($1::text[], $2::text[])
       ON CONFLICT (key) DO NOTHING`,
      [seedRows.map(([k]) => k), seedRows.map(([, v]) => v)]
    );

    await pool.query(`
      CREATE TABLE IF NOT EXISTS page_views (
        id SERIAL PRIMARY KEY,
        resource_type VARCHAR(20) NOT NULL,
        resource_id INTEGER NOT NULL,
        viewed_at TIMESTAMPTZ DEFAULT NOW(),
        is_bot BOOLEAN NOT NULL DEFAULT FALSE,
        ip_hash TEXT,
        user_agent TEXT,
        country CHAR(2),
        city VARCHAR(100)
      );
    `);

    await pool.query(`
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS country CHAR(2);
    `);

    await pool.query(`
      ALTER TABLE page_views ADD COLUMN IF NOT EXISTS city VARCHAR(100);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS page_views_resource_idx ON page_views(resource_type, resource_id);
    `);

  } catch (err) {
    console.error('Error initializing database', err.stack);
  }
};

// 4. Define a basic "Route"
// A route is a rule that tells the server what to do when it receives a request
// to a specific URL path. 
// - `app.get('/', ...)`: This handles GET requests to the root URL ('/').
// - `(req, res) => { ... }`: This is the function that runs when the route is matched.
//   - `req` is an object containing information about the incoming request.
//   - `res` is an object we use to send a response back to the browser.
// - `res.send(...)`: This method sends a simple text response.
app.get('/', (req, res) => {
  res.send('Hello from the backend server!');
});

// NEW: This is our API endpoint for projects.
// When a GET request is made to '/api/projects', this function runs.
app.get('/api/projects', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*, 
        COALESCE(
          json_agg(pi.image_url ORDER BY pi.position, pi.id) FILTER (WHERE pi.id IS NOT NULL),
          '[]'::json
        ) AS images
      FROM projects p
      LEFT JOIN project_images pi ON pi.project_id = p.id
      GROUP BY p.id
      ORDER BY p.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// NEW: This is our API endpoint for blogs.
// When a GET request is made to '/api/blogs', this function runs.
app.get('/api/blogs', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.*, 
        COALESCE(
          json_agg(bi.image_url ORDER BY bi.position, bi.id) FILTER (WHERE bi.id IS NOT NULL),
          '[]'::json
        ) AS images
      FROM blogs b
      LEFT JOIN blog_images bi ON bi.blog_id = b.id
      GROUP BY b.id
      ORDER BY b.date DESC NULLS LAST, b.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// API endpoint to CREATE a new project with image and optional video upload
app.post('/api/projects', requireAdmin, uploadLimiter, uploadProjectMedia.fields([
  { name: 'images', maxCount: 10 },
  { name: 'video', maxCount: 1 },
]), async (req, res) => {
  const { title, description, project_url } = req.body;
  const imageFiles = (req.files && req.files['images']) || [];
  const videoFile = req.files && req.files['video'] && req.files['video'][0];
  const MAX_IMAGES = 10;
  const safeImageFiles = imageFiles.slice(0, MAX_IMAGES);
  const baseUrl = process.env.API_SERVER_URL || `${req.protocol}://${req.get('host')}`;
  const imageUrls = safeImageFiles.map(f => `${baseUrl}/uploads/${f.filename}`);
  const firstImage = imageUrls[0] || null;
  let videoUrl = null;
  if (videoFile) {
    videoUrl = `${baseUrl}/uploads/videos/${videoFile.filename}`;
  } else if (req.body.video_url) {
    // Accept a pre-uploaded URL only if it points to our own /uploads/videos/ path
    const allowedPrefix = `${baseUrl}/uploads/videos/`;
    if (req.body.video_url.startsWith(allowedPrefix)) {
      videoUrl = req.body.video_url;
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertProject = await client.query(
      'INSERT INTO projects (title, description, image_url, project_url, video_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, firstImage, project_url, videoUrl]
    );
    const project = insertProject.rows[0];

    for (let i = 0; i < imageUrls.length; i++) {
      await client.query(
        'INSERT INTO project_images (project_id, image_url, position) VALUES ($1, $2, $3)',
        [project.id, imageUrls[i], i]
      );
    }
    await client.query('COMMIT');

    project.images = imageUrls;
    res.status(201).json(project);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});

// API endpoint to CREATE a new blog with an image upload
app.post('/api/blogs', requireAdmin, uploadLimiter, uploadImages.array('images'), async (req, res) => {
  const { title, content } = req.body;
  const files = req.files || [];
  const MAX_FILES = 50;
  const safeFiles = Array.isArray(files) ? files.slice(0, MAX_FILES) : [];
  const baseUrl = process.env.API_SERVER_URL || `${req.protocol}://${req.get('host')}`;
  const imageUrls = safeFiles.map(f => `${baseUrl}/uploads/${f.filename}`);
  const firstImage = imageUrls[0] || null;

  if (safeFiles.length > 0 && !process.env.API_SERVER_URL) {
    console.warn('API_SERVER_URL is not set. Falling back to request host for image URLs.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertBlog = await client.query(
      'INSERT INTO blogs (title, content, image_url, date) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [title, content, firstImage]
    );
    const blog = insertBlog.rows[0];

    for (let i = 0; i < imageUrls.length; i++) {
      await client.query(
        'INSERT INTO blog_images (blog_id, image_url, position) VALUES ($1, $2, $3)',
        [blog.id, imageUrls[i], i]
      );
    }
    await client.query('COMMIT');
    blog.images = imageUrls;
    res.status(201).json(blog);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  } finally {
    client.release();
  }
});



// API endpoint to get a single project by ID
app.get('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        p.*, 
        COALESCE(
          json_agg(pi.image_url ORDER BY pi.position, pi.id) FILTER (WHERE pi.id IS NOT NULL),
          '[]'::json
        ) AS images
      FROM projects p
      LEFT JOIN project_images pi ON pi.project_id = p.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Blog not found');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// API endpoint to get a single blog by ID
app.get('/api/blogs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT 
        b.*, 
        COALESCE(
          json_agg(bi.image_url ORDER BY bi.position, bi.id) FILTER (WHERE bi.id IS NOT NULL),
          '[]'::json
        ) AS images
      FROM blogs b
      LEFT JOIN blog_images bi ON bi.blog_id = b.id
      WHERE b.id = $1
      GROUP BY b.id
    `, [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Project not found');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// API endpoint to UPDATE an existing project
app.put('/api/projects/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, description, image_url, project_url } = req.body;
  
  try {
    // First, check if the project exists
    const checkProject = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (checkProject.rows.length === 0) {
      return res.status(404).send('Project not found');
    }

    // Update the project
    const result = await pool.query(
      `UPDATE projects 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           image_url = COALESCE($3, image_url),
           project_url = COALESCE($4, project_url)
       WHERE id = $5
       RETURNING *`,
      [title, description, image_url, project_url, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// API endpoint to UPDATE an existing blog
app.put('/api/blogs/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content, image_url} = req.body;
  
  try {
    // First, check if the blog exists
    const checkBlog = await pool.query('SELECT * FROM blogs WHERE id = $1', [id]);
    if (checkBlog.rows.length === 0) {
      return res.status(404).send('Blog not found');
    }

    // Update the blog
    const result = await pool.query(
      `UPDATE blogs 
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           image_url = COALESCE($3, image_url),
           date = NOW()
       WHERE id = $4
       RETURNING *`,
      [title, content, image_url, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// API endpoint to DELETE a project
app.delete('/api/projects/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const checkProject = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (checkProject.rows.length === 0) {
      return res.status(404).send('Project not found');
    }
    const project = checkProject.rows[0];

    await pool.query('DELETE FROM projects WHERE id = $1', [id]);

    // Clean up video file if present
    if (project.video_url) {
      try {
        const videoFilename = path.basename(new URL(project.video_url).pathname);
        const videoPath = path.join(videosDir, videoFilename);
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
      } catch (e) {
        console.warn('Failed to delete video file for project', e);
      }
    }

    res.status(204).end();
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// API endpoint to DELETE a blog
app.delete('/api/blogs/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // First, check if the blog exists
    const checkBlog = await pool.query('SELECT * FROM blogs WHERE id = $1', [id]);
    if (checkBlog.rows.length === 0) {
      return res.status(404).send('Blog not found');
    }

    const result = await pool.query (
      'DELETE FROM blogs WHERE id = $1 RETURNING *', [id]
    );

    res.status(204).end();
  } 
  catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// --- Analytics ---
const BOT_UA_RE = /bot|crawler|spider|scraper|slurp|facebookexternalhit|twitterbot|linkedinbot|embedly|pinterest|slackbot|whatsapp|googlebot|bingbot|yandexbot|baiduspider|duckduckbot|ia_archiver|semrushbot|ahrefsbot|mj12bot|dotbot|rogerbot|sogou|archive\.org_bot|python-requests|python-urllib|curl\/|wget\/|go-http-client|java\/|okhttp|axios\/|node-fetch|libwww|scrapy/i;

const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/analytics/view', analyticsLimiter, async (req, res) => {
  const { resource_type, resource_id } = req.body || {};
  if (!['project', 'blog', 'photo'].includes(resource_type)) {
    return res.status(400).json({ error: 'Invalid resource_type' });
  }
  const id = parseInt(resource_id, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid resource_id' });
  }
  const ua = req.headers['user-agent'] || '';
  const botDetected = !ua || BOT_UA_RE.test(ua);
  const ip = req.ip || req.headers['x-forwarded-for']?.split(',')[0].trim() || '';
  const ipHash = crypto.createHash('sha256').update(ip + 'pv_salt').digest('hex').slice(0, 16);
  const geo = geoip.lookup(ip);
  const country = geo?.country || null;
  const city = geo?.city || null;
  try {
    await pool.query(
      'INSERT INTO page_views (resource_type, resource_id, is_bot, ip_hash, user_agent, country, city) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [resource_type, id, botDetected, ipHash, ua.slice(0, 500), country, city]
    );
    res.json({ ok: true });
  } catch (err) {
    logger.error('Error recording page view', { err: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/analytics', requireAdmin, async (req, res) => {
  try {
    const [resourceResult, countryResult] = await Promise.all([
      pool.query(`
        SELECT
          pv.resource_type,
          pv.resource_id,
          COUNT(*) FILTER (WHERE NOT is_bot) AS human_views,
          COUNT(*) FILTER (WHERE is_bot) AS bot_views,
          COUNT(*) AS total_views,
          MAX(pv.viewed_at) AS last_viewed_at,
          CASE pv.resource_type
            WHEN 'project' THEN p.title
            WHEN 'blog' THEN b.title
            ELSE NULL
          END AS title
        FROM page_views pv
        LEFT JOIN projects p ON pv.resource_type = 'project' AND pv.resource_id = p.id
        LEFT JOIN blogs b ON pv.resource_type = 'blog' AND pv.resource_id = b.id
        GROUP BY pv.resource_type, pv.resource_id, p.title, b.title
        ORDER BY human_views DESC
      `),
      pool.query(`
        SELECT
          country,
          COUNT(*) FILTER (WHERE NOT is_bot) AS human_views,
          COUNT(*) AS total_views
        FROM page_views
        WHERE country IS NOT NULL
        GROUP BY country
        ORDER BY human_views DESC
      `),
    ]);
    res.json({ resources: resourceResult.rows, countries: countryResult.rows });
  } catch (err) {
    logger.error('Error fetching analytics', { err: err.message });
    res.status(500).json({ error: 'Server error' });
  }
});

// Endpoint to receive client-side logs
app.post('/api/client-logs', (req, res) => {
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid log payload' });
  }

  const { level = 'info', message = '', stack = '' } = req.body;
  const meta = {
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    ua: req.headers['user-agent'] || '',
  };

  logger.log({ level, message, stack, ...meta });
  res.status(204).end();
});

// Multer/validation error handler (must be after routes)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err && err.message === 'Only JPEG images are allowed.') {
    return res.status(400).json({ error: err.message });
  }
  if (err && err.message === 'Only JPEG, RAW, or HEIC images are allowed.') {
    return res.status(400).json({ error: err.message });
  }
  if (err && err.message === 'Only MP4, WebM, MOV, AVI, or MKV video files are allowed.') {
    return res.status(400).json({ error: err.message });
  }
  if (err && (err.message === 'Invalid uploadId' || err.message === 'Invalid chunkIndex')) {
    return res.status(400).json({ error: err.message });
  }
  if (err && err.message === 'Only PDF files are allowed for the resume.') {
    return res.status(400).json({ error: err.message });
  }
  return next(err);
});

// 5. Start the Server
// This command tells our app to start listening for requests on the port we defined.
// The function `() => { ... }` is a callback that runs once the server is ready.
// We log a message to the console so we know everything is working.
app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
  // Initialize the database when the server starts
  initDb();
});
