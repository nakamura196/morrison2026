import Common from '@/components/layout/Common'
import NewsList from '@/components/pages/news/NewsList'
import { getNewsItems } from '@/libs/content'
import { getTranslations } from 'next-intl/server'

export default async function NewsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('NewsPage')
  const items = getNewsItems(locale)

  return (
    <Common title={t('title')}>
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-raised rounded-lg border border-line overflow-hidden">
          <NewsList items={items} emptyLabel={t('noNews')} />
        </div>
      </div>
    </Common>
  )
}
