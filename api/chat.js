// api/chat.js

const { handleChatbotRequest } = require("../controllers/chatbotController");
require("dotenv").config(); // optional, used only for local dev

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await handleChatbotRequest(req, res);
  } catch (err) {
    console.error("API Chat Handler Error:", err.message);
    res.status(500).json({ botReply: "Internal Server Error" });
  }
};
