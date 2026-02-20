/**
 * Shared IIIF utilities for building Presentation API v2/v3 manifests
 */

// ===== Types =====

export interface IIIFCanvasImage {
  /** URL to the image (full resolution) */
  imageUrl: string
  /** IIIF Image API service URL (if available) */
  serviceUrl?: string
  /** Image width in pixels */
  width: number
  /** Image height in pixels */
  height: number
  /** Image format */
  format?: string
  /** Thumbnail URL */
  thumbnailUrl?: string
}

export interface IIIFManifestOptions {
  /** Manifest ID (full URL) */
  id: string
  /** Label for the manifest */
  label: string
  /** Attribution text */
  attribution?: string
  /** License URL */
  license?: string
  /** Metadata key-value pairs */
  metadata?: { label: string; value: string }[]
  /** Canvas images */
  canvases: IIIFCanvasImage[]
  /** API prefix for canvas/annotation IDs */
  prefix: string
  /** Viewing direction */
  viewingDirection?: 'left-to-right' | 'right-to-left'
  /** IIIF Search service URL (if available) */
  searchServiceUrl?: string
  /** Whether images have IIIF Image API service */
  hasImageService?: boolean
}

export interface IIIFAnnotation {
  '@id': string
  '@type': 'oa:Annotation'
  motivation: string
  resource: {
    '@type': string
    chars: string
  }
  on: string
}

// ===== Host/URL Helpers =====

/**
 * Get the host URL from a request, using NEXT_PUBLIC_SITE_URL as fallback
 */
export function getHost(request: Request): string {
  const requestUrl = new URL(request.url)
  return process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin
}

// ===== ES Search Helper =====

/**
 * Execute an Elasticsearch/OpenSearch search query
 */
export async function esSearch(
  index: string,
  query: Record<string, unknown>,
): Promise<{
  hits: {
    total: { value: number }
    hits: Array<{
      _id: string
      _source: Record<string, unknown>
      inner_hits?: Record<string, { hits: { hits: Array<{ _source: Record<string, unknown>; highlight?: Record<string, string[]> }> } }>
    }>
  }
  error?: unknown
}> {
  const esHost = process.env.ES_HOST || process.env.ES_URL || ''
  const esUsername = process.env.ES_USERNAME || ''
  const esPassword = process.env.ES_PASSWORD || ''

  const auth = Buffer.from(`${esUsername}:${esPassword}`).toString('base64')

  const response = await fetch(`${esHost}/${index}/_search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(query),
  })

  return response.json()
}

// ===== IIIF Cache Headers =====

/**
 * Create standard IIIF cache and CORS headers
 */
export function createIIIFHeaders(contentType = 'application/json'): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
    'Access-Control-Allow-Origin': '*',
  }
}

// ===== Canvas Builder =====

/**
 * Build a IIIF Presentation API v2 canvas
 *
 * If the image has a serviceUrl, a IIIF Image API service block is added
 * regardless of the hasImageService flag (per-image check).
 */
export function buildCanvas(
  image: IIIFCanvasImage,
  index: number,
  prefix: string,
  _hasImageService = false,
): Record<string, unknown> {
  const page = index + 1
  const canvasId = `${prefix}/canvas/p${page}`

  const imageResource: Record<string, unknown> = {
    '@id': image.imageUrl,
    '@type': 'dctypes:Image',
    format: image.format || 'image/jpeg',
    height: image.height,
    width: image.width,
  }

  // Add IIIF Image API service if this image has a service URL
  if (image.serviceUrl) {
    imageResource.service = {
      '@context': 'http://iiif.io/api/image/2/context.json',
      '@id': image.serviceUrl,
      profile: 'http://iiif.io/api/image/2/level2.json',
    }
  }

  const canvas: Record<string, unknown> = {
    '@id': canvasId,
    '@type': 'sc:Canvas',
    label: `[${page}]`,
    height: image.height,
    width: image.width,
    images: [
      {
        '@id': `${prefix}/annotation/p${page}-image`,
        '@type': 'oa:Annotation',
        motivation: 'sc:painting',
        resource: imageResource,
        on: canvasId,
      },
    ],
  }

  // Add thumbnail
  if (image.thumbnailUrl) {
    canvas.thumbnail = [
      {
        '@id': image.thumbnailUrl,
        '@type': 'dctypes:Image',
        format: 'image/jpeg',
      },
    ]
  } else if (image.serviceUrl) {
    canvas.thumbnail = [
      {
        '@id': `${image.serviceUrl}/full/!200,200/0/default.jpg`,
        '@type': 'dctypes:Image',
        format: 'image/jpeg',
        height: 200,
        width: 200,
      },
    ]
  }

  return canvas
}

// ===== Manifest Builder =====

/**
 * Build a IIIF Presentation API v2 manifest
 */
export function buildManifestV2(options: IIIFManifestOptions): Record<string, unknown> {
  const canvases = options.canvases.map((image, index) =>
    buildCanvas(image, index, options.prefix, options.hasImageService),
  )

  const manifest: Record<string, unknown> = {
    '@context': 'http://iiif.io/api/presentation/2/context.json',
    '@type': 'sc:Manifest',
    '@id': options.id,
    label: options.label,
    attribution: options.attribution || '東洋文庫 / Toyo Bunko',
    license: options.license || 'https://creativecommons.org/licenses/by/4.0/',
    metadata: options.metadata || [],
    sequences: [
      {
        '@id': `${options.prefix}/sequence/normal`,
        '@type': 'sc:Sequence',
        canvases,
        viewingDirection: options.viewingDirection || 'left-to-right',
      },
    ],
  }

  // Add search service
  if (options.searchServiceUrl) {
    manifest.service = [
      {
        '@context': 'http://iiif.io/api/search/0/context.json',
        '@id': options.searchServiceUrl,
        profile: 'http://iiif.io/api/search/0/search',
        label: 'Search within this manifest',
      },
    ]
  }

  return manifest
}

// ===== Annotation List Builder =====

/**
 * Build a IIIF Annotation List (for search results or canvas annotations)
 */
export function buildAnnotationList(
  id: string,
  annotations: IIIFAnnotation[],
): Record<string, unknown> {
  return {
    '@context': 'http://iiif.io/api/presentation/2/context.json',
    '@id': id,
    '@type': 'sc:AnnotationList',
    within: {
      '@type': 'sc:Layer',
      total: annotations.length,
    },
    resources: annotations,
  }
}
