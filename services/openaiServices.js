
import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const greetings = ["hi", "hello", "thanks", "how are you", "hey", "good morning", "good evening"];
const hrmsKeywords = [
  "leave", "announcement", "holiday", "attendance", "payroll", "HR", "employee",
  "profile", "department", "division", "grade", "job title", "designation", "role",
  "function", "section", "shift", "branch", "location", "workplace", "joining date",
  "doj", "nationality", "gender", "marital status", "manager", "experience",
  "language", "email", "phone", "contact", "employee id", "emp id", "salary",
  "allowance", "bank", "account", "personal info", "company info", "my info", "blood group"
];

async function getOpenAIResponse(userMessage) {
  const isGreeting = greetings.some(greeting => userMessage.toLowerCase().includes(greeting));
  if (isGreeting) {
    const greetingPrompt = `You are a friendly assistant. Respond warmly and politely to the user's greeting.`;
    const greetingResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: greetingPrompt },
        { role: "user", content: userMessage },
      ],
    });
    return greetingResponse.choices[0].message.content;
  }

  const isHRMSQuery = hrmsKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
  if (!isHRMSQuery) {
    return "I'm here to assist with Workplus HRMS-related queries only. Please ask about topics like leave, holidays, or payroll.";
  }

  const prompt = `You are a helpful assistant. Answer the user's query politely, informatively, and concisely.`;
  const openAIResponse = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: userMessage },
    ],
  });
  return openAIResponse.choices[0].message.content;
}

export { getOpenAIResponse };
