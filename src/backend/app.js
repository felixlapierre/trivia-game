// Import necessary modules
const express = require('express');
const jwt = require('jsonwebtoken')
const path = require('path');
const mongo = require('mongodb')

// Environment variables
const dotenv = require('dotenv')
dotenv.config()
var secret_token = process.env.TOKEN_SECRET

// Initialize the Express app
const app = express();

// Connect to MongoDB
const url = "mongodb://localhost:27017/trivia"
var db = null
mongo.MongoClient.connect(url, function(err, database) {
  if (err) throw err;
  console.log("Database created")
  db = database
})

// Serve static files from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// API routes
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

// Login
app.post('/api/login', (req, res) => {
  var username = req.body.username
  var password = req.body.password
  db.collection("users").findOne({username}, function(err, result) {
    if (err) {
      res.sendStatus(400)
    }
    else if (result.password != password) {
      res.sendStatus(400)
    }
    else {
      const token = generateAccessToken({
        "username": result.username,
        "team": result.team
    })
      res.json(token)
    }
  })
})

// Fetch basic data

app.get('/api/home', authenticateToken, (req, res) => {
  var username = req.user
  db.collection("users").findOne({username}, function(err, result) {
    if (err) {
      res.sendStatus(500)
    } else {
      res.json({
        "name": result.name,
        "team": result.team,
        "score": result.score
      })
    }
  })
})

// Submit answer to a question

// Set the port for the server
const PORT = process.env.PORT || 3000;

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.TOKEN_SECRET, { expiresIn: '9000s'})
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader?.split(' ')[1] // because it should be Bearer <jwt>

  if (token == null) return res.sendStatus(401)
  
  jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    if (err) {
      console.log(err)
      return res.sendStatus(403)
    }
    req.user = user
    next()
  })
}