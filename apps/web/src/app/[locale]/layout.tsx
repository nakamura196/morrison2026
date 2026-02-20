import BackToTopButtonClient from '@/components/layout/BackToTopButtonClient'
import { GoogleAnalytics } from '@toyo/shared-ui'
import { Noto_Sans_JP, Noto_Sans } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import './globals.css'

const GA_TAG_ID = process.env.NEXT_PUBLIC_GA_ID || ''

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-noto-sans-jp',
})

const notoSans = Noto_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-noto-sans',
})

import ThemeProvider from '@/theme/theme-provider'
import { Suspense } from 'react'
import { getDefaultMetadata } from '@/libs/metadata'
import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  return await getDefaultMetadata(locale)
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
      <body className={`${notoSans.variable} ${notoSansJP.variable} font-sans`}>
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
