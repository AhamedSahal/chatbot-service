import { getHolidayReply } from "../services/holidayServices.js";
import { getLeaveBalanceReply } from "../services/leaveServices.js";
import { getOpenAIResponse } from "../services/openaiServices.js";
import { getUpcomingAnnouncementReply } from "../services/announcement.js";
import { getMonthlyAttendanceReply } from "../services/monthlyAttendance.js";
import { getUpcomingCelebrationReply } from "../services/upcomingCelebration.js";
import { getUpcomingDocsExpiryReply } from "../services/upcomingDocsExpiry.js";
import { getSalaryInfoReply } from "../services/salaryInfo.js";
import { getBankInfoReply } from "../services/userBankInfo.js";
import { getProfileInfoReply } from "../services/userProfileInfo.js";
import { getSpecificFieldReply } from "../services/profileSpecificFieldReplay.js";
import { getEmployeesInfo } from "../CompanyAdminServices/employeesInfo.js";
import { getPolicyDocumentDownload } from "../services/documentDownload.js";
import { getPolicyInfoDocument } from "../services/DocumentProcess/index.js";
import { getClockInOutReply } from "../services/clockInOutAction.js";

async function handleChatbotRequest(req, res) {
  const { messages, locationId, employeeId } = req.body;
  const authHeader = req.headers.authorization;
  const companyId = req.headers.companyid;
  const userType = req.headers.usertype;

  if (!messages || !employeeId || !authHeader || !companyId || !userType) {
    return res.status(400).json({ error: "Missing required parameters" });
  }



  const userMessage = messages[messages.length - 1].content.toLowerCase();
  
  
  const isFullProfileRequest = [
    "profile", "personal info", "company info", "my info", "employee info", "personal details"
  ].some(k => userMessage.includes(k));

  const fieldKeywordMap = {
    department: ["department", "team"],
    division: ["division"],
    grades: ["grade"],
    jobTitle: ["job title", "designation", "role"],
    function: ["function"],
    section: ["section", "shift"],
    branch: ["branch", "location", "workplace"],
    doj: ["date of joining", "joining date", "doj"],
    nationality: ["nationality"],
    gender: ["gender"],
    maritalStatus: ["marital status"],
    reportingManager: ["manager", "reporting manager"],
    totalExperience: ["experience", "total experience"],
    employeeLanguages: ["language", "languages known"],
    email: ["email"],
    phone: ["phone", "contact number"],
    employeeId: ["employee id", "emp id"]
  };

  const intentKeywords = {
    downloadPolicy: [["download", "policy"], ["policy", "document"], ["send", "policy"]],
    PolicyInfo: [["policy", "info"], ["hr", "policy"], ["policies", "info"], ["policy", "details"], ["policy", "list"], ["hr", "policies"]],
    leaveBalance: [["leave", "balance"]],
    attendance: [["attendance"]],
    holiday: [["holiday"]],
    announcement: [["announcement"]],
    celebration: [["celebration"]],
    expiry: [["expiry"], ["expiring"]],
    salary: [["salary"], ["allowance"]],
    bank: [["bank"], ["account"]],
    clockInOut: [["clock", "in"], ["clock", "out"], ["check", "in"], ["check", "out"]]
  };

  function detectIntent(message) {
    for (const [intent, patterns] of Object.entries(intentKeywords)) {
      for (const pattern of patterns) {
        if (pattern.every(word => message.includes(word))) {
          return intent;
        }
      }
    }
    return null;
  }

  try {
    const detectedIntent = detectIntent(userMessage);

    switch (detectedIntent) {
      case "downloadPolicy": {
        const botReply = await getPolicyDocumentDownload(userMessage, employeeId, authHeader, companyId);
        return res.json({ botReply });
      }
      case "leaveBalance": {
        const botReply = await getLeaveBalanceReply(userMessage, employeeId, authHeader, companyId);
        return res.json({ botReply });
      }
      case "PolicyInfo": {
        const botReply = await getPolicyInfoDocument(userMessage, employeeId, authHeader, companyId);
        return res.json({ botReply });
      }
      case "attendance": {
        const botReply = await getMonthlyAttendanceReply(userMessage, locationId, authHeader, companyId);
        return res.json({ botReply });
      }
      case "holiday": {
        const botReply = await getHolidayReply(userMessage, locationId, authHeader, companyId);
        return res.json({ botReply });
      }
      case "announcement": {
        const botReply = await getUpcomingAnnouncementReply(userMessage, locationId, authHeader, companyId);
        return res.json({ botReply });
      }
      case "celebration": {
        const botReply = await getUpcomingCelebrationReply(userMessage, locationId, authHeader, companyId);
        return res.json({ botReply });
      }
      case "expiry": {
        const botReply = await getUpcomingDocsExpiryReply(userMessage, locationId, authHeader, companyId);
        return res.json({ botReply });
      }
      case "salary": {
        const botReply = await getSalaryInfoReply(userMessage, locationId, authHeader, companyId, employeeId);
        return res.json({ botReply });
      }
      case "bank": {
        const botReply = await getBankInfoReply(employeeId, authHeader, companyId);
        return res.json({ botReply });
      }
      case "clockInOut": {
        console.log("Fetching clock in/out info for user message **************:", userMessage);
        const botReply = await getClockInOutReply(userMessage, employeeId, authHeader, companyId);
        return res.json({ botReply });
      }
    }

    for (const [field, keywords] of Object.entries(fieldKeywordMap)) {
      if (keywords.some(k => userMessage.includes(k))) {
        const botReply = await getSpecificFieldReply(field, employeeId, authHeader, companyId);
        return res.json({ botReply });
      }
    }

    if (isFullProfileRequest) {
      const botReply = await getProfileInfoReply(employeeId, authHeader, companyId);
      return res.json({ botReply });
    }

    const botReply = await getOpenAIResponse(userMessage);
    return res.json({ botReply });
  } catch (error) {
    console.error("Chatbot error:", error.message);
    return res.status(500).json({ botReply: "Something went wrong. Please try again later." });
  }
}

export { handleChatbotRequest };
