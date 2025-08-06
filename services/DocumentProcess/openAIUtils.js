// utils/openaiUtils.js
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { getOpenAIResponse } from '../OpenAIServices/openaiServices.js';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getQueryEmbedding(queryText) {
  const res = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: queryText,
  });
  return res.data[0].embedding;
}

export async function generateAnswer(topChunks, userQuery) {
 
  try {
    const context = topChunks.map(c => c.chunk_text).join('\n'); 
    const prompt = `Here is the relevant HR policy content: ${context}\n\nUser query: ${userQuery}\n\nPlease analyze the data and provide a concise, helpful response.`;
    return await getOpenAIResponse(prompt);
  } catch (error) {
    if (error.response?.status === 404) {
      console.error("Policy API returned 404: Not Found");
      return "The policy data could not be found. Please check your location ID or try again later.";
    }
    console.error("Error fetching policy data:", error.message);
    throw error;
  }
}
