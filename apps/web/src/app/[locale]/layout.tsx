import BackToTopButtonClient from '@/components/layout/BackToTopButtonClient'
import { GoogleAnalytics } from '@toyo/shared-ui'
import { BIZ_UDPGothic, BIZ_UDPMincho, EB_Garamond } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import './globals.css'

const GA_TAG_ID = process.env.NEXT_PUBLIC_GA_ID || ''

// Toyo Bunko web fonts. Phase 1: mirrors @toyo/design-system/fonts (inlined
// until the design-system package is wired as a dependency).
//
// preload: false — Google splits the Japanese faces into ~120 unicode-range
// files per weight, and next/font preloaded nearly all of them: 197 preload
// links, 245 files / 5.7 MB on every page, which held back the page's JS (the
// viewer started ~3.3 s in). Without preload the browser fetches only the
// ranges the rendered text actually uses.
const bizGothic = BIZ_UDPGothic({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-biz-gothic',
})

const bizMincho = BIZ_UDPMincho({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-biz-mincho',
})

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-eb-garamond',
})

import ThemeProvider from '@/theme/theme-provider'
import { Suspense } from 'react'
import { getDefaultMetadata } from '@/libs/metadata'
import type { Metadata, Viewport } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return await getDefaultMetadata(locale)
}

// Tints the mobile browser chrome to match the page surface in each scheme.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f0ed' },
    { media: '(prefers-color-scheme: dark)', color: '#1c1a18' },
  ],
}

export default async function RootLayout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>
  children: React.ReactNode
}) {
  const { locale } = await params
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>{GA_TAG_ID ? (
        <Suspense>
          <GoogleAnalytics gaTagId={GA_TAG_ID} />
        </Suspense>
      ) : null}</head>
      <body className={`${bizGothic.variable} ${bizMincho.variable} ${ebGaramond.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            {children}
            <BackToTopButtonClient />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
