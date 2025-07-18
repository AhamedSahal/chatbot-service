import axios from "axios";
import { getOpenAIResponse } from "./openaiServices.js";

async function getUpcomingCelebrationReply(userMessage, locationId, authHeader, companyId) {
    const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";
    const url = `${baseUrl}/employee/upcoming-celebration`;  
    if (!/^https?:\/\//.test(url)) {
        throw new Error("Invalid HRMS_SERVICE_URL. Please check your environment variables.");
    }
    const headers = {
        Authorization: authHeader,
        CompanyId: companyId,
        LocationId: locationId,
    };
    try {
        console.log("Requesting upcoming celebrations with URL:", url);
        console.log("Request headers:", headers);

        const response = await axios.get(url, { headers });
        const celebrations = response.data?.data || [];
        console.log("Full API response:", celebrations);

        if (!celebrations.length) {
            console.warn(`No celebration data found`);
            return `No upcoming celebrations available.`;
        }

        // Pass the entire celebrations array to OpenAI for analysis
        const prompt = `Here is the celebration data: ${JSON.stringify(celebrations)}.\n\nUser query: ${userMessage}\n\nPlease analyze the data and provide an appropriate response.`;
        return await getOpenAIResponse(prompt);
    } catch (error) {
        if (error.response?.status === 404) {
            console.error("Celebration API returned 404: Not Found");
            return "The celebration data could not be found. Please check your location ID or try again later.";
        }
        console.error("Error fetching celebrations:", error.message);
        throw error;
    }

}
export {
    getUpcomingCelebrationReply
};