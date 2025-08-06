import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getOpenAIIntent(userMessage, chatHistory) {
  const formattedChatHistory = chatHistory
    .map((message, index) => `Message ${index + 1}: ${message}`)
    .join("\n");
console.log("Formatted chat history for intent detection:", formattedChatHistory);
  const prompt = `Classify the user message into one of these intents:
["leave_balance", "leave_application", "leave_history", "attendance_summary", 
"attendance_regularization_status", "apply_attendance_regularization",
 "clock_in_out", "policy_download", "policy_info", "bank_info", 
 "salary_info", "holiday_info", "upcoming_announcement", "upcoming_celebration", "upcoming_docs_expiry"]

Examples:
- "How many leaves do I have left?" → leave_balance
- "I want to apply for vacation" → leave_application
- "I want to clock in / clock out" → clock_in_out
- "Who approved my last sick leave?" → leave_history
- "Show my attendance last month" → attendance_summary
- "Did my regularization go through?" → attendance_regularization_status
- "I want to regularize my attendance" → apply_attendance_regularization
- "What is my bank account info?" → bank_info
- "Download my company policy" → policy_download
- "Where can I find policy details?" → policy_info
- "What are the upcoming holidays?" → holiday_info
- "Tell me about upcoming announcements" → upcoming_announcement
- "What celebrations are coming up?" → upcoming_celebration
- "What documents are expiring soon?" → upcoming_docs_expiry
- "What is my salary information?" → salary_info
Chat history:
${formattedChatHistory}
User: "${userMessage}"`;

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0,
  });

  return response.choices[0].message.content.trim();
}
