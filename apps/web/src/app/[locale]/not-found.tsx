import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/routing'
import Common from '@/components/layout/Common'

/**
 * Not-found for any unmatched route under a locale (e.g. /item with no id).
 * Rendering it here — inside [locale]/layout — gives it the <html>/<body>
 * chrome; without it Next falls back to the bare root layout and throws
 * "Missing <html> and <body> tags in the root layout".
 */
export default async function NotFound() {
  const t = await getTranslations('Common')
  return (
    <Common title="404">
      <div className="py-12 text-center">
        <p className="text-lg text-gray-600 dark:text-gray-400">{t('notFound')}</p>
        <Link href="/" className="mt-6 inline-block text-brand hover:underline">
          {t('backHome')}
        </Link>
      </div>
    </Common>
  )
}
