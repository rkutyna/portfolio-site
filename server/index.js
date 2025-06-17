// 1. Import Express
// This line uses Node.js's `require` function to import the Express library
// that we just installed. We need this to use Express's features.
const express = require('express');
// 1. Import the cors middleware
const cors = require('cors');
const app = express();

// 2. Tell the app to use the cors middleware
// This will allow requests from any origin. For production, you might want to configure it more securely.
app.use(cors());

// 2. Create an Express App
// This line creates an instance of the Express application. The `app` variable
// is now our main tool for building the server.

// 3. Define a Port
// This will be the network port our server listens on. We choose 3001 to avoid
// conflict with our frontend React app, which is running on port 3000.
const port = 3001;

// This is our in-memory "database".
// In a real application, this would come from a database like PostgreSQL.
const projects = [
  { id: 1, title: 'OffCampus Clark', description: 'Apartment Listing website built for the Clark University Department of Residential Life and Housing' },
  { id: 2, title: 'AI Research Project', description: 'A project exploring machine learning models for natural language understanding.' },
  { id: 3, title: 'Personal Blog Engine', description: 'A lightweight, custom-built blog platform using Node.js and Markdown.' },
];

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
app.get('/api/projects', (req, res) => {
  // `res.json()` sends the `projects` array back to the client as JSON.
  res.json(projects);
});

// NEW: This is our API endpoint for a SINGLE project.
// The `:id` part is a "URL parameter". Express will capture whatever
// value is in that part of the URL and put it in `req.params`.
app.get('/api/projects/:id', (req, res) => {
  // We get the ID from the URL. It's a string, so we convert it to a number.
  const projectId = parseInt(req.params.id, 10);
  // We use the .find() method to look for a project with the matching ID.
  const project = projects.find(p => p.id === projectId);

  if (project) {
    // If we find the project, send it back as JSON.
    res.json(project);
  } else {
    // If no project with that ID is found, send a 404 Not Found error.
    res.status(404).send('Project not found');
  }
});

// 5. Start the Server
// This command tells our app to start listening for requests on the port we defined.
// The function `() => { ... }` is a callback that runs once the server is ready.
// We log a message to the console so we know everything is working.
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
