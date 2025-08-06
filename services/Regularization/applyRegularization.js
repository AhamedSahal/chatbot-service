import axios from "axios";
import dayjs from "dayjs";
import { extractDateRange } from "../OpenAIServices/extractDateRange.js";
import { getOpenAIActionResponse } from "../OpenAIServices/openAIActionService.js";

let collectedFields = {};

export async function ApplyAttendanceRegularization(userMessage, employeeId, authHeader, companyId) {
  const baseUrl = process.env.HRMS_API_TOKEN || "https://default-hrms-api-url.com";

  const { fromDate, toDate, error: dateError } = await extractDateRange(userMessage);
  if (dateError) {
    return dateError;
  }

  const regularizedDate = dayjs().subtract(1, "day").format("YYYY-MM-DD");
  const url = `${baseUrl}/regularization/All?&self=1&regularizedDate=${regularizedDate}&fromDate=${fromDate}&toDate=${toDate}`;

  if (!/^https?:\/\//.test(url)) {
    throw new Error("Invalid HRMS_SERVICE_URL. Please check your environment variables.");
  }
 console.log("Fetching regularization data from URL:", userMessage);
  const headers = {
    Authorization: authHeader,
    CompanyId: companyId,
  };

  try {
    const response = await axios.get(url, { headers });
    const regularizations = response.data?.data?.list || [];

    const id = regularizations.length > 0 ? regularizations[0].id : null;
    if (!id) {
      throw new Error("No valid regularization ID found.");
    }

    const validationPrompt = `You are a validator for attendance regularization requests.

      Extract the following mandatory fields from the user’s message:
      - clockin (time)
      - clockout (time)
      - reason (a justification text)
      - date (the date of the regularization request)

      Only return a valid JSON object like this:
      {
        clockin: "2025-07-30T05:00:00.000Z",
        clockout: "2025-07-30T12:00:00.000Z",
        reason: "forgot to clock in"
        date: "2025-07-30"
      }

      If any of the fields are missing or unclear, return a message like:
      Please provide the clockout time.

      User message: "${userMessage}"`;

    const validationResponse = await getOpenAIActionResponse(validationPrompt);
    let clockin, clockout, reason;
    console.log("Validation response from OpenAI:", validationResponse);
    try {
      const parsed = JSON.parse(validationResponse);
      clockin = parsed.clockin;
      clockout = parsed.clockout;
      reason = parsed.reason;
    } catch (e) {
      console.error("Failed to parse OpenAI response:", e.message);
      return validationResponse;
    }
console.log("Parsed fields from OpenAI response:",  clockin, clockout, reason );
    const status = "REGULARIZED";
    const firHalf = collectedFields.clockin;
    const secHalf = collectedFields.clockout;
    const Reason = collectedFields.reason;

    if (firHalf && secHalf && Reason) {
      const submitUrl = `${baseUrl}/regularization/submit?id=${encodeURIComponent(id)}&firHalf=${firHalf}&secHalf=${secHalf}&Reason=${encodeURIComponent(Reason)}&status=${status}`;

      const header = {
        Authorization: authHeader,
        CompanyId: companyId,
      };

      try {
        const submitResponse = await axios.patch(submitUrl, {}, { headers: header });
        return `${submitResponse.data.message} ✅`;
      } catch (error) {
        console.error("Error submitting regularization:", error.message);
        throw error;
      }
    } 
  } catch (error) {
    if (error.response?.status === 404) {
      console.error("Regularization API returned 404: Not Found");
      return "The regularization data could not be found. Please check your location ID or try again later.";
    }
    console.error("Error fetching regularizations:", error.message);
    throw error;
  }
}

