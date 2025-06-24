require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001; // Import port from .env file

app.use(cors()); // To handle CORS errors
app.use(express.json()); // To parse JSON bodies

// Update to use the new db.js file
const db = require('./db');

const { handleChatbotRequest } = require('./controllers/chatbotController');



// API Route to Handle OpenAI Chatbot Request
app.post('/api/chat', handleChatbotRequest);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
