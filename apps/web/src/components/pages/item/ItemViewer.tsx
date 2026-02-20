'use client'

import { MiradorViewer } from '@toyo/shared-ui'
import { useLocale } from 'next-intl'

interface ItemViewerProps {
  manifestUrl: string
  searchQuery?: string
}

export default function ItemViewer({ manifestUrl, searchQuery }: ItemViewerProps) {
  const locale = useLocale()

  return (
    <div className="mb-6 rounded-lg overflow-hidden shadow-md border border-gray-200 dark:border-gray-700">
      <MiradorViewer
        manifestUrl={manifestUrl}
        isEmbed
        locale={locale}
        searchQuery={searchQuery}
        height="60vh"
      />
    </div>
  )
}
