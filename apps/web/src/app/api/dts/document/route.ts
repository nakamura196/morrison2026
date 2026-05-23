/**
 * DTS 1.0 Document endpoint.
 *
 * GET /api/dts/document?resource=<callNumber>&ref=&start=&end=&tree=&mediaType=
 *
 * TEI download strategy (per project decision, 2026-05-23):
 *   - Full document: the canonical TEI on s3ds (xml/morrison_p/<group>/<cn>/tei.xml,
 *       NER + coords), fetched with a SigV2 signed GET (s3ds rejects anonymous
 *       GET with 403). Falls back to (a) a plain GET against MORRISON_TEI_BASE if
 *       a public gateway is configured, then (b) a TEI generated from the ES page
 *       text — so the endpoint keeps working without S3 creds.
 *   - Fragment (ref / start+end): generated per-page from the ES page index and
 *       wrapped in <dts:wrapper>. Reliable per-page slicing of the canonical
 *       facsimile TEI in the Worker is out of scope; the page text is the
 *       natural unit.
 *
 * mediaType: application/tei+xml (default) or text/plain. As a browser-viewing
 * convenience, application/xml and text/xml are also accepted — same TEI body,
 * but a content-type browsers render inline instead of downloading.
 * Spec: https://dtsapi.org/specifications/versions/v1.0/
 */

import { NextRequest } from 'next/server'
import { getHost } from '@toyo/shared-lib'
import { ensureEnv } from '@/libs/cf-env'
import {
  TEI_BASE,
  MEDIA_TYPE_TEI,
  deriveGroup,
  dtsHeaders,
  dtsError,
  isValidId,
  buildTeiDocument,
  buildTeiFragment,
  type PageText,
} from '@/libs/dts'
import { fetchBib, fetchPages } from '@/libs/dts-data'
import { hasS3Credentials, s3SignedGet, teiKey } from '@/libs/s3'

export const revalidate = 3600

// application/xml & text/xml are browser-renderable aliases for the TEI body.
const SUPPORTED = new Set([MEDIA_TYPE_TEI, 'application/xml', 'text/xml', 'text/plain'])

export async function GET(request: NextRequest) {
  ensureEnv()
  const host = getHost(request)
  const { searchParams } = new URL(request.url)

  const resource = searchParams.get('resource')
  if (!resource) return dtsError(400, 'Missing required parameter: resource')
  if (!isValidId(resource)) return dtsError(400, 'Invalid resource')

  const ref = searchParams.get('ref')
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const mediaType = searchParams.get('mediaType') || MEDIA_TYPE_TEI

  if (!SUPPORTED.has(mediaType)) {
    return dtsError(400, 'Unsupported mediaType', `${mediaType} (supported: ${Array.from(SUPPORTED).join(', ')})`)
  }
  if (ref && (start || end)) return dtsError(400, 'ref must not be combined with start/end')
  if ((start && !end) || (end && !start)) return dtsError(400, 'start and end must be used together')

  const isFragment = Boolean(ref || (start && end))
  const wantsXml = mediaType !== 'text/plain'
  // Content-type for XML responses: the requested xml flavour, else TEI default.
  const xmlCT = wantsXml ? mediaType : MEDIA_TYPE_TEI

  try {
    const rec = await fetchBib(resource)
    if (!rec) return dtsError(404, 'Resource not found', resource)
    const b = rec.source
    const group = deriveGroup(resource)
    const pageCount = typeof b.page_count === 'number' ? b.page_count : undefined

    // ---- Full document: prefer canonical TEI on S3, fall back to ES ----
    if (!isFragment) {
      if (wantsXml) {
        // 1) Canonical TEI on s3ds (SigV2 signed GET).
        if (hasS3Credentials()) {
          try {
            const res = await s3SignedGet(teiKey(group, resource))
            if (res && res.ok) {
              return new Response(await res.text(), { headers: dtsHeaders(xmlCT) })
            }
          } catch {
            // fall through
          }
        }
        // 2) Optional public gateway override (plain GET, no signing).
        if (TEI_BASE) {
          try {
            const res = await fetch(`${TEI_BASE}/${group}/${resource}/tei.xml`, { next: { revalidate: 3600 } })
            if (res.ok) {
              return new Response(await res.text(), { headers: dtsHeaders(xmlCT) })
            }
          } catch {
            // fall through
          }
        }
      }

      // 3) ES-generated TEI (no canonical TEI reachable / no creds).
      const pages = await pagesOrEmpty(b.omeka_id)
      if (pages.length === 0) return noText(resource, host)
      if (!wantsXml) {
        return new Response(plain(pages), { headers: dtsHeaders('text/plain; charset=utf-8') })
      }
      // Wire a <facsimile> to the IIIF image / canvas / manifest URIs so the
      // generated TEI is not degraded vs the canonical (minus zone coords).
      const facsPageCount = pageCount || Math.max(...pages.map((p) => p.page))
      const tei = buildTeiDocument(resource, b, pages, { host, group, pageCount: facsPageCount })
      return new Response(tei, { headers: dtsHeaders(xmlCT) })
    }

    // ---- Fragment: per-page from ES, wrapped in <dts:wrapper> ----
    const all = await pagesOrEmpty(b.omeka_id)
    if (all.length === 0) return noText(resource, host)

    let lo: number
    let hi: number
    if (ref) {
      lo = hi = parseInt(ref, 10)
    } else {
      lo = parseInt(start as string, 10)
      hi = parseInt(end as string, 10)
    }
    const maxPage = pageCount || Math.max(...all.map((p) => p.page))
    if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 1 || hi > maxPage || lo > hi) {
      return dtsError(404, 'Reference out of range', `requested ${lo}..${hi} (1..${maxPage})`)
    }

    const selected = all.filter((p) => p.page >= lo && p.page <= hi)
    if (selected.length === 0) return dtsError(404, 'No text for requested reference', `${resource} ${lo}..${hi}`)

    if (!wantsXml) {
      return new Response(plain(selected), { headers: dtsHeaders('text/plain; charset=utf-8') })
    }
    return new Response(buildTeiFragment(selected), { headers: dtsHeaders(xmlCT) })
  } catch (err) {
    console.error('DTS document error:', err)
    return dtsError(500, 'Internal error')
  }
}

async function pagesOrEmpty(omekaId?: number): Promise<PageText[]> {
  if (typeof omekaId !== 'number') return []
  return fetchPages(omekaId)
}

function plain(pages: PageText[]): string {
  return pages.map((p) => p.text || '').join('\n\n')
}

function noText(resource: string, host: string): Response {
  return dtsError(
    404,
    'No text available for resource',
    `${resource} has no OCR fulltext in the index yet. Image-only items return no document. (${host})`,
  )
}
