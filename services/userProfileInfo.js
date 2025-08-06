import axios from "axios";
import { getOpenAIResponse } from "./OpenAIServices/openaiServices.js";


async function getProfileInfoReply(employeeId, authHeader, companyId) {
    console.log("Employee ID in profile info request ***********:", employeeId);
    const baseUrl = process.env.HRMS_API_TOKEN ;
    const personalUrl = `${baseUrl}/employee/personal-info?id=${employeeId}`;
    const companyUrl = `${baseUrl}/employee/company?id=${employeeId}`;

    // Validate both URLs
    if (!/^https?:\/\//.test(personalUrl) || !/^https?:\/\//.test(companyUrl)) {
        throw new Error("Invalid HRMS_SERVICE_URL. Please check your environment variables.");
    }

    console.log("Personal URL: -----------", personalUrl);
    console.log("Company URL: ------------", companyUrl);
    const headers = {
        Authorization: authHeader,
        CompanyId: companyId,
        employeeId: employeeId,
    };
    try {
        const [profileResponse, companyResponse] = await Promise.all([
            axios.get(personalUrl, { headers }),
            axios.get(companyUrl, { headers })
        ]);

        const profileInfo = profileResponse.data?.data || {}; // Access the `data` property
        const companyInfo = companyResponse.data?.data || {}; // Access the `data` property
        console.log("Profile Information data:", profileInfo);
        console.log("Company Information data:", companyInfo);
        if (Object.keys(profileInfo).length === 0 && Object.keys(companyInfo).length === 0) {
            console.warn(`No Profile or Company Information data found`);
            return `No Profile or Company Information available.`;
        }

        // Combine profile and company information
        const combinedInfo = { ...profileInfo, company: companyInfo };

        // Pass the combined information to OpenAI for analysis
        const prompt = `Here is the Profile and Company Information data: ${JSON.stringify(combinedInfo)}.\n\nPlease provide a formal and direct response, avoiding phrases like 'Based on the provided data'.`;
        return await getOpenAIResponse(prompt);
    } catch (error) {
        console.error("Error fetching profile or company information:", error);
        throw error;
    }

}
export {
    getProfileInfoReply
};