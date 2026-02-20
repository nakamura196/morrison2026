/**
 * Shared API utilities
 */

/**
 * Create authentication headers for Elasticsearch/OpenSearch
 */
export const createHeaders = (username?: string, password?: string) => {
  const user = username || process.env.ES_USERNAME || ''
  const pass = password || process.env.ES_PASSWORD || ''
  const auth = Buffer.from(`${user}:${pass}`).toString('base64')

  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${auth}`,
  }
}

/**
 * Create CORS headers for API responses
 */
export const createCorsHeaders = () => {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
