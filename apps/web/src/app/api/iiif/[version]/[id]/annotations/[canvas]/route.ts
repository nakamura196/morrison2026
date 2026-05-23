/**
 * IIIF annotations for a single canvas — PLACEHOLDER.
 *
 * GET /api/iiif/:version/:id/annotations/:canvas
 *   id     = callNumber
 *   canvas = canvas name (e.g. "p1", matching the manifest's canvas IDs)
 *
 * Returns an empty IIIF Presentation 3 AnnotationPage for now. This reserves
 * the URL shape so the manifest can point each canvas at its annotation page
 * ahead of the real implementation (transcription / NER overlays, etc.).
 *
 * NOTE: not yet wired into the manifest and not backed by data — it always
 * returns `items: []`. Fill in the body when the annotation source lands.
 */

import { NextRequest } from 'next/server'
import { getHost, createIIIFHeaders } from '@toyo/shared-lib'

export const revalidate = 3600

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ version: string; id: string; canvas: string }> },
) {
  const { version, id, canvas } = await params
  const host = getHost(request)

  const annotationPage = {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id: `${host}/api/iiif/${version}/${id}/annotations/${canvas}`,
    type: 'AnnotationPage',
    items: [] as unknown[],
  }

  return new Response(JSON.stringify(annotationPage), { headers: createIIIFHeaders() })
}
