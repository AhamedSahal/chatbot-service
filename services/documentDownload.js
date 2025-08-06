import axios from "axios";
import { getOpenAIResponse } from "./OpenAIServices/openaiServices.js";

async function getPolicyDocumentDownload(userMessage, locationId, authHeader, companyId) {
  const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";

  console.log("Base URL for policiesDocument:");
  // Construct the query string for policiesDocument
  const url = `${baseUrl}/policiesDocument`;

  if (!/^https?:\/\//.test(url)) {
    throw new Error("Invalid HRMS_SERVICE_URL. Please check your environment variables.");
  }
  0
  const headers = {
    Authorization: authHeader,
    CompanyId: companyId,
    LocationId: locationId,
  };

  try {
   

    const response = await axios.get(url, { headers });
    const policies = response.data?.data?.list || [];
   

    // Use OpenAI to find the most relevant document based on user query
    const prompt = `You are an assistant that helps users download HR policy documents.\n\nHere is the list of available policy documents (as JSON):\n${JSON.stringify(policies)}\n\nThe user asked: '${userMessage}'.\n\nFrom the list, select the most relevant document (if any) and respond ONLY with a JSON object in this format: {\n  id: <document id>,\n  filename: <document filename>,\n  canDownload: true\n}\nIf no relevant document is found, respond with: { canDownload: false }`;
    const aiResponse = await getOpenAIResponse(prompt);
    try {
      const docInfo = JSON.parse(aiResponse);
      if (docInfo && docInfo.id && docInfo.filename && docInfo.canDownload) {
        return docInfo;
      } else {
        console.log("OpenAI response did not match expected format:");
        const prompt = `This is Document types.  ${JSON.stringify(policies)}.\n\nUser query: ${userMessage}\n\nPlease analyze the data and provide a concise response.`;
        return await getOpenAIResponse(prompt);
      }
    } catch (e) {
      // If OpenAI response is not valid JSON, fallback
      console.log("Error parsing OpenAI response:", e);
      return { canDownload: false };
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.error("Policy Document API returned 404: Not Found");
      return "The policy document data could not be found. Please check your location ID or try again later.";
    }
    console.error("Error fetching policy documents:", error.message);
    throw error;
  }
}

export { getPolicyDocumentDownload };