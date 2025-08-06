import axios from "axios";
import { getOpenAIResponse } from "./OpenAIServices/openaiServices.js";

async function getHolidayReply(userMessage, locationId, authHeader, companyId) {
  const year = new Date().getFullYear();
  const currentDate = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
  const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";

  // Construct the query string
  const url = `${baseUrl}/holiday/holidayList?locationId=${locationId}&year=${year}`;

  if (!/^https?:\/\//.test(url)) {
    throw new Error("Invalid HRMS_SERVICE_URL. Please check your environment variables.");
  }

  const headers = {
    Authorization: authHeader,
    CompanyId: companyId,
    LocationId: locationId,
  };

  try {
    console.log("Requesting holidays with URL:", url);
    console.log("Request headers:", headers);

    const response = await axios.get(url, { headers });
    console.log("Full API response:", response.data);
    const holidays = response.data?.data?.list || [];
    console.log("Holidays data:", currentDate);

    // Pass the current date and holidays array to OpenAI for analysis
    const prompt = `Today's date is ${currentDate}. Your Holidays is : ${JSON.stringify(holidays)}. User query: ${userMessage} Please analyze the data and provide a direct and conversational response.`;
    return await getOpenAIResponse(prompt);
  } catch (error) {
    if (error.response?.status === 404) {
      console.error("Holiday API returned 404: Not Found");
      return "The holiday data could not be found. Please check your location ID or try again later.";
    }
    console.error("Error fetching holidays:", error.message);
    throw error;
  }
}

export { getHolidayReply };