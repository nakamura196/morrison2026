/**
 * IIIF annotations for a single canvas — OCR / transcription text layer.
 *
 * GET /api/iiif/:version/:id/annotations/:canvas
 *   id     = callNumber
 *   canvas = canvas name from the manifest (e.g. "p1"); the trailing number is
 *            the page (= media order = clean-PTIF NNNN).
 *
 * Returns the page's OCR text as a IIIF **Presentation 3 AnnotationPage**.
 * Morrison standardises on Presentation 3 for the text layer, so this is v3
 * regardless of the `:version` segment, and only the v3 manifest references it
 * (see ../../manifest/route.ts; canvases get an `annotations` entry when the
 * item has `has_fulltext`).
 *
 * Granularity follows the data: when the chosen `morrison` doc has per-line
 * bboxes (`coords.lines`), each line becomes a `supplementing` annotation
 * targeting `canvas#xywh=...`; otherwise the whole page's text is returned as a
 * single annotation on the canvas. `coords` is `enabled:false` (stored in
 * _source, not indexed), present for the OCR'd pages; the bbox space matches the
 * canvas/source pixels (coords.w == image width), so `xywh` needs no scaling.
 */

import { NextRequest } from 'next/server'
import { getHost, esSearch, createIIIFHeaders } from '@toyo/shared-lib'
import { ensureEnv } from '@/libs/cf-env'

export const revalidate = 3600

const BIB_INDEX = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'
const OCR_INDEX = process.env.FULLTEXT_INDEX_NAME || 'morrison'

interface OcrLine {
  t: string
  x: number
  y: number
  w: number
  h: number
}
interface OcrSource {
  text?: string
  coords?: { w?: number; h?: number; lines?: OcrLine[] }
}

/** Canvas name → page number. Accepts "p12", "12", "canvas/p12". */
function canvasToPage(canvas: string): number | null {
  const m = /(\d+)\s*$/.exec(canvas)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) && n > 0 ? n : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ version: string; id: string; canvas: string }> },
) {
  ensureEnv()
  const { version, id, canvas } = await params
  const host = getHost(request)

  const pageId = `${host}/api/iiif/${version}/${id}/annotations/${canvas}`
  const canvasId = `${host}/api/iiif/${version}/${id}/canvas/${canvas}`

  const annotationPage = (items: unknown[]): Record<string, unknown> => ({
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id: pageId,
    type: 'AnnotationPage',
    items,
  })
  const respond = (body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { headers: createIIIFHeaders() })

  const page = canvasToPage(canvas)
  if (page == null) return respond(annotationPage([]))

  // callNumber → omeka_id (the OCR index keys pages by omeka_id, not callNumber)
  const bib = await esSearch(BIB_INDEX, {
    query: { ids: { values: [id] } },
    size: 1,
    _source: ['omeka_id'],
  })
  const omekaId = bib.hits.hits[0]?._source?.omeka_id
  if (omekaId == null) return respond(annotationPage([]))

  // Fetch this page's OCR. The `page` field has mixed int/string types and
  // occasional duplicates (e.g. one doc has text only, another has bboxes), so
  // query the keyword subfield and pick the richest doc: prefer the one with
  // the most line bboxes (line-level overlay), then the longest text.
  const ocr = await esSearch(OCR_INDEX, {
    size: 10,
    _source: ['text', 'coords'],
    query: {
      bool: {
        must: [
          { term: { item_id: String(omekaId) } },
          { term: { 'page.keyword': String(page) } },
        ],
      },
    },
  })
  const docs = ocr.hits.hits.map((h) => h._source as OcrSource)
  const lineCount = (d: OcrSource) => (Array.isArray(d.coords?.lines) ? d.coords!.lines!.length : 0)
  const best = docs
    .slice()
    .sort((a, b) => lineCount(b) - lineCount(a) || (b.text?.length || 0) - (a.text?.length || 0))[0]
  if (!best) return respond(annotationPage([]))

  const lines = Array.isArray(best.coords?.lines)
    ? best.coords!.lines!.filter((l) => l?.t && l.t.trim().length > 0)
    : []
  // Nothing usable on this page (no bbox lines and no page text).
  if (lines.length === 0 && !best.text) return respond(annotationPage([]))
  const xywh = (l: OcrLine) =>
    `${Math.round(l.x)},${Math.round(l.y)},${Math.round(l.w)},${Math.round(l.h)}`

  const items =
    lines.length > 0
      ? lines.map((l, i) => ({
          id: `${pageId}/line-${i + 1}`,
          type: 'Annotation',
          motivation: 'supplementing',
          body: { type: 'TextualBody', value: l.t, format: 'text/plain' },
          target: `${canvasId}#xywh=${xywh(l)}`,
        }))
      : [
          {
            id: `${pageId}/text`,
            type: 'Annotation',
            motivation: 'supplementing',
            body: { type: 'TextualBody', value: best.text, format: 'text/plain' },
            target: canvasId,
          },
        ]

  return respond(annotationPage(items))
}
