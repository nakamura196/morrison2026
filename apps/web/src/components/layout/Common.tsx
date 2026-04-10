import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import BreadcrumbClient from '@/components/layout/BreadcrumbClient'
import { getTranslations } from 'next-intl/server'

export default async function Common({
  children,
  title,
  breadcrumbs,
  isFullWidth = false,
}: {
  children: React.ReactNode
  title: string
  breadcrumbs?: {
    href: string
    label: string
  }[]
  isFullWidth?: boolean
}) {
  const t = await getTranslations('Breadcrumb')

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Header />

      <main className="flex-1">
        <div
          className={`mx-auto ${
            isFullWidth
              ? 'container-fluid px-4 sm:px-6 lg:px-12 xl:px-16 2xl:px-20'
              : 'max-w-7xl px-4 sm:px-6 lg:px-8'
          } py-8 sm:py-12`}
        >
          <div className="mb-8">
            <BreadcrumbClient
              title={title}
              items={breadcrumbs}
              t={{
                home: t('home'),
                ariaLabel: t('ariaLabel'),
              }}
            />
          </div>

          {title && (
            <div className="text-center mb-12">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4 tracking-tight">
                {title}
              </h1>
              <div className="flex items-center justify-center space-x-2">
                <div className="h-1 w-12 bg-gray-400/30 dark:bg-gray-500/30 rounded-full" />
                <div className="h-1 w-20 bg-gray-500 dark:bg-gray-400 rounded-full" />
                <div className="h-1 w-12 bg-gray-400/30 dark:bg-gray-500/30 rounded-full" />
              </div>
            </div>
          )}

          {children}
        </div>
      </main>

      <Footer />
    </div>
  )
}
