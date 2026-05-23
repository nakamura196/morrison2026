/**
 * DTS 1.0 Navigation endpoint.
 *
 * GET /api/dts/navigation?resource=<callNumber>&ref=&start=&end=&down=&tree=&page=
 *
 * Lists the citable units of a resource. The corpus is page-imaged pamphlets,
 * so there is a single flat citation level: one `page` CitableUnit per page.
 * Page count comes from morrison_bib.page_count (present for every record),
 * falling back to the morrison page index.
 * Spec: https://dtsapi.org/specifications/versions/v1.0/
 */

import { NextRequest } from 'next/server'
import { getHost } from '@toyo/shared-lib'
import { ensureEnv } from '@/libs/cf-env'
import {
  DTS_CONTEXT,
  DTS_VERSION,
  dtsBase,
  dtsHeaders,
  dtsError,
  isValidId,
  resourceTemplates,
  bibToDublinCore,
  pageCitationTrees,
} from '@/libs/dts'
import { fetchBib, fetchPages } from '@/libs/dts-data'

export const revalidate = 3600

const NAV_PAGE_SIZE = 500

function citableUnit(page: number): Record<string, unknown> {
  return {
    identifier: String(page),
    '@type': 'CitableUnit',
    level: 1,
    parent: null,
    citeType: 'page',
    dublinCore: { title: `p. ${page}` },
  }
}

export async function GET(request: NextRequest) {
  ensureEnv()
  const base = dtsBase(getHost(request))
  const { searchParams } = new URL(request.url)

  const resource = searchParams.get('resource')
  if (!resource) return dtsError(400, 'Missing required parameter: resource')
  if (!isValidId(resource)) return dtsError(400, 'Invalid resource')

  const ref = searchParams.get('ref')
  const start = searchParams.get('start')
  const end = searchParams.get('end')
  const pageParam = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  if (ref && (start || end)) return dtsError(400, 'ref must not be combined with start/end')
  if ((start && !end) || (end && !start)) return dtsError(400, 'start and end must be used together')

  try {
    const rec = await fetchBib(resource)
    if (!rec) return dtsError(404, 'Resource not found', resource)
    const b = rec.source

    let pageCount = typeof b.page_count === 'number' ? b.page_count : 0
    if (!pageCount && typeof b.omeka_id === 'number') {
      const pages = await fetchPages(b.omeka_id)
      pageCount = pages.length ? Math.max(...pages.map((p) => p.page)) : 0
    }
    if (!pageCount) return dtsError(404, 'No citable units (no pages) for resource', resource)

    const resourceObj: Record<string, unknown> = {
      '@id': resource,
      '@type': 'Resource',
      title: b.title || resource,
      totalParents: 1,
      ...resourceTemplates(base, resource),
      dublinCore: bibToDublinCore(resource, b),
      citationTrees: pageCitationTrees(),
    }

    const body: Record<string, unknown> = {
      '@context': DTS_CONTEXT,
      dtsVersion: DTS_VERSION,
      '@id': `${base}/navigation?${searchParams.toString()}`,
      '@type': 'Navigation',
      resource: resourceObj,
    }

    // Single reference -> echo that unit, no member list.
    if (ref) {
      const n = parseInt(ref, 10)
      if (!Number.isInteger(n) || n < 1 || n > pageCount) {
        return dtsError(404, 'Reference out of range', `ref=${ref} (1..${pageCount})`)
      }
      body.ref = citableUnit(n)
      return json(body)
    }

    // Determine the page window.
    let lo = 1
    let hi = pageCount
    if (start && end) {
      lo = parseInt(start, 10)
      hi = parseInt(end, 10)
      if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 1 || hi > pageCount || lo > hi) {
        return dtsError(404, 'Range out of bounds', `start=${start} end=${end} (1..${pageCount})`)
      }
      body.start = citableUnit(lo)
      body.end = citableUnit(hi)
    }

    const all: number[] = []
    for (let n = lo; n <= hi; n++) all.push(n)

    // Paginate the member list when large.
    const total = all.length
    const totalPages = Math.max(1, Math.ceil(total / NAV_PAGE_SIZE))
    const slice = all.slice((pageParam - 1) * NAV_PAGE_SIZE, pageParam * NAV_PAGE_SIZE)
    body.member = slice.map(citableUnit)

    if (totalPages > 1) {
      const pageUrl = (p: number) => {
        const u = new URLSearchParams(searchParams)
        u.set('page', String(p))
        return `${base}/navigation?${u.toString()}`
      }
      body.view = {
        '@id': pageUrl(pageParam),
        '@type': 'PartialCollectionView',
        first: pageUrl(1),
        last: pageUrl(totalPages),
        ...(pageParam > 1 ? { previous: pageUrl(pageParam - 1) } : {}),
        ...(pageParam < totalPages ? { next: pageUrl(pageParam + 1) } : {}),
        totalItems: total,
      }
    }

    return json(body)
  } catch (err) {
    console.error('DTS navigation error:', err)
    return dtsError(500, 'Internal error')
  }
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: dtsHeaders() })
}
