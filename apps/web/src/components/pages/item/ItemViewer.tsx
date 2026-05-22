'use client'

import dynamic from 'next/dynamic'
import type { OcrPage } from './BookViewer'

// OpenSeadragon touches `window` at import time, so load the viewer client-only.
const BookViewer = dynamic(() => import('./BookViewer'), { ssr: false })

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
