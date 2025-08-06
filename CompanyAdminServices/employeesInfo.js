import axios from "axios";
import { getOpenAIResponse } from "../services/OpenAIServices/openaiServices.js";

async function getEmployeesInfo(foundEmployee, employeeId, authHeader, companyId) {
    const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";
    
    let url = `${baseUrl}/employee?q=${encodeURIComponent(foundEmployee)}`;
    console.log(foundEmployee,employeeId,"Constructed URL for employee search:",authHeader, companyId);
   
    const headers = {
        Authorization: authHeader,
        CompanyId: companyId,
    };
    try {
        const response = await axios.get(url, { headers });
        // Log the full response object and data for debugging
        console.log("Raw response.data:", response.data);
        // Defensive: check if response.data exists
        if (!response.data) {
            console.warn("No response data received from API");
            return `No response data received from API.`;
        }
        // Map the API response to match the expected format
        const data = response.data.data || {};
        console.log("Employee Information data:", data.list);
        if (!data.list || !Array.isArray(data.list) || !data.list.length) {
            console.warn(`No employee data found for query: ${foundEmployee}`);
            return `No employee information available for \"${foundEmployee}\".`;
        }
        // Map all employees in the list
        const employeeList = data.list;
        // Pass the employee information list to OpenAI for analysis, requesting a point-wise response
        const prompt = `Here is the Employee Information data: ${JSON.stringify(employeeList)}.\n\nPlease provide a formal, direct, and point-wise response (use numbered or bullet points for each key detail), avoiding phrases like 'Based on the provided data'.`;
        return await getOpenAIResponse(prompt);
    } catch (error) {
        console.error("Error fetching employee information:", error);
        throw error;
    }
}

export {
  getEmployeesInfo
};