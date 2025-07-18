import { findTopRelevantChunks } from "./embeddingUtils.js";
import { generateAnswer, getQueryEmbedding } from "./openAIUtils.js";


async function getPolicyInfoDocument(userMessage, locationId, authHeader, companyId) {
 
 const documentId = 5;
  try {
    const queryEmbedding = await getQueryEmbedding(userMessage);
    const topChunks = await findTopRelevantChunks(queryEmbedding, documentId, companyId);
    const answer = await generateAnswer(topChunks, userMessage);

    return answer;
  } catch (err) {
    console.error('Error:', err);
    throw new Error('Internal server error');
  }
}

export { getPolicyInfoDocument };