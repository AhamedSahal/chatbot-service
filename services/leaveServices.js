import axios from "axios";
import { getOpenAIResponse } from "./OpenAIServices/openaiServices.js";


async function getLeaveBalanceReply(userMessage, employeeId, authHeader, companyId) {
  const year = new Date().getFullYear();
  const calendar = 0;
  const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";

  if (!/^https?:\/\//.test(baseUrl)) {
    throw new Error("Invalid HRMS_SERVICE_URL. Please check your environment variables.");
  }

  const url = `${baseUrl}/leave/balance?employeeId=${employeeId}&year=${year}&calendar=${calendar}`;
  const headers = {
    Authorization: authHeader,
    CompanyId: companyId,
  };

  try {
    const response = await axios.get(url, { headers });
    const details = response.data?.data?.details;
    if (!Array.isArray(details)) return "Sorry, I couldn't retrieve your leave data.";
    
    // Pass the entire details array to OpenAI for analysis
    const prompt = `The following leave data is available: ${JSON.stringify(details)}.User query: ${userMessage} Please analyze the data and provide a direct and conversational response without using phrases like 'Based on the data provided.'`;
    return await getOpenAIResponse(prompt);
  } catch (error) {
    console.error("Error fetching leave balance:", error.message);
    return "Apologies, I encountered an issue while retrieving your leave balance. Please try again later or contact HR.";
  }
}

export {
  getLeaveBalanceReply
};
