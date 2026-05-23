/**
 * DTS 1.0 Collection endpoint.
 *
 * GET /api/dts/collection?id=&page=&nav=
 *
 * Three-level hierarchy backed by Elasticsearch:
 *   - root  (no id / id=morrison) -> child Collections = call-number groups (P-I … P-XVII)
 *   - group (id=P-III)            -> child Resources   = items in that group (paginated)
 *   - item  (id=P-III-a-0083)     -> a single readable Resource description
 *
 * `morrison_bib` has no `group` field, so groups are derived from callNumber.
 * Spec: https://dtsapi.org/specifications/versions/v1.0/
 */

import { NextRequest } from 'next/server'
import { getHost } from '@toyo/shared-lib'
import { ensureEnv } from '@/libs/cf-env'
import {
  DTS_CONTEXT,
  DTS_VERSION,
  ROOT_ID,
  ROOT_TITLE,
  dtsBase,
  dtsHeaders,
  dtsError,
  classifyId,
  isValidId,
  uriTemplates,
  resourceTemplates,
  collectionLink,
  buildGroupMember,
  buildResourceMember,
  bibToDublinCore,
  bibToExtensions,
  pageCitationTrees,
} from '@/libs/dts'
import { fetchGroups, fetchItemsInGroup, fetchBib } from '@/libs/dts-data'

export const revalidate = 3600

const GROUP_PAGE_SIZE = 100

export async function GET(request: NextRequest) {
  ensureEnv()
  const base = dtsBase(getHost(request))
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const nav = searchParams.get('nav') || 'children'
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)

  if (id && !isValidId(id)) return dtsError(400, 'Invalid id')
  if (nav !== 'children' && nav !== 'parents') return dtsError(400, 'Invalid nav (expected children|parents)')

  const kind = classifyId(id)

  try {
    if (kind === 'root') return await rootCollection(base, nav)
    if (kind === 'group') return await groupCollection(base, id as string, nav, page, searchParams)
    return await itemResource(base, id as string, nav)
  } catch (err) {
    console.error('DTS collection error:', err)
    return dtsError(500, 'Internal error')
  }
}

/** Root: members are the call-number groups. */
async function rootCollection(base: string, nav: string): Promise<Response> {
  const t = uriTemplates(base)
  if (nav === 'parents') {
    return json({
      '@context': DTS_CONTEXT,
      dtsVersion: DTS_VERSION,
      '@id': ROOT_ID,
      '@type': 'Collection',
      title: ROOT_TITLE,
      totalParents: 0,
      totalChildren: 0,
      collection: t.collection,
      member: [],
    })
  }
  const groups = await fetchGroups()
  return json({
    '@context': DTS_CONTEXT,
    dtsVersion: DTS_VERSION,
    '@id': ROOT_ID,
    '@type': 'Collection',
    title: ROOT_TITLE,
    totalParents: 0,
    totalChildren: groups.length,
    collection: t.collection,
    member: groups.map((g) => buildGroupMember(base, g.group, g.count)),
  })
}

/** Group: members are the items whose callNumber starts with `<group>-` (paginated). */
async function groupCollection(
  base: string,
  group: string,
  nav: string,
  page: number,
  searchParams: URLSearchParams,
): Promise<Response> {
  const t = uriTemplates(base)
  if (nav === 'parents') {
    return json({
      '@context': DTS_CONTEXT,
      dtsVersion: DTS_VERSION,
      '@id': group,
      '@type': 'Collection',
      title: group,
      totalParents: 1,
      totalChildren: 0,
      collection: t.collection,
      member: [{ '@id': ROOT_ID, '@type': 'Collection', title: ROOT_TITLE, totalParents: 0, collection: collectionLink(base, ROOT_ID) }],
    })
  }

  const from = (page - 1) * GROUP_PAGE_SIZE
  const { total, items } = await fetchItemsInGroup(group, from, GROUP_PAGE_SIZE)
  if (total === 0) return dtsError(404, 'Collection not found', `No items for group ${group}`)

  const totalPages = Math.max(1, Math.ceil(total / GROUP_PAGE_SIZE))
  const body: Record<string, unknown> = {
    '@context': DTS_CONTEXT,
    dtsVersion: DTS_VERSION,
    '@id': group,
    '@type': 'Collection',
    title: group,
    totalParents: 1,
    totalChildren: total,
    collection: t.collection,
    member: items.map((it) => buildResourceMember(base, it.callNumber, it.source)),
  }

  if (totalPages > 1) {
    const pageUrl = (p: number) => {
      const u = new URLSearchParams(searchParams)
      u.set('id', group)
      u.set('page', String(p))
      return `${base}/collection?${u.toString()}`
    }
    body.view = {
      '@id': pageUrl(page),
      '@type': 'PartialCollectionView',
      first: pageUrl(1),
      last: pageUrl(totalPages),
      ...(page > 1 ? { previous: pageUrl(page - 1) } : {}),
      ...(page < totalPages ? { next: pageUrl(page + 1) } : {}),
      totalItems: total,
    }
  }

  return json(body)
}

/** Item: a single readable Resource description. */
async function itemResource(base: string, callNumber: string, nav: string): Promise<Response> {
  const rec = await fetchBib(callNumber)
  if (!rec) return dtsError(404, 'Resource not found', callNumber)
  const b = rec.source
  const group = callNumber.split('-').slice(0, 2).join('-')

  if (nav === 'parents') {
    return json({
      '@context': DTS_CONTEXT,
      dtsVersion: DTS_VERSION,
      '@id': callNumber,
      '@type': 'Resource',
      title: b.title || callNumber,
      totalParents: 1,
      ...resourceTemplates(base, callNumber),
      member: [{ '@id': group, '@type': 'Collection', title: group, totalParents: 1, collection: collectionLink(base, group) }],
    })
  }

  const ext = bibToExtensions(b)
  return json({
    '@context': DTS_CONTEXT,
    dtsVersion: DTS_VERSION,
    '@id': callNumber,
    '@type': 'Resource',
    title: b.title || callNumber,
    totalParents: 1,
    ...resourceTemplates(base, callNumber),
    dublinCore: bibToDublinCore(callNumber, b),
    ...(ext ? { extensions: ext } : {}),
    citationTrees: pageCitationTrees(),
  })
}

function json(body: unknown): Response {
  return new Response(JSON.stringify(body), { headers: dtsHeaders() })
}
