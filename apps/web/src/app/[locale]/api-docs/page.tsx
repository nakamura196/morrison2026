import Common from '@/components/layout/Common'
import { getTranslations } from 'next-intl/server'
import SwaggerUIClient from './SwaggerUIClient'

export default async function ApiDocsPage() {
  const t = await getTranslations('ApiDocsPage')

  return (
    <Common title={t('title')}>
      <div className="max-w-5xl mx-auto">
        <p className="text-ink-muted mb-6">{t('description')}</p>
        <SwaggerUIClient />
      </div>
    </Common>
  )
}
