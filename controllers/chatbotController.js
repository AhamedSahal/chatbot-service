import { getHolidayReply } from "../services/holidayServices.js";
import { getLeaveBalanceReply } from "../services/leaveServices.js";
import { getOpenAIResponse } from "../services/OpenAIServices/openaiServices.js";
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
import { getRegularizationReply } from "../services/Regularization/regularization.js";
import { getOpenAIIntent } from "./intendController.js";
import { ApplyAttendanceRegularization } from "../services/Regularization/applyRegularization.js";

let userhistory = [];

async function handleChatbotRequest(req, res) {
  const { messages, locationId, employeeId } = req.body;
  const authHeader = req.headers.authorization;
  const companyId = req.headers.companyid;
  const userType = req.headers.usertype;

  if (!messages || !employeeId || !authHeader || !companyId || !userType) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  const userMessage = messages[messages.length - 1].content.toLowerCase();

  // Update userhistory with the last six messages
  userhistory.push(userMessage);
 

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
console.log("User message****** for intent detection:", userhistory);
  try {
    console.log("handleChatbotRequest called with userMessage:", userMessage);
    const detectedIntent = (await getOpenAIIntent(userMessage , userhistory)).toLowerCase().replace("intent: ", "");
    console.log("Detected OpenAI Intent:", detectedIntent);
    switch (detectedIntent) {
      case "leave_balance":
        return res.json({ botReply: await getLeaveBalanceReply(userMessage, employeeId, authHeader, companyId) });

      case "leave_application":
        return res.json({ botReply: await applyLeaveHandler(userMessage, employeeId, authHeader, companyId) });

      case "leave_history":
        return res.json({ botReply: await getLeaveReportReply(userMessage, employeeId, authHeader, companyId) });

      case "attendance_summary":
        return res.json({ botReply: await getMonthlyAttendanceReply(userMessage, locationId, authHeader, companyId) });

      case "attendance_regularization_status":
        console.log("Handling regularization request for user message:", userMessage);
        return res.json({ botReply: await getRegularizationReply(userMessage, employeeId, authHeader, companyId) });

      case "apply_attendance_regularization":
        console.log("Handling attendance regularization request for user message:", userMessage);
        return res.json({ botReply: await ApplyAttendanceRegularization(userMessage, employeeId, authHeader, companyId) });
      case "clock_in_out":
        return res.json({ botReply: await getClockInOutReply(userMessage, employeeId, authHeader, companyId) });

      case "policy_download":
        return res.json({ botReply: await getPolicyDocumentDownload(userMessage, employeeId, authHeader, companyId) });

      case "policy_info":
        return res.json({ botReply: await getPolicyInfoDocument(userMessage, locationId, authHeader, companyId) });
      
      case "holiday_info":
        return res.json({ botReply: await getHolidayReply(userMessage, locationId, authHeader, companyId) });

      case "upcoming_announcement":
        return res.json({ botReply: await getUpcomingAnnouncementReply(userMessage, employeeId, authHeader, companyId) });

      case "upcoming_celebration":
        return res.json({ botReply: await getUpcomingCelebrationReply(userMessage, employeeId, authHeader, companyId) });

      case "upcoming_docs_expiry":
        return res.json({ botReply: await getUpcomingDocsExpiryReply(userMessage, employeeId, authHeader, companyId) });

      case "salary_info":
        return res.json({ botReply: await getSalaryInfoReply(userMessage, locationId, authHeader, companyId, employeeId) });

      case "bank_info":
        return res.json({ botReply: await getBankInfoReply(userMessage, employeeId, authHeader, companyId) });
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

    const fallbackReply = await getOpenAIResponse(userMessage);
   
    return res.json({ botReply: fallbackReply });
  } catch (error) {
    console.error("Chatbot error:", error.message);
    return res.status(500).json({ botReply: "Something went wrong. Please try again later." });
  }
}

export { handleChatbotRequest };