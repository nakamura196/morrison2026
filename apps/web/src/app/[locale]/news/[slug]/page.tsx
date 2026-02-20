import Common from '@/components/layout/Common'
import { getNewsItem, getNewsItems } from '@/libs/content'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import ReactMarkdown from 'react-markdown'

export function generateStaticParams() {
  const items = getNewsItems('ja')
  return items.map((item) => ({ slug: item.slug }))
}

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const t = await getTranslations('NewsPage')
  const item = getNewsItem(slug, locale)

  if (!item) notFound()

  const breadcrumbs = [
    { href: '/news', label: t('title') },
  ]

  return (
    <Common title={`${item.date} ${item.title}`} breadcrumbs={breadcrumbs}>
      <div className="max-w-3xl mx-auto">
        <article className="prose prose-gray dark:prose-invert prose-lg max-w-none">
          <ReactMarkdown>{item.body}</ReactMarkdown>
        </article>
      </div>
    </Common>
  )
}
