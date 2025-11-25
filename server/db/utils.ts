/**
 * Database utility functions
 */

/**
 * Calculate cosine distance between two vectors
 * Cosine distance = 1 - cosine similarity
 * Lower values indicate more similar vectors
 */
export function cosineDistance(vec1: number[], vec2: number[]): number {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    magnitude1 += vec1[i] * vec1[i];
    magnitude2 += vec2[i] * vec2[i];
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);

  if (magnitude1 === 0 || magnitude2 === 0) {
    return 1; // Maximum distance if either vector is zero
  }

  const cosineSimilarity = dotProduct / (magnitude1 * magnitude2);
  return 1 - cosineSimilarity;
}

/**
 * Calculate cosine similarity between two vectors
 * Higher values indicate more similar vectors (range: -1 to 1)
 */
export function cosineSimilarity(vec1: number[], vec2: number[]): number {
  return 1 - cosineDistance(vec1, vec2);
}
