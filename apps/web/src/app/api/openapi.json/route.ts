/**
 * Serves the OpenAPI 3.1 document describing the Morrison web API.
 *
 * GET /api/openapi.json
 *
 * Consumed by the Swagger UI page at /<locale>/api-docs. The document itself
 * lives in src/libs/openapi.ts (single source of truth).
 */

import { NextResponse } from 'next/server'
import { openApiDocument } from '@/libs/openapi'

export const revalidate = 3600

export async function GET() {
  return NextResponse.json(openApiDocument, {
    headers: {
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
