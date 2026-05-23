'use client'

import dynamic from 'next/dynamic'
import type { OcrPage } from './BookViewer'

// OpenSeadragon touches `window` at import time, so load the viewer client-only.
// `loading` reserves the viewer's full height from the first paint so the page
// doesn't jump when the client-only component (and then the image) arrives.
const BookViewer = dynamic(() => import('./BookViewer'), {
  ssr: false,
  loading: () => (
    <div className="mb-6 h-[calc(100vh-12rem)] min-h-[420px] rounded-lg border border-gray-200 dark:border-gray-700" />
  ),
})

interface ItemViewerProps {
  /** callNumber (morrison_bib _id) — used to fetch the IIIF manifest. */
  itemId: string
  /** OCR text + line bboxes per page, from the morrison index. */
  ocrPages: OcrPage[]
  /** 1-indexed document page to open at (from a full-text search hit). */
  initialPage?: number
  /** search term to highlight on arrival. */
  searchQuery?: string | null
}

export default function ItemViewer({ itemId, ocrPages, initialPage, searchQuery }: ItemViewerProps) {
  return (
    <div className="rounded-lg overflow-hidden">
      <BookViewer
        itemId={itemId}
        ocrPages={ocrPages}
        initialPage={initialPage}
        query={searchQuery}
      />
    </div>
  )
}
