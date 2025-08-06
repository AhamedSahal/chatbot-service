import axios from "axios";
import { getOpenAIResponse } from "./OpenAIServices/openaiServices.js";

async function getMonthlyAttendanceReply(userMessage, locationId, authHeader, companyId) {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1; // Months are zero-indexed in JavaScript
    const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";
    const permission = 0
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    // Construct the query string
    const url = `${baseUrl}/attendance/today?date=${date}&permission=${permission}`;

    if (!/^https?:\/\//.test(url)) {
        throw new Error("Invalid HRMS_SERVICE_URL. Please check your environment variables.");
    }

    const headers = {
        Authorization: authHeader,
        CompanyId: companyId,
        LocationId: locationId,
    };

    try {
        console.log("Requesting monthly attendance with URL:", url);
        console.log("Request headers:", headers);

        const response = await axios.get(url, { headers });
        console.log("Full API response:", response.data);
        const attendanceData = response.data || [];

        // Pass the attendance data to OpenAI for analysis
        const prompt = `Your monthly attendance  ${year}-${month}: ${JSON.stringify(attendanceData)}.\n\nUser query: ${userMessage}\n\nPlease analyze the data and provide a concise response.`;
        return await getOpenAIResponse(prompt);
    } catch (error) {
        if (error.response?.status === 404) {
            console.error("Monthly Attendance API returned 404: Not Found");
            return "The monthly attendance data could not be found. Please check your location ID or try again later.";
        }
        console.error("Error fetching monthly attendance:", error.message);
        throw error;
    }
}

export {
    getMonthlyAttendanceReply
};