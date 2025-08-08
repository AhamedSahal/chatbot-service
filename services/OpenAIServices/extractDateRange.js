import dayjs from "dayjs";
import { getOpenAIActionResponse } from "./openAIActionService.js";

/**
 * Extracts a date range from a user message using OpenAI.
 * @param {string} userMessage - The user's message containing date information.
 * @returns {Promise<{fromDate: string, toDate: string, error?: string}>} - The extracted date range or an error message.
 */
export async function extractDateRange(userMessage) {
  // Check for 'this month', 'current month', or 'present month'
  const lowerMsg = userMessage.toLowerCase();
  const today = dayjs();
  if (
    lowerMsg.includes('this month') ||
    lowerMsg.includes('current month') ||
    lowerMsg.includes('present month')
  ) {
    // If today is the 1st, no past days to regularize
    if (today.date() === 1) {
      return { error: "No past days in this month to regularize yet." };
    }
    const fromDate = today.startOf('month').format('YYYY-MM-DD');
    const toDate = today.subtract(1, 'day').format('YYYY-MM-DD');
    return { fromDate, toDate };
  }

  const datePrompt = `Today's date is ${today.format("YYYY-MM-DD")}. Based on the user query: "${userMessage}", determine the appropriate date range for regularization. If the user mentions "previous month", provide the start and end dates of the previous month. If the user specifies a date range like "from YYYY-MM-DD to YYYY-MM-DD", extract those dates. Return ONLY the dates in the format: { "fromDate": "YYYY-MM-DD", "toDate": "YYYY-MM-DD" }. Do not include any explanation or extra text.`;
  const dateResponse = await getOpenAIActionResponse(datePrompt);
console.log("OpenAI date extraction response:", dateResponse);
  let fromDate, toDate;
  try {
    const dateData = JSON.parse(dateResponse);
    fromDate = dateData.fromDate;
    toDate = dateData.toDate;

    if (dayjs(fromDate).isAfter(today) || dayjs(toDate).isAfter(today)) {
      return { error: "Regularization can only be applied for past dates. Please provide a valid date range." };
    }
  } catch (error) {
    console.error("Error parsing OpenAI response:", error.message);
    throw new Error("Failed to parse dates from OpenAI response. Please check the response format.");
  }
  return { fromDate, toDate };
}
