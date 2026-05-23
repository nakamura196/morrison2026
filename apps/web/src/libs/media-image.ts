/**
 * Clean PTIF thumbnails served from s3ds via Cantaloupe (media.toyobunko-lab.jp).
 *
 * Thumbnails are derived from the callNumber + page (no Omeka), so they survive
 * ES rebuilds and need no stored `thumbnail_urls`. Identifier mirrors the
 * manifest route: `morrison_p/<group>/<callNumber>/<NNNN>.tif`.
 *
 * NEXT_PUBLIC_ prefix so client components (search UI) can use it too.
 */
const MEDIA_IIIF_BASE = (
  process.env.NEXT_PUBLIC_MEDIA_IIIF_BASE || 'https://media.toyobunko-lab.jp/iiif/3'
).replace(/\/+$/, '')

/** s3ds clean-PTIF identifier for a page (default page 1). */
export function mediaImageId(callNumber: string, page: number | string = 1): string {
  const group = callNumber.split('-').slice(0, 2).join('-')
  const nnnn = String(page).padStart(4, '0')
  return `morrison_p/${group}/${callNumber}/${nnnn}.tif`
}

/**
 * IIIF thumbnail URL for one page of an item's clean PTIF.
 * `size` is the bounding box (Cantaloupe `full/!{size},{size}`).
 * Returns '' when callNumber is missing so callers can conditionally render.
 */
export function mediaThumbUrl(callNumber: string | undefined, page: number | string = 1, size = 300): string {
  if (!callNumber) return ''
  return `${MEDIA_IIIF_BASE}/${encodeURIComponent(mediaImageId(callNumber, page))}/full/!${size},${size}/0/default.jpg`
}
