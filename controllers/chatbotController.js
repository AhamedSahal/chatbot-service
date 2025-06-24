const { getHolidayReply } = require("../services/holidayServices");
const { getLeaveBalanceReply } = require("../services/leaveServices");
const { getOpenAIResponse } = require("../services/openaiServices");


async function handleChatbotRequest(req, res) {
  const { messages, employeeId, locationId } = req.body;
  const authHeader = req.headers.authorization;
  const companyId = req.headers.companyid;

  if (!messages || !employeeId || !authHeader || !companyId) {
    return res.status(400).json({ error: "Missing required parameters" });
  }
  const userMessage = messages[messages.length - 1].content.toLowerCase();

  try {
    if (userMessage.includes("leave balance")) {
      const botReply = await getLeaveBalanceReply(userMessage, employeeId, authHeader, companyId);
      return res.json({ botReply });
    } else if (userMessage.includes("holiday")) {
      
      const botReply = await getHolidayReply(userMessage, locationId, authHeader, companyId);
      return res.json({ botReply });
    } else {
      const botReply = await getOpenAIResponse(userMessage);
      return res.json({ botReply });
    }
  } catch (error) {
    console.error("Chatbot error:", error.message);
    return res.status(500).json({ botReply: "Something went wrong. Please try again later." });
  }
}

module.exports = {
  handleChatbotRequest,
};