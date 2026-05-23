/**
 * Shared item thumbnail frame. Shows the whole image (object-contain) on a
 * padded neutral background so mixed page sizes / orientations aren't cropped.
 * Used by the search result grid and the in-viewer page (コマ) list so both
 * present thumbnails identically. `aspect` picks the frame ratio — portrait
 * (`aspect-[3/4]`, default) for single pages, landscape (`aspect-[4/3]`) for
 * the two-page spreads common in Morrison scans.
 */
export default function Thumb({
  src,
  alt,
  aspect = 'aspect-[3/4]',
  pad = 'p-2',
  className = '',
}: {
  src?: string | null
  alt: string
  aspect?: string
  /** Inner padding around the contained image. Use a smaller value for dense
   *  thumbnail grids (e.g. the viewer's page list). */
  pad?: string
  className?: string
}) {
  return (
    <div
      className={`${aspect} flex items-center justify-center bg-gray-50 ${pad} dark:bg-gray-900/40 ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="max-w-full max-h-full object-contain"
        />
      ) : (
        <span className="text-xs text-gray-400">(no image)</span>
      )}
    </div>
  )
}
