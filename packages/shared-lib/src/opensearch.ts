/**
 * OpenSearch client utilities for API routes
 */

// Forbidden query types that could be dangerous
const FORBIDDEN_QUERY_TYPES = [
  'script',
  'script_score',
  'runtime_mappings',
];

const MAX_FROM = 10000;
const MAX_SIZE = 100;
const MAX_AGGREGATION_DEPTH = 3;

/**
 * Check for forbidden keys recursively
 */
function hasForbiddenKeys(obj: unknown, depth = 0): string | null {
  if (depth > 10 || typeof obj !== 'object' || obj === null) {
    return null;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (FORBIDDEN_QUERY_TYPES.includes(key)) {
      return `Forbidden query type: ${key}`;
    }

    if (key === 'function_score' && typeof value === 'object' && value !== null) {
      const fs = value as Record<string, unknown>;
      if ('script_score' in fs || 'script' in fs) {
        return 'Forbidden: script in function_score';
      }
    }

    const nested = hasForbiddenKeys(value, depth + 1);
    if (nested) return nested;
  }

  return null;
}

/**
 * Check aggregation depth
 */
function checkAggregationDepth(obj: unknown, depth = 0): boolean {
  if (depth > MAX_AGGREGATION_DEPTH) return false;
  if (typeof obj !== 'object' || obj === null) return true;

  for (const [key, value] of Object.entries(obj)) {
    if (key === 'aggs' || key === 'aggregations') {
      if (!checkAggregationDepth(value, depth + 1)) return false;
    } else if (typeof value === 'object') {
      if (!checkAggregationDepth(value, depth)) return false;
    }
  }

  return true;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

/**
 * Validate search query
 */
export function validateQuery(body: unknown): ValidationResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { valid: false, error: 'Request body must be an object' };
  }

  const data = body as Record<string, unknown>;

  // Check for forbidden query types
  const forbidden = hasForbiddenKeys(data);
  if (forbidden) {
    return { valid: false, error: forbidden };
  }

  // Validate 'from' parameter
  if ('from' in data) {
    const from = Number(data.from);
    if (isNaN(from) || from < 0) {
      return { valid: false, error: 'Invalid from parameter' };
    }
    if (from > MAX_FROM) {
      return { valid: false, error: `from parameter exceeds maximum (${MAX_FROM})` };
    }
  }

  // Validate 'size' parameter
  if ('size' in data) {
    const size = Number(data.size);
    if (isNaN(size) || size < 0) {
      return { valid: false, error: 'Invalid size parameter' };
    }
    if (size > MAX_SIZE) {
      data.size = MAX_SIZE;
    }
  }

  // Check aggregation depth
  if (!checkAggregationDepth(data)) {
    return { valid: false, error: `Aggregation depth exceeds maximum (${MAX_AGGREGATION_DEPTH})` };
  }

  return { valid: true, data };
}

/**
 * Validate document ID
 */
export function validateDocumentId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length <= 512;
}

/**
 * Get allowed indices from environment
 */
export function getAllowedIndices(): string[] {
  return (process.env.ALLOWED_INDICES || 'kanseki').split(',').map(s => s.trim());
}

/**
 * Fetch from OpenSearch with authentication
 */
export async function fetchFromOpenSearch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const esHost = process.env.ES_HOST || 'http://localhost:9200';
  const esUsername = process.env.ES_USERNAME || '';
  const esPassword = process.env.ES_PASSWORD || '';

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (esUsername && esPassword) {
    const auth = Buffer.from(`${esUsername}:${esPassword}`).toString('base64');
    (headers as Record<string, string>)['Authorization'] = `Basic ${auth}`;
  }

  return fetch(`${esHost}${path}`, {
    ...options,
    headers,
  });
}
