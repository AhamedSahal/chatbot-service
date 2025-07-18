import axios from "axios";
import { getOpenAIResponse } from "./openaiServices.js";


async function getBankInfoReply(employeeId, authHeader, companyId) {
    const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";
    const url = `${baseUrl}/employee/bank?id=${employeeId}`;
    if (!/^https?:\/\//.test(url)) {
        throw new Error("Invalid HRMS_SERVICE_URL. Please check your environment variables.");
    }
    const headers = {
        Authorization: authHeader,
        CompanyId: companyId,
    };
    try {
        const response = await axios.get(url, { headers });
        const bankInfo = response.data?.data || {}; // Access the `data` property
        console.log("Bank Information data:", bankInfo);
        if (Object.keys(bankInfo).length === 0) {
            console.warn(`No Bank Information data found`);
            return `No Bank Information available.`;
        }

        // Pass the bank information to OpenAI for analysis
        const prompt = `Here is the Bank Information data: ${JSON.stringify(bankInfo)}.\n\nPlease provide a formal and direct response, avoiding phrases like 'Based on the provided data'.`;
        return await getOpenAIResponse(prompt);
    } catch (error) {
        console.error("Error fetching bank information:", error);
        throw error;
    }
}
export { getBankInfoReply };