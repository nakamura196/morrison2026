'use client'

import { MiradorViewer } from '@toyo/shared-ui'
import { useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'

export default function MiradorPage() {
  const searchParams = useSearchParams()
  const locale = useLocale()

  const manifestUrl = searchParams.get('iiif-content') || ''
  const canvasId = searchParams.get('canvas') || undefined
  const searchQuery = searchParams.get('q') || undefined

  if (!manifestUrl) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">No manifest URL provided.</p>
      </div>
    )
  }

  return (
    <MiradorViewer
      manifestUrl={manifestUrl}
      canvasId={canvasId}
      searchQuery={searchQuery}
      locale={locale}
    />
  )
}
