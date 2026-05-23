/**
 * Item metadata export — JSON:API document for one bibliographic record.
 *
 * GET /api/item/:id   (id = callNumber, e.g. P-I-a-0001)
 *
 * Returns the full morrison_bib `_source` wrapped as a JSON:API resource object
 * ({ data: { type, id, attributes } }, https://jsonapi.org/). A
 * `Content-Disposition: attachment` header makes browsers download it as
 * `<id>.json`. Linked from the item page's Export panel ("JSON:API" button) and
 * documented in the OpenAPI spec (src/libs/openapi.ts).
 */

import { NextRequest } from 'next/server'
import { ensureEnv } from '@/libs/cf-env'
import { createHeaders } from '@/libs/api'

export const revalidate = 3600

const INDEX_NAME = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'
const JSON_API_MEDIA_TYPE = 'application/vnd.api+json'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  ensureEnv()
  const { id } = await params
  const host = process.env.ES_URL || ''

  try {
    const res = await fetch(`${host}/${INDEX_NAME}/_doc/${encodeURIComponent(id)}`, {
      headers: createHeaders(),
      next: { revalidate: 3600 },
    })
    if (!res.ok) {
      return jsonApiError(res.status === 404 ? 404 : 502, 'Item not found', id)
    }
    const data = await res.json()
    if (!data.found) return jsonApiError(404, 'Item not found', id)

    const body = JSON.stringify(
      {
        jsonapi: { version: '1.1' },
        data: {
          type: INDEX_NAME,
          id: data._id,
          attributes: data._source,
        },
      },
      null,
      2,
    )
    return new Response(body, {
      headers: {
        'Content-Type': JSON_API_MEDIA_TYPE,
        'Content-Disposition': `attachment; filename="${id}.json"`,
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    console.error('Item JSON export error:', err)
    return jsonApiError(500, 'Internal error', id)
  }
}

/** JSON:API top-level error document (https://jsonapi.org/format/#errors). */
function jsonApiError(status: number, title: string, detail?: string): Response {
  return new Response(
    JSON.stringify({ errors: [{ status: String(status), title, detail }] }, null, 2),
    {
      status,
      headers: {
        'Content-Type': JSON_API_MEDIA_TYPE,
        'Access-Control-Allow-Origin': '*',
      },
    },
  )
}
