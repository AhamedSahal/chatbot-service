import axios from "axios";
import { getOpenAIResponse } from "./openaiServices.js";



async function getUpcomingAnnouncementReply(userMessage, locationId, authHeader, companyId) {
    const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";
    const url = `${baseUrl}/announcement/upcoming-announcement`;
    if (!/^https?:\/\//.test(url)) {
        throw new Error("Invalid HRMS_SERVICE_URL. Please check your environment variables.");
    }
    const headers = {
        Authorization: authHeader,
        CompanyId: companyId,
        LocationId: locationId,
    };
    try {

        const response = await axios.get(url, { headers });
        const announcements = response.data?.data || [];

        if (!announcements.length) {
            console.warn(`No announcement data found`);
            return `No upcoming announcements available.`;
        }

        // Pass the entire announcements array to OpenAI for analysis
        const prompt = `Here is the announcement data: ${JSON.stringify(announcements)}.\n\nUser query: ${userMessage}\n\nPlease analyze the data and provide an appropriate response.`;
        return await getOpenAIResponse(prompt);
    } catch (error) {
        if (error.response?.status === 404) {
            console.error("Announcement API returned 404: Not Found");
            return "The announcement data could not be found. Please check your location ID or try again later.";
        }
        console.error("Error fetching announcements:", error.message);
        throw error;
    }
}

export {
    getUpcomingAnnouncementReply
};