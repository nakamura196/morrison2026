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
