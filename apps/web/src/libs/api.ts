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
