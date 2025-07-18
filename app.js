import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { handleChatbotRequest } from './controllers/chatbotController.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001; 

app.use(cors()); // To handle CORS errors

// ...existing code...

app.get("/", (req, res) => {
  res.send("Successfully deployed");
});

// API Route to Handle OpenAI Chatbot Request
app.post('/api/chat', express.json(), handleChatbotRequest);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
