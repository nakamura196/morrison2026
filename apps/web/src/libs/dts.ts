/**
 * Shared helpers for the DTS (Distributed Text Services) 1.0 API.
 *
 * Spec: https://dtsapi.org/specifications/versions/v1.0/
 *
 * Data sources (per project decision, 2026-05-23):
 *   - Collection / Navigation (browse, page references) -> Elasticsearch
 *       morrison_bib (_id = callNumber, has page_count / omeka_id / ne_*) and
 *       morrison (page-level OCR text, _id = <omeka_id>_<n>).
 *   - Document (TEI download) -> S3 canonical TEI when MORRISON_TEI_BASE is
 *       configured (xml/morrison_p/<group>/<callNumber>/tei.xml), otherwise a
 *       valid TEI is generated on the fly from the ES page text. This lets the
 *       endpoint work today (image/TEI migration still in progress) and upgrade
 *       automatically to the NER-enriched canonical TEI once it is uploaded.
 *
 * Citation model: a single flat level of `page` CitableUnits (the corpus is
 * page-imaged pamphlets; the natural reference is the page number).
 */

export const DTS_VERSION = '1.0'
export const DTS_CONTEXT = 'https://dtsapi.org/context/v1.0.json'
/** Namespace for the <dts:wrapper> element used to wrap document fragments. */
export const DTS_XML_NS = 'https://w3id.org/api/dts#'

export const BIB_INDEX = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'
export const FULLTEXT_INDEX = process.env.FULLTEXT_INDEX_NAME || 'morrison'

/** Root collection identifier and human label. */
export const ROOT_ID = 'morrison'
export const ROOT_TITLE = 'Morrison Pamphlets / モリソン文庫'

/**
 * Optional public-gateway base for the canonical TEI (plain GET, no signing).
 * The primary path is a SigV2 signed GET to the object store (see libs/s3.ts);
 * this is only used as a secondary source if such a gateway is ever stood up
 * for the xml/ prefix. Empty by default. Document order: S3 (signed) -> this
 * (if set) -> ES-generated TEI.
 */
export const TEI_BASE = (process.env.MORRISON_TEI_BASE || '').replace(/\/+$/, '')

export const MEDIA_TYPE_TEI = 'application/tei+xml'

/** Group folder = first two hyphen-segments of the callNumber (`P-III-a-0083` -> `P-III`). */
export function deriveGroup(callNumber: string): string {
  const p = callNumber.split('-')
  return p.length >= 2 ? `${p[0]}-${p[1]}` : callNumber
}

/** `morrison` (root) | `P-III` (group, <=2 segments) | `P-III-a-0083` (item resource). */
export type IdKind = 'root' | 'group' | 'resource'

export function classifyId(id: string | null): IdKind {
  if (!id || id === ROOT_ID) return 'root'
  return id.split('-').length <= 2 ? 'group' : 'resource'
}

/** Accept callNumbers / groups / root. Some callNumbers contain parentheses (e.g. `P-III-a-1999(5)`). */
export function isValidId(id: string): boolean {
  return /^[A-Za-z0-9_().-]+$/.test(id) && id.length > 0 && id.length <= 200
}

/** `${host}/api/dts` */
export function dtsBase(host: string): string {
  return `${host}/api/dts`
}

/** Top-level URI templates exposed by the Entry endpoint and collection responses. */
export function uriTemplates(base: string) {
  return {
    collection: `${base}/collection{?id,page,nav}`,
    navigation: `${base}/navigation{?resource,ref,start,end,down,tree,page}`,
    document: `${base}/document{?resource,ref,start,end,tree,mediaType}`,
  }
}

/** Concrete navigable links for an identified collection/resource. */
export function collectionLink(base: string, id: string): string {
  return `${base}/collection?id=${encodeURIComponent(id)}`
}
export function navigationLink(base: string, resource: string): string {
  return `${base}/navigation?resource=${encodeURIComponent(resource)}`
}
export function documentLink(base: string, resource: string): string {
  return `${base}/document?resource=${encodeURIComponent(resource)}`
}

/** The (flat) page citation tree shared by every readable resource. */
export function pageCitationTrees(): Record<string, unknown>[] {
  return [{ '@type': 'CitationTree', citeStructure: [{ citeType: 'page' }] }]
}

/** Resource-scoped URI templates (used at the top level of a Resource response). */
export function resourceTemplates(base: string, resource: string) {
  const r = encodeURIComponent(resource)
  return {
    collection: `${base}/collection{?id,page,nav}`,
    navigation: `${base}/navigation?resource=${r}{&ref,start,end,down,tree,page}`,
    document: `${base}/document?resource=${r}{&ref,start,end,tree,mediaType}`,
  }
}

export function dtsHeaders(contentType = 'application/ld+json'): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    'Access-Control-Allow-Origin': '*',
  }
}

// ===== Member / resource object builders =====

/** A group as a child Collection member of the root. */
export function buildGroupMember(base: string, group: string, childCount: number): Record<string, unknown> {
  return {
    '@id': group,
    '@type': 'Collection',
    title: group,
    totalParents: 1,
    totalChildren: childCount,
    collection: collectionLink(base, group),
  }
}

/** An item as a readable Resource member, with concrete navigation/document links. */
export function buildResourceMember(
  base: string,
  callNumber: string,
  b: BibSource,
): Record<string, unknown> {
  const ext = bibToExtensions(b)
  return {
    '@id': callNumber,
    '@type': 'Resource',
    title: b.title || callNumber,
    totalParents: 1,
    collection: collectionLink(base, callNumber),
    navigation: navigationLink(base, callNumber),
    document: documentLink(base, callNumber),
    dublinCore: bibToDublinCore(callNumber, b),
    ...(ext ? { extensions: ext } : {}),
  }
}

/** RFC 7807-ish DTS error response. */
export function dtsError(status: number, title: string, detail?: string): Response {
  return new Response(
    JSON.stringify({
      '@context': DTS_CONTEXT,
      dtsVersion: DTS_VERSION,
      '@type': 'Error',
      title,
      status,
      ...(detail ? { detail } : {}),
    }),
    { status, headers: dtsHeaders('application/problem+json') },
  )
}

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ===== Bibliographic record (morrison_bib) =====

export interface BibSource {
  title?: string
  titleStatement?: string
  heading1?: string
  publication?: string
  publisher?: string
  date?: string
  publication_year?: string
  description?: string
  language?: string[]
  callNumber?: string
  tag1?: string
  omeka_id?: number
  page_count?: number
  has_image?: boolean
  ne_persName?: string[]
  ne_placeName?: string[]
  ne_orgName?: string[]
  ne_date?: string[]
}

/**
 * Build a DTS `dublinCore` object from a morrison_bib record.
 * Values are plain strings/arrays; `title` carries an optional language tag.
 */
export function bibToDublinCore(callNumber: string, b: BibSource): Record<string, unknown> {
  const dc: Record<string, unknown> = {}
  if (b.title) dc.title = b.title
  if (b.heading1) dc.creator = b.heading1
  if (b.publisher) dc.publisher = b.publisher
  const date = b.publication_year || b.date
  if (date) dc.date = date
  if (b.publication) dc.source = b.publication
  if (b.description) dc.description = b.description
  if (b.language && b.language.length) dc.language = b.language
  if (b.tag1) dc.subject = b.tag1
  dc.identifier = callNumber
  dc.isPartOf = deriveGroup(callNumber)
  dc.type = 'Text'
  dc.publisher = dc.publisher || 'Toyo Bunko'
  dc.rights = 'https://creativecommons.org/licenses/by/4.0/'
  return dc
}

/** Non-DTS-standard but useful extras (NER facets, page count) under `extensions`. */
export function bibToExtensions(b: BibSource): Record<string, unknown> | undefined {
  const ext: Record<string, unknown> = {}
  if (typeof b.page_count === 'number') ext['https://schema.org/numberOfPages'] = b.page_count
  if (typeof b.has_image === 'boolean') ext['https://schema.org/image'] = b.has_image
  const ne: Record<string, string[]> = {}
  if (b.ne_persName?.length) ne.persName = b.ne_persName
  if (b.ne_placeName?.length) ne.placeName = b.ne_placeName
  if (b.ne_orgName?.length) ne.orgName = b.ne_orgName
  if (b.ne_date?.length) ne.date = b.ne_date
  if (Object.keys(ne).length) ext['https://w3id.org/api/dts#namedEntities'] = ne
  return Object.keys(ext).length ? ext : undefined
}

// ===== TEI generation from ES page text =====

export interface PageText {
  page: number
  text: string
}

/** One `<div type="textpart" subtype="page">` per page, lines split into `<lb/>`. */
function pageToDiv(p: PageText): string {
  const lines = (p.text || '').split('\n').map((l) => l.trimEnd())
  const body = lines.length
    ? lines.map((l) => xmlEscape(l)).join('<lb/>\n          ')
    : ''
  return (
    `      <div type="textpart" subtype="page" n="${xmlEscape(String(p.page))}">\n` +
    `        <pb n="${xmlEscape(String(p.page))}"/>\n` +
    `        <ab>${body}</ab>\n` +
    `      </div>`
  )
}

function teiHeader(callNumber: string, b: BibSource): string {
  const title = xmlEscape(b.title || callNumber)
  const author = b.heading1 ? `\n        <author>${xmlEscape(b.heading1)}</author>` : ''
  const lang = (b.language && b.language[0]) || 'en'
  return (
    `  <teiHeader>\n` +
    `    <fileDesc>\n` +
    `      <titleStmt>\n        <title>${title}</title>${author}\n      </titleStmt>\n` +
    `      <publicationStmt>\n` +
    `        <publisher>Toyo Bunko</publisher>\n` +
    `        <availability status="free">\n` +
    `          <licence target="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</licence>\n` +
    `        </availability>\n` +
    `        <idno type="callNumber">${xmlEscape(callNumber)}</idno>\n` +
    `      </publicationStmt>\n` +
    `      <sourceDesc>\n        <p>OCR transcription (Azure Document Intelligence) projected from the morrison page index. Canonical TEI lives on S3.</p>\n      </sourceDesc>\n` +
    `    </fileDesc>\n` +
    `    <profileDesc>\n      <langUsage>\n        <language ident="${xmlEscape(lang)}">${xmlEscape(lang)}</language>\n      </langUsage>\n    </profileDesc>\n` +
    `  </teiHeader>`
  )
}

/** Full TEI document for an item, generated from ES page text. */
export function buildTeiDocument(callNumber: string, b: BibSource, pages: PageText[]): string {
  const divs = pages.map(pageToDiv).join('\n')
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<TEI xmlns="http://www.tei-c.org/ns/1.0">\n` +
    `${teiHeader(callNumber, b)}\n` +
    `  <text>\n    <body>\n      <div type="edition" n="${xmlEscape(callNumber)}">\n` +
    `${divs}\n` +
    `      </div>\n    </body>\n  </text>\n` +
    `</TEI>\n`
  )
}

/** A document fragment (selected pages) wrapped in `<dts:wrapper>` per DTS 1.0. */
export function buildTeiFragment(pages: PageText[]): string {
  const divs = pages.map(pageToDiv).join('\n')
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<TEI xmlns="http://www.tei-c.org/ns/1.0">\n` +
    `  <dts:wrapper xmlns:dts="${DTS_XML_NS}">\n` +
    `${divs}\n` +
    `  </dts:wrapper>\n` +
    `</TEI>\n`
  )
}
