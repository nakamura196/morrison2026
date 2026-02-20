import Common from '@/components/layout/Common'
import { getContent } from '@/libs/content'
import { getTranslations } from 'next-intl/server'
import ReactMarkdown from 'react-markdown'

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('AboutPage')
  const content = getContent('about', locale)

  // Remove the first heading line (rendered as page title via Common)
  const bodyContent = content.replace(/^#\s+.+\n+/, '')

  return (
    <Common title={t('title')}>
      <div className="max-w-3xl mx-auto">
        <article className="prose prose-gray dark:prose-invert prose-lg max-w-none">
          <ReactMarkdown>{bodyContent}</ReactMarkdown>
        </article>
      </div>
    </Common>
  )
}
