/**
 * Shared API utilities
 */

/**
 * Create authentication headers for Elasticsearch
 * (via Cloudflare Access Service Token)
 */
export const createHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID || '',
    'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET || '',
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
