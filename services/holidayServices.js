const axios = require("axios");
const { getOpenAIResponse } = require("./openaiServices");

async function getHolidayReply(userMessage, locationId, authHeader, companyId) {
  const year = new Date().getFullYear();
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
    console.log("Holidays data:", holidays);

    if (!holidays.length) {
      console.warn(`No holiday data found for location ID: ${locationId}`);
      return `No holiday data available for the location ID: ${locationId}. Please verify the location ID or try again later.`;
    }

    if (userMessage.includes("next holiday")) {
      const upcoming = holidays.find(h => new Date(h.date) > new Date());
      if (upcoming) {
        const prompt = `Generate a concise response in maximum 50 words for the following holiday information:\n\nHoliday Name: ${upcoming.occasion}\nDate: ${upcoming.date}`;
        const openAIResponse = await getOpenAIResponse(prompt);
        return openAIResponse;
      } else {
        return "No upcoming holidays found.";
      }
    } else {
      const list = holidays.map(h => `- ${h.occasion}: ${h.date}`).join("\n");
      const prompt = `Generate a polite and conversational response for the following list of holidays for the year ${year}:\n\n${list}`;
      const openAIResponse = await getOpenAIResponse(prompt);
      return openAIResponse;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.error("Holiday API returned 404: Not Found");
      return "The holiday data could not be found. Please check your location ID or try again later.";
    }
    console.error("Error fetching holidays:", error.message);
    throw error;
  }
}

module.exports = {
  getHolidayReply,
};