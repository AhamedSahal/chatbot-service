const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

async function getOpenAIResponse(userMessage) {
  const greetings = ["hi", "hello","thanks","how are you", "hey", "good morning", "good evening"];
  const isGreeting = greetings.some(greeting => userMessage.toLowerCase().includes(greeting));

  if (isGreeting) {
    const greetingPrompt = `You are a friendly assistant. Respond warmly and politely to the user's greeting.`;
    const greetingResponse = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        { role: "system", content: greetingPrompt },
        { role: "user", content: userMessage },
      ],
    });
    return greetingResponse.data.choices[0].message.content;
  }

  const hrmsKeywords = ["leave", "announcement", "holiday", "attendance", "payroll", "HR", "employee"];
  const isHRMSQuery = hrmsKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));

  if (!isHRMSQuery) {
    return "I'm here to assist with Workplus HRMS-related queries only. Please ask about topics like leave, holidays, or payroll.";
  }

  const prompt = `You are a helpful assistant. Answer the user's query politely, informatively, and concisely.`;
  const openAIResponse = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: userMessage },
    ],
  });
  return openAIResponse.data.choices[0].message.content;
}

module.exports = {
  getOpenAIResponse,
};