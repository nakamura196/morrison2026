import Common from '@/components/layout/Common'
import { getNewsItems } from '@/libs/content'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import { HiCalendar, HiChevronRight } from 'react-icons/hi'

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
        {items.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">
            {t('noNews')}
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <Link key={item.slug} href={`/news/${item.slug}`} className="block group">
                <div className="flex items-center justify-between p-4 rounded-lg bg-surface-raised hover:bg-brand-soft transition-colors border border-line">
                  <div className="flex items-start space-x-4">
                    <div className="flex items-center text-ink-muted shrink-0">
                      <HiCalendar className="w-5 h-5 mr-2" />
                      <time dateTime={item.date} className="font-display">{item.date}</time>
                    </div>
                    <h3 className="text-ink group-hover:text-brand transition-colors">
                      {item.title}
                    </h3>
                  </div>
                  <HiChevronRight className="w-5 h-5 text-ink-subtle group-hover:text-brand transition-colors shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Common>
  )
}
