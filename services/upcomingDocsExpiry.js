const axios = require("axios");
const { getOpenAIResponse } = require("./openaiServices");

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

        // Pass the entire Expiry Documents array to OpenAI for analysis
        const prompt = `Here is the Expiry Documents data: ${JSON.stringify(expiryDocuments)}.\n\nUser query: ${userMessage}\n\nPlease analyze the data and provide an appropriate response.`;
        return await getOpenAIResponse(prompt);
    } catch (error) {
        console.error("Error fetching upcoming document expiries:", error);
        throw error;
    }
}
module.exports = {
    getUpcomingDocsExpiryReply,
};