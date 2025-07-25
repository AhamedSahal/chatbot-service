import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function getOpenAIActionResponse(userMessage) {
  const assistantReply = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: userMessage },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: assistantReply,
  });

  return completion.choices[0].message.content;
}

export { getOpenAIActionResponse };
