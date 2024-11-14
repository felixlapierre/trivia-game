// Import necessary modules
const express = require('express');
const path = require('path');

// Initialize the Express app
const app = express();

// Serve static files from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Basic API route for testing
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

// Set the port for the server
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
