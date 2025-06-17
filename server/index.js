// 1. Import Express
// This line uses Node.js's `require` function to import the Express library
// that we just installed. We need this to use Express's features.
const express = require('express');
// 1. Import the cors middleware
const cors = require('cors');
// Import the pg library for PostgreSQL database connection
const { Pool } = require('pg');

const app = express();
app.use(cors());

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
const initializeDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT
      );
    `);

    const res = await pool.query('SELECT * FROM projects');
    if (res.rowCount === 0) {
      await pool.query(`
        INSERT INTO projects (title, description) VALUES
        ('OffCampus Clark', 'Apartment Listing website built for the Clark University Department of Residential Life and Housing'),
        ('AI Research Project', 'A project exploring machine learning models for natural language understanding.'),
        ('Personal Blog Engine', 'A lightweight, custom-built blog platform using Node.js and Markdown.');
      `);
      console.log('Database seeded with initial data.');
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

// NEW: This is our API endpoint for a SINGLE project.
// The `:id` part is a "URL parameter". Express will capture whatever
// value is in that part of the URL and put it in `req.params`.
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

// 5. Start the Server
// This command tells our app to start listening for requests on the port we defined.
// The function `() => { ... }` is a callback that runs once the server is ready.
// We log a message to the console so we know everything is working.
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  // Initialize the database when the server starts
  initializeDatabase();
});
