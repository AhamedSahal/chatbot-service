const axios = require("axios");
const { getOpenAIResponse } = require("./openaiServices");

async function getSalaryInfoReply(userMessage, locationId, authHeader, companyId, employeeId) {
    const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";
    const url = `${baseUrl}/employee/salary-setting?employeeId=${employeeId}`;
    const allowanceUrl = `${baseUrl}/employee/allowance?employeeId=${employeeId}`;
    if (!/^https?:\/\//.test(url)) {
        throw new Error("Invalid HRMS_SERVICE_URL. Please check your environment variables.");
    }
    const headers = {
        Authorization: authHeader,
        CompanyId: companyId,
        LocationId: locationId,
        EmployeeId: employeeId,
    };
    try {
        const [salaryResponse, allowanceResponse] = await Promise.all([
            axios.get(url, { headers }),
            axios.get(allowanceUrl, { headers })
        ]);

        const salaryInfo = salaryResponse.data?.data || {}; // Access the `data` property
        const allowanceInfo = allowanceResponse.data?.data || {}; // Access the `data` property


        if (Object.keys(salaryInfo).length === 0 && Object.keys(allowanceInfo).length === 0) {
            console.warn(`No Salary or Allowance Information data found`);
            return `No Salary or Allowance Information available.`;
        }

        // Combine salary and allowance information
        const combinedInfo = { ...salaryInfo, allowance: allowanceInfo };
       
        // Pass the combined information to OpenAI for analysis
        const prompt = `Here is the Salary and Allowance Information data: ${JSON.stringify(combinedInfo)}.\n\nUser query: ${userMessage}\n\nPlease provide a formal and direct response, avoiding phrases like 'Based on the provided data'.`;
        return await getOpenAIResponse(prompt);
    } catch (error) {
        if (error.response?.status === 403) {
            console.error("Error fetching salary or allowance information: Forbidden (403)");
            return "You do not have permission to access the salary or allowance information. Please contact your administrator.";
        }
        console.error("Error fetching salary or allowance information:", error);
        throw error;
    }
}

module.exports = {
    getSalaryInfoReply,
};