// Import necessary modules
const express = require('express');
const jwt = require('jsonwebtoken')
const path = require('path');
const MongoClient = require('mongodb').MongoClient

// Environment variables
const dotenv = require('dotenv')
dotenv.config()

// Initialize the Express app
const app = express();

// Connect to MongoDB
const uri = "mongodb://localhost:27017/trivia"
const client = new MongoClient(uri)

// Serve static files from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.json())

// API routes
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, World!' });
});

// Login
app.post('/api/login', (req, res) => {
  var username = req.body.username
  var password = req.body.password
  console.log("Login attempt by user " + username)

  const database = client.db('trivia')
  const users = database.collection('users')

  const query = { username: username}
  users.findOne(query)
  .catch((err) => {
    console.log(err)
    console.log("User not found for username " + username)
    res.sendStatus(400)
  }).then((user) => {
    if (user == null) {
      console.log("User not found: " + username)
      res.sendStatus(400)
    }
    else if (user.password != password) {
      console.log("Bad password from user " + username)
      res.sendStatus(400)
    } else {
      const token = generateAccessToken({
        "username": user.username,
        "name": user.name,
        "id": user.id,
        "team": user.team
      })
      res.json(token)
      console.log("Successful login as " + username)
    }
  }).catch((err) => {
    console.log(err)
    res.sendStatus(500)
  })
})

// Fetch basic data

app.get('/api/home', authenticateToken, (req, res) => {
  var username = req.user.username

  const database = client.db('trivia')
  const users = database.collection('users')

  users.findOne({username}).then((user) => {
    res.json({
      "name": user.name,
      "team": user.team,
      "score": user.score
    })
  }).catch((err) => {
    console.log(err)
    res.sendStatus(500)
  })
})

// Submit answer to a question
app.post('/api/submit', authenticateToken, async (req, res) => {
  var user = req.user
  var username = user.username

  const database = client.db('trivia')
  const answers = database.collection('answers')
  const questions = database.collection('questions')
  const users = database.collection('users')

  var idx = req.body.answer.indexOf('-')
  var question_nb = Number.parseInt(req.body.answer.substring(0, idx))
  var answer_text = req.body.answer.substring(idx + 1)

  // Check if the user is locked out
  var user = await users.findOne({username})

  if (user.lockout > Date.now()) {
    console.log(`[User=${username}] Submitted answer while locked out`)
    res.sendStatus(429)
    return
  }

  // Check if the answer is correct
  var question = await questions.findOne({"id": question_nb})

  if (!question) {
    console.log(`[User=${username}] Submitted answer to non-existent question nb ${question_nb}`)
    res.sendStatus(400)
    return
  }
  var correct = question.answer == answer_text

  // Check for existing answers to the question
  var query = {
    "team": user.team,
    "question": question_nb
  }
  var answer = await answers.findOne(query)

  if (!answer) {
    // No answer yet
    if(!correct) {
      await users.updateOne({username}, {"$set": {"lockout": Date.now() + 15 * 1000}})
      console.log(`[User=${username}] Submitted incorrect answer to question ${question_nb}: ${answer_text}`)
      res.json({
        "result": "incorrect",
        "score": 0
      })
    } else {
      // check if other team answered
      var other_team_answer = await answers.findOne({"question": question_nb})
      var first = other_team_answer == null
      var score = first ? 150 : 100

      console.log(`[User=${username}] Submitted correct answer for question ${question_nb}: ${answer_text} [score=${score}]`)

      await save_answer(user, {
        "question": question_nb,
        "user": user.name,
        "user_id": user.id,
        "team": user.team,
        "score": score
      })

      res.json({
        "result": "correct",
        "first": first,
        "score": score
      })
    }
  } else {
    if (!correct) {
      await users.updateOne({username}, {"$set": {"lockout": Date.now() + 15 * 1000}})
    }
    console.log(`[User=${username}] Submitted repeat answer for question ${question_nb}: ${answer_text}. Answer is ${correct ? "correct" : "incorrect"}`)
    res.json({
      "result": correct ? "correct" : "incorrect",
      "first": false,
      "already_answered_by": answer.user,
      "score": 0
    })
  }
})

app.post('/api/answers', authenticateToken, (req, res) => {
  var user = req.user
  const database = client.db('trivia')
  const answers = database.collection('answers')
  var min = req.body.min
  var max = req.body.max

  var query = {
    "team": user.team,
    "question": {
      "$gte": min,
      "$lte": max
    }
  }
  answers.find(query).toArray().then((result) => {
    res.json(result.map((res) => {
      return {
        "question": res.question,
        "user": res.user,
        "score": res.score
      }
    }))
  })
})

app.get("/api/leaderboard", authenticateToken, (req, res) => {
  const database = client.db('trivia')
  const answers = database.collection('answers')
  answers.aggregate([
    {
      '$facet': {
        'teamScores': [
          {
            '$group': {
              '_id': '$team', 
              'totalScore': {
                '$sum': '$score'
              }, 
              'totalQuestions': {
                '$sum': 1
              }
            }
          }, {
            '$sort': {
              'totalScore': -1
            }
          }, {
            '$project': {
              '_id': 0, 
              'team': '$_id', 
              'totalScore': 1, 
              'totalQuestions': 1
            }
          }
        ], 
        'userScores': [
          {
            '$group': {
              '_id': '$user', 
              'totalScore': {
                '$sum': '$score'
              }, 
              'team': {
                '$first': '$team'
              }, 
              'totalQuestions': {
                '$sum': 1
              }
            }
          }, {
            '$sort': {
              'totalScore': -1
            }
          }, {
            '$project': {
              '_id': 0, 
              'user': '$_id', 
              'totalScore': 1, 
              'team': 1, 
              'totalQuestions': 1
            }
          }
        ]
      }
    }
  ]).toArray().then((result) => {
    res.json(result)
  })
})

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

function save_answer(user, answer) {
  // Save answer in DB and update score of user
  return new Promise((resolve, reject) => {
    const database = client.db('trivia')
    const answers = database.collection('answers')
    const users = database.collection('users')
  
    answers.insertOne(answer).then(() => {
      users.findOne({username: user.username}).then((user) => {
        users.updateOne({username: user.username}, {
          "$set": {"score": user.score + answer.score}
        }).then(() => {
          resolve()
        })
      })
    })  
  })
}