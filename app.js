import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import waWebhook from './controllers/waWebhook.js';
import { handleChatbotRequest } from './controllers/chatbotController.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => res.send('Successfully deployed'));
app.post('/api/chat', handleChatbotRequest);
app.get('/api/webhook', waWebhook.verify);
app.post('/api/webhook', waWebhook.receive);



app.listen(process.env.PORT || 5000, () => {
  console.log(`Server on :${process.env.PORT || 5000}`);
});
