import { findTopRelevantChunks } from "./embeddingUtils.js";
import { generateAnswer, getQueryEmbedding } from "./openAIUtils.js";
import { db } from '../../db.js';

async function getPolicyInfoDocument(userMessage, locationId, authHeader, companyId) {
 
const result = await db.query(
  'SELECT id FROM chatbotpolicydocs'
);
const documentIds = result[0].map(row => row.id);
const documentId = documentIds[0];
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