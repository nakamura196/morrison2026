import { Metadata } from 'next'
import { config } from '@/config'
import { getConfig } from '@/libs/getConfig'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://morrison.vercel.app'
const origin = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`

const twitter = '@toyobunko_m'

// Default metadata (Japanese)
export const defaultMetadata: Metadata = {
  title: config.siteName,
  description: config.siteDescription,
  openGraph: {
    title: config.siteName,
    description: config.siteDescription,
    url: origin,
    type: 'website',
    siteName: config.siteName,
  },
  twitter: {
    card: 'summary',
    site: twitter,
    creator: twitter,
    title: config.siteName,
    description: config.siteDescription,
  },
}

// Locale-aware metadata generator
export async function getDefaultMetadata(locale: string = 'ja'): Promise<Metadata> {
  const localeConfig = await getConfig(locale)

  return {
    title: localeConfig.siteName,
    description: localeConfig.siteDescription,
    openGraph: {
      title: localeConfig.siteName,
      description: localeConfig.siteDescription,
      url: origin,
      type: 'website',
      siteName: localeConfig.siteName,
    },
    twitter: {
      card: 'summary',
      site: twitter,
      creator: twitter,
      title: localeConfig.siteName,
      description: localeConfig.siteDescription,
    },
  }
}
