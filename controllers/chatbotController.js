const { getHolidayReply } = require("../services/holidayServices");
const { getLeaveBalanceReply } = require("../services/leaveServices");
const { getOpenAIResponse } = require("../services/openaiServices");
const { getUpcomingAnnouncementReply } = require("../services/announcement");
const { getMonthlyAttendanceReply } = require("../services/monthlyAttendance");
const { getUpcomingCelebrationReply } = require("../services/upcomingCelebration");
const { getUpcomingDocsExpiryReply } = require("../services/upcomingDocsExpiry");
const { getSalaryInfoReply } = require("../services/salaryInfo");
const { getBankInfoReply } = require("../services/userBankInfo");
const { getProfileInfoReply } = require("../services/userProfileInfo");


async function handleChatbotRequest(req, res) {
  const { messages, employeeId, locationId } = req.body;
  const authHeader = req.headers.authorization;
  const companyId = req.headers.companyid;

  if (!messages || !employeeId || !authHeader || !companyId) {
    return res.status(400).json({ error: "Missing required parameters" });
  }
  const userMessage = messages[messages.length - 1].content.toLowerCase();
  try {
    if (userMessage.includes("leave")) {
      const botReply = await getLeaveBalanceReply(userMessage, employeeId, authHeader, companyId);
      return res.json({ botReply });
    } else if (userMessage.includes("holiday")) {

      const botReply = await getHolidayReply(userMessage, locationId, authHeader, companyId);
      return res.json({ botReply });
    } else if (userMessage.includes("announcement")) {
      const botReply = await getUpcomingAnnouncementReply(userMessage, locationId, authHeader, companyId);
      return res.json({ botReply });
    } else if (userMessage.includes("attendance")) {
      const botReply = await getMonthlyAttendanceReply(userMessage, locationId, authHeader, companyId);
      return res.json({ botReply });
    } else if (userMessage.includes("celebration")) {
      const botReply = await getUpcomingCelebrationReply(userMessage, locationId, authHeader, companyId);
      return res.json({ botReply });
    } else if (userMessage.includes("expiry")) {
      const botReply = await getUpcomingDocsExpiryReply(userMessage, locationId, authHeader, companyId);
      return res.json({ botReply });
    } else if (userMessage.includes("salary") || userMessage.includes("allowance")) {
      const botReply = await getSalaryInfoReply(userMessage, locationId, authHeader, companyId, employeeId);
      return res.json({ botReply });
    } else if (userMessage.includes("profile") || userMessage.includes("company info") || userMessage.includes("personal info")) {
      console.log("Employee ID in profile info request:", employeeId);
      const botReply = await getProfileInfoReply(employeeId, authHeader, companyId);
      return res.json({ botReply });
    } else if (userMessage.includes("bank") || userMessage.includes("account")) {
      const botReply = await getBankInfoReply(employeeId, authHeader, companyId);
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