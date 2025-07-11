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

const upload = multer({ storage: storage });

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
        date DATE
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
    const result = await pool.query('SELECT * FROM projects ORDER BY id ASC');
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
    const result = await pool.query('SELECT * FROM blogs ORDER BY date');
    res.json(result.rows);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// API endpoint to CREATE a new project with an image upload
app.post('/api/projects', requireAdmin, upload.single('image'), async (req, res) => {
  const { title, description, project_url } = req.body;
  // Construct the full URL for the image
  const image_url = req.file 
    ? `${process.env.API_SERVER_URL}/uploads/${req.file.filename}` 
    : null;

  if (req.file && !process.env.API_SERVER_URL) {
    console.error('ERROR: API_SERVER_URL environment variable is not set. Image URLs will be incorrect.');
  }

  try {
    const result = await pool.query(
      'INSERT INTO projects (title, description, image_url, project_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, description, image_url, project_url]
    );
    res.status(201).json(result.rows[0]); // Return the newly created project
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// API endpoint to CREATE a new project with an image upload
app.post('/api/blogs', requireAdmin, upload.single('image'), async (req, res) => {
  const { title, content} = req.body;
  // Construct the full URL for the image
  const image_url = req.file 
    ? `${process.env.API_SERVER_URL}/uploads/${req.file.filename}` 
    : null;

  if (req.file && !process.env.API_SERVER_URL) {
    console.error('ERROR: API_SERVER_URL environment variable is not set. Image URLs will be incorrect.');
  }

  try {
    const result = await pool.query(
      'INSERT INTO blogs (title, content, image_url, date) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [title, content, image_url]
    );
    res.status(201).json(result.rows[0]); // Return the newly created project
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});



// API endpoint to get a single project by ID
app.get('/api/projects/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Project not found');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).send('Server Error');
  }
});

// API endpoint to get a single project by ID
app.get('/api/blogs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM blogs WHERE id = $1', [id]);
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

// API endpoint to UPDATE an existing project
app.put('/api/blogs/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, content, image_url} = req.body;
  
  try {
    // First, check if the project exists
    const checkProject = await pool.query('SELECT * FROM blogs WHERE id = $1', [id]);
    if (checkProject.rows.length === 0) {
      return res.status(404).send('Project not found');
    }

    // Update the project
    const result = await pool.query(
      `UPDATE projects 
       SET title = COALESCE($1, title),
           content = COALESCE($2, content),
           image_url = COALESCE($3, image_url),
           date = NOW()
       WHERE id = $5
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

// API endpoint to DELETE a project
app.delete('/api/blogs/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // First, check if the project exists
    const checkProject = await pool.query('SELECT * FROM blogs WHERE id = $1', [id]);
    if (checkProject.rows.length === 0) {
      return res.status(404).send('Project not found');
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

// 5. Start the Server
// This command tells our app to start listening for requests on the port we defined.
// The function `() => { ... }` is a callback that runs once the server is ready.
// We log a message to the console so we know everything is working.
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  // Initialize the database when the server starts
  initDb();
});
