import axios from "axios";
import { getOpenAIResponse } from "../OpenAIServices/openaiServices.js";
import dayjs from "dayjs"; // Replace moment.js with dayjs
import { extractDateRange } from "../OpenAIServices/extractDateRange.js";

async function getRegularizationReply(userMessage, employeeId, authHeader, companyId) {
  const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";
  console.log("Base URL for regularization:****************", baseUrl);

  const { fromDate, toDate, error: dateError } = await extractDateRange(userMessage);
  if (dateError) {
    return dateError;
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

    // Filter the regularizations array to include only the specified fields
    const filteredRegularizations = regularizations.map(({ date, systemReason, regularizationStatus, regularizationRemarks, approvalstatus }) => ({
      date,
      systemReason,
      regularizationStatus,
      regularizationRemarks,
      approvalstatus
    }));
    console.log("Regularizations fetched:----------------------------------", filteredRegularizations);
    // Pass the current date and filtered regularizations array to OpenAI for analysis
    const prompt = `Today's date is ${dayjs().format("YYYY-MM-DD")}. Here is the regularization data: ${JSON.stringify(filteredRegularizations)}.\n\nUser query: ${userMessage}\n\nPlease provide a concise response.`;
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

export { getRegularizationReply };