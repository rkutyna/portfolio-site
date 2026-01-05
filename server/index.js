// 1. Import Express
// This line uses Node.js's `require` function to import the Express library
// that we just installed. We need this to use Express's features.
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken'); // NEW: JWT for admin auth
const logger = require('./logger'); // centralized winston logger
const morgan = require('morgan');
const { exiftool } = require('exiftool-vendored');
const sharp = require('sharp');

const app = express();
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://rogerkutyna.com',
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.API_SERVER_URL,
  ],
  // credentials: true // Uncomment if you ever use cookies for auth
}));
app.use(express.json()); // Add this middleware to parse JSON bodies

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
app.post('/api/admin/login', (req, res) => {
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
  const allowedOrigins = [
    'http://localhost:3000',
    'http://rogerkutyna.com',
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.API_SERVER_URL,
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Set up multer for file storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.resolve(__dirname, 'uploads');
    // Ensure the directory exists before saving the file
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Create a unique filename to avoid overwrites
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Initialize multer using the above storage BEFORE defining routes that use `upload`
const upload = multer({ storage: storage });

// --- Photos Endpoints ---
// List photos
app.get('/api/photos', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM photos ORDER BY created_at DESC NULLS LAST, id DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// Create photo (supports RAW/HEIC -> JPEG conversion and deletes originals)
app.post('/api/photos', requireAdmin, upload.single('photo'), async (req, res) => {
  const { title = null, caption = null } = req.body || {};
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Missing photo file' });

  const baseUrl = process.env.API_SERVER_URL || `${req.protocol}://${req.get('host')}`;
  const uploadsDir = path.resolve(__dirname, 'uploads');

  let imageUrl = null;
  let rawUrl = null;
  const originalExt = path.extname(file.originalname || '').toLowerCase();
  const isRaw = ['.nef', '.dng', '.cr2', '.cr3', '.arw', '.rw2', '.orf', '.raf', '.srw'].includes(originalExt);
  const isHeic = originalExt === '.heic' || originalExt === '.heif' || (file.mimetype && (file.mimetype.includes('heic') || file.mimetype.includes('heif')));

  try {
    if (isRaw) {
      // Convert RAW to JPEG preview via exiftool-vendored, then delete original
      const jpegName = `photo-${Date.now()}.jpg`;
      const jpegPath = path.join(uploadsDir, jpegName);
      await exiftool.extractJpgFromRaw(file.path, jpegPath);
      imageUrl = `${baseUrl}/uploads/${jpegName}`;
      try { fs.unlinkSync(file.path); } catch (e) { console.warn('Failed to delete original raw file', e); }
      rawUrl = null;
    } else if (isHeic) {
      // Convert HEIC/HEIF to JPEG via sharp, then delete original
      const jpegName = `photo-${Date.now()}.jpg`;
      const jpegPath = path.join(uploadsDir, jpegName);
      await sharp(file.path).rotate().jpeg({ quality: 90 }).toFile(jpegPath);
      imageUrl = `${baseUrl}/uploads/${jpegName}`;
      try { fs.unlinkSync(file.path); } catch (e) { console.warn('Failed to delete original HEIC/HEIF file', e); }
      rawUrl = null;
    } else {
      // Use the uploaded image as-is
      imageUrl = `${baseUrl}/uploads/${file.filename}`;
    }

    const result = await pool.query(
      'INSERT INTO photos (title, caption, image_url, raw_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, caption, imageUrl, rawUrl]
    );
    res.status(201).json(result.rows[0]);
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
    res.json(result.rows[0]);
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

// Delete photo (and attempt to delete files)
app.delete('/api/photos/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const check = await pool.query('SELECT * FROM photos WHERE id = $1', [id]);
    if (check.rows.length === 0) return res.status(404).send('Photo not found');
    const photo = check.rows[0];

    const uploadsDir = path.resolve(__dirname, 'uploads');
    const deleteIfExists = (fileUrl) => {
      try {
        if (!fileUrl) return;
        const filename = path.basename(new URL(fileUrl).pathname);
        const filePath = path.join(uploadsDir, filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch (e) {
        console.warn('Failed to delete file for photo', e);
      }
    };

    await pool.query('DELETE FROM photos WHERE id = $1', [id]);
    deleteIfExists(photo.image_url);
    deleteIfExists(photo.raw_url);
    res.status(204).end();
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// Graceful shutdown of exiftool child process
const stopExiftool = async () => {
  try {
    await exiftool.end();
  } catch (e) {
    logger.warn('Failed to end exiftool cleanly', e);
  }
};
process.once('SIGINT', () => { stopExiftool().finally(() => process.exit(0)); });
process.once('SIGTERM', () => { stopExiftool().finally(() => process.exit(0)); });

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
        project_url TEXT
      );
    `);

    const res = await pool.query('SELECT * FROM projects');
    if (res.rowCount === 0) {
      await pool.query(`
        INSERT INTO projects (title, description, image_url, project_url) VALUES
        ('OffCampus Clark', 'Apartment Listing website built for the Clark University Department of Residential Life and Housing', 'https://placehold.co/600x400/5A67D8/EBF4FF?text=OffCampus+Clark', 'https://github.com/rkutyna'),
        ('AI Research Project', 'A project exploring machine learning models for natural language understanding.', 'https://placehold.co/600x400/38B2AC/E6FFFA?text=AI+Research', 'https://github.com/rkutyna'),
        ('Personal Blog Engine', 'A lightweight, custom-built blog platform using Node.js and Markdown.', 'https://placehold.co/600x400/ED8936/FFF5EB?text=Blog+Engine', 'https://github.com/rkutyna');
      `);
      console.log('Database seeded with initial project data.');
    }


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
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    const res2 = await pool.query('SELECT * FROM blogs');
    if (res2.rowCount === 0) {
      var currentTime = new Date();
      await pool.query(`
        INSERT INTO blogs (title, content, image_url, date) VALUES
        ('OffCampus Clark', 'Apartment Listing website built for the Clark University Department of Residential Life and Housing', 'https://placehold.co/600x400/5A67D8/EBF4FF?text=OffCampus+Clark', NOW()),
        ('AI Research Project', 'A project exploring machine learning models for natural language understanding.', 'https://placehold.co/600x400/38B2AC/E6FFFA?text=AI+Research', NOW()),
        ('Personal Blog Engine', 'A lightweight, custom-built blog platform using Node.js and Markdown.', 'https://placehold.co/600x400/ED8936/FFF5EB?text=Blog+Engine', NOW());
      `);
      console.log('Database seeded with initial blog data.');
    }
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

// API endpoint to CREATE a new project with an image upload
app.post('/api/projects', requireAdmin, upload.array('images'), async (req, res) => {
  const { title, description, project_url } = req.body;
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
    const insertProject = await client.query(
      'INSERT INTO projects (title, description, image_url, project_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, firstImage, project_url]
    );
    const project = insertProject.rows[0];

    // Insert images
    for (let i = 0; i < imageUrls.length; i++) {
      await client.query(
        'INSERT INTO project_images (project_id, image_url, position) VALUES ($1, $2, $3)',
        [project.id, imageUrls[i], i]
      );
    }
    await client.query('COMMIT');

    // Return with images array
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
  const MAX_FILES = 50;
  const safeFiles = Array.isArray(files) ? files.slice(0, MAX_FILES) : [];
app.post('/api/blogs', requireAdmin, upload.array('images'), async (req, res) => {
  const { title, content } = req.body;
  const files = req.files || [];
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
    // First, check if the project exists
    const checkProject = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (checkProject.rows.length === 0) {
      return res.status(404).send('Project not found');
    }

    const result = await pool.query (
      'DELETE FROM projects WHERE id = $1 RETURNING *', [id]
    );

    res.status(204).end();
  } 
  catch (err) {
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

// 5. Start the Server
// This command tells our app to start listening for requests on the port we defined.
// The function `() => { ... }` is a callback that runs once the server is ready.
// We log a message to the console so we know everything is working.
app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
  // Initialize the database when the server starts
  initDb();
});
