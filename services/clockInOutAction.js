import axios from "axios";
import { getOpenAIResponse } from "./openaiServices.js";

async function getClockInOutReply(userMessage, employeeId, authHeader, companyId) {
    // Declare 'action' at the top of the function to ensure proper scoping
    let action;

    // Determine clock-in or clock-out action
    const isClockIn = userMessage.match(/\b(clock in|check in|start work|begin shift)\b/i);
    const isClockOut = userMessage.match(/\b(clock out|check out|end work|finish shift)\b/i);

    if (!isClockIn && !isClockOut) {
        throw new Error("Invalid clock-in/clock-out request. Please use phrases like 'clock in', 'start work', 'clock out', or 'end work'.");
    }

    action = isClockIn ? "clock-in" : "clock-out";

    const currentDate = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
    const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";
    
   
    // Construct the query string
    const url = `${baseUrl}/attendance-v2/web`;

    if (!/^https?:\/\//.test(url)) {
        throw new Error("Invalid HRMS_SERVICE_URL. Please check your environment variables.");
    }
    console.log("Base URL for HRMS API:", url);
    const headers = {
        Authorization: authHeader,
        CompanyId: companyId,
        EmployeeId: employeeId,
    };

    try {
        console.log(`Requesting  with URL:`, url);
        console.log("Request headers:", headers);

        const response = await axios.post(url, {}, { headers });
        console.log("Full API response:", response.data);

        const attendanceData = response.data?.message || {};
        console.log("Attendance data:", attendanceData);

        // Pass the current date and attendance data to OpenAI for analysis
        const prompt = `
            Today's date is ${currentDate}.
            Here is the attendance data for the action '${action}': ${JSON.stringify(attendanceData)}.
            User query: "${userMessage}"

            🎯 Instruction: Respond in a short, clear sentence (maximum 12 words). Avoid long explanations or paragraphs. Use simple and direct phrasing.

            📌 Examples:
            - If already clocked in: "You’ve already clocked-In today."
            - If clock-in successful: "Clock-in completed successfully.✅"
            - If clock-out successful: "Clock-out completed successfully.✅"
            - If not allowed: "Clock-in not allowed at this time."

            Now, based on the data and query, provide a short response.
            `;
        return await getOpenAIResponse(prompt);
    } catch (error) {
        if (error.response?.status === 404) {
            console.error(` API returned 404: Not Found`);
            return `The  data could not be found. Please check your employee ID or try again later.`;
        }
        // Ensure 'action' is included in error handling
        console.error(`Error performing ${action}:`, error.message);
        throw error;
    }
}

export { getClockInOutReply };