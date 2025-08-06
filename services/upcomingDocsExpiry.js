import axios from "axios";
import { getOpenAIResponse } from "./OpenAIServices/openaiServices.js";

async function getUpcomingDocsExpiryReply(userMessage, locationId, authHeader, companyId) {
    const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";
    const url = `${baseUrl}/employee-document/documentexpiry-list`;

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
        const expiryDocuments = response.data?.data || []; // Access the `data` property
        console.log("Upcoming Expiry Documents data:", expiryDocuments);

        if (!expiryDocuments.length) {
            console.warn(`No Expiry Documents data found`);
            return `No upcoming Expiry Documents available.`;
        }

        // Use OpenAI to answer user's question based on expiryDocuments data, including the current date
        const now = new Date();
        const currentDateString = now.toISOString().split('T')[0];
        const prompt = `You are an assistant that helps users with HR document expiry information. Today's date is ${currentDateString}. Here is the list of upcoming document expiries (as JSON):\n${JSON.stringify(expiryDocuments)}\n\nThe user asked: '${userMessage}'.\n\nBased on the data and today's date, answer the user's question. If there are relevant expiring documents, list them with their document name and expiry date. If there are none, reply with a short, clear message.`;
        const aiResponse = await getOpenAIResponse(prompt);
        return aiResponse;
    } catch (error) {
        console.error("Error fetching upcoming document expiries:", error);
        throw error;
    }
}
export {
    getUpcomingDocsExpiryReply
};