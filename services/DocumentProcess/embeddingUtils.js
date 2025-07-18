import { db } from '../../db.js';
import { cosineSimilarity } from './similarity.js';

export async function findTopRelevantChunks(queryEmbedding, documentId, companyId) {
  try {
    const [rows] = await db.query(
      'SELECT chunk_text, embedding_json FROM policy_embedding_documents WHERE document_id = ? AND company_id = ?',
      [documentId, companyId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('No embeddings found for this document.');
    }

    const scored = rows.map(row => {
      try {
        const vector = typeof row.embedding_json === 'string'
          ? JSON.parse(row.embedding_json)
          : row.embedding_json;

        return {
          chunk_text: row.chunk_text,
          score: cosineSimilarity(queryEmbedding, vector),
        };
      } catch (err) {
        console.warn('Skipping invalid embedding vector:', row.embedding_json);
        return null;
      }
    }).filter(Boolean);

    if (scored.length === 0) {
      throw new Error('All chunks had invalid or empty embeddings.');
    }

    return scored.sort((a, b) => b.score - a.score).slice(0, 3);
  } catch (error) {
    console.error('DB query error in findTopRelevantChunks:', error);
    throw error;
  }
}
