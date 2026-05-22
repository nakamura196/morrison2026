import { notFound } from 'next/navigation'

/**
 * Catch-all for unmatched paths under a locale (e.g. /item with no id, or any
 * typo'd route). Funnelling them through the [locale] segment means the 404
 * renders via [locale]/not-found.tsx inside [locale]/layout (which provides
 * <html>/<body>), instead of falling back to the bare root layout and throwing
 * "Missing <html> and <body> tags in the root layout". Specific routes take
 * priority over this catch-all, so only genuine 404s land here.
 */
export default function CatchAllNotFound(): never {
  notFound()
}
