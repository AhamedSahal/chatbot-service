import axios from "axios";
import { getOpenAIResponse } from "./openaiServices.js";
import dayjs from "dayjs"; // Replace moment.js with dayjs
import { getOpenAIActionResponse } from "./openAIActionService.js";

async function getRegularizationReply(userMessage, employeeId, authHeader, companyId) {
  const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";

  // Send userMessage to OpenAI to extract dates
  const datePrompt = `Today's date is ${dayjs().format("YYYY-MM-DD")}. Based on the user query: "${userMessage}", determine the appropriate date range for regularization. If the user mentions "previous month", provide the start and end dates of the previous month. If the user specifies a date range like "from YYYY-MM-DD to YYYY-MM-DD", extract those dates. Return ONLY the dates in the format: { "fromDate": "YYYY-MM-DD", "toDate": "YYYY-MM-DD" }. Do not include any explanation or extra text.`;
  const dateResponse = await getOpenAIActionResponse(datePrompt);

  let fromDate, toDate;
  try {
    const dateData = JSON.parse(dateResponse);
    fromDate = dateData.fromDate;
    toDate = dateData.toDate;

    const today = dayjs();
    if (dayjs(fromDate).isAfter(today) || dayjs(toDate).isAfter(today)) {
      return "Regularization can only be applied for past dates. Please provide a valid date range.";
    }
  } catch (error) {
    console.error("Error parsing OpenAI response:", error.message);
    throw new Error("Failed to parse dates from OpenAI response. Please check the response format.");
  }

  // Construct the query string
  const regularizedDate = dayjs().subtract(1, "day").format("YYYY-MM-DD");

  const url = `${baseUrl}/regularization/All?&self=1&regularizedDate=${regularizedDate}&fromDate=${fromDate}&toDate=${toDate}`;

  if (!/^https?:\/\//.test(url)) {
    throw new Error("Invalid HRMS_SERVICE_URL. Please check your environment variables.");
  }

  const headers = {
    Authorization: authHeader,
    CompanyId: companyId,
  };

  try {

    const response = await axios.get(url, { headers });
    const regularizations = response.data?.data?.list || [];

    // Pass the current date and regularizations array to OpenAI for analysis
    const prompt = `Today's date is ${dayjs().format("YYYY-MM-DD")}. Here is the regularization data: ${JSON.stringify(regularizations)}.\n\nUser query: ${userMessage}\n\nPlease provide a concise response.`;
    return await getOpenAIResponse(prompt);
  } catch (error) {
    if (error.response?.status === 404) {
      console.error("Regularization API returned 404: Not Found");
      return "The regularization data could not be found. Please check your location ID or try again later.";
    }
    console.error("Error fetching regularizations:", error.message);
    throw error;
  }
}

async function submitRegularization(data, authHeader, companyId) {
  const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";
  console.log("Submitting regularization with data:", data);
  const validationPrompt = `Validate the following regularization data: ${JSON.stringify(data)}. Ensure all mandatory fields (id, firHalf, secHalf, Reason) are present and correctly formatted. Return ONLY "valid" if the data is correct, or "invalid" if there are issues.`;
  const validationResponse = await getOpenAIActionResponse(validationPrompt);

  if (validationResponse.trim() !== "valid") {
    throw new Error("Validation failed for regularization data. Please check the input fields.");
  }

  const { id, firHalf, secHalf, Reason } = data;

  if (!id || !firHalf || !secHalf || !Reason) {
    throw new Error("Missing mandatory fields for regularization submission.");
  }

  const status = "REGULARIZED";

  const url = `${baseUrl}/regularization/submit?id=${id}&firHalf=${encodeURIComponent(firHalf)}&secHalf=${encodeURIComponent(secHalf)}&Reason=${encodeURIComponent(Reason)}&status=${encodeURIComponent(status)}`;

  const headers = {
    Authorization: authHeader,
    CompanyId: companyId,
  };

  try {
    const response = await axios.post(url, {}, { headers });
    console.log("Regularization submission response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error submitting regularization:", error.message);
    throw error;
  }
}

async function handleRegularizationRequest(userMessage, authHeader, companyId) {
  const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";

  // Extract the date from the user message
  const datePrompt = `Extract the date from the following user query: \"${userMessage}\". Return ONLY the date in the format YYYY-MM-DD.`;
  const dateResponse = await getOpenAIActionResponse(datePrompt);

  let regularizationDate;
  try {
    regularizationDate = dateResponse.trim();

    // Validate the extracted date
    if (!dayjs(regularizationDate, "YYYY-MM-DD", true).isValid()) {
      throw new Error("Invalid date extracted from user query.");
    }
  } catch (error) {
    console.error("Error parsing date from OpenAI response:", error.message);
    throw new Error("Failed to extract a valid date from the user query.");
  }

  const data = {
    id: "104170",
    firHalf: `${regularizationDate}T04:02:00.000Z`,
    secHalf: `${regularizationDate}T13:02:00.000Z`,
    Reason: "User requested regularization for attendance.",
    status: "REGULARIZED",
  };

  try {
    const response = await submitRegularization(data, authHeader, companyId);
    return response;
  } catch (error) {
    console.error("Error handling regularization request:", error.message);
    throw error;
  }
}

export { getRegularizationReply, submitRegularization, handleRegularizationRequest };