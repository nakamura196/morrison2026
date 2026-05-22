import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import { Link } from '@/i18n/routing'
import { getTranslations } from 'next-intl/server'
import { getConfig } from '@/libs/getConfig'

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('HomePage')
  const config = await getConfig(locale)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero section — photo-forward with a fixed enji wash (no theme flip). */}
      <div className="relative bg-enji-900">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/images/hero-bg.jpg)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-enji-950/45 via-enji-900/50 to-enji-950/80" />
        <div className="relative flex items-center justify-center px-4 sm:px-6 md:px-8 py-24 sm:py-32 md:py-40">
          <div className="w-full max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-balance text-white drop-shadow-lg">
              {config.siteName}
            </h1>
            <p className="text-lg sm:text-xl text-white/90 max-w-prose mx-auto leading-relaxed drop-shadow">
              {config.siteDescription}
            </p>

            <div className="flex items-center justify-center mt-8">
              <Link
                href="/search"
                className="inline-flex items-center justify-center px-8 py-3 bg-white text-enji-700 font-sans font-medium rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-lg text-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {t('startSearch')}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
