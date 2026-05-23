import { Metadata } from 'next'
import { config } from '@/config'
import { getConfig } from '@/libs/getConfig'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://morrison.toyobunko-lab.jp'
const origin = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`

const twitter = '@toyobunko_m'

// Social share card. The PNGs live in src/app (file-based metadata) and are
// served at these stable paths; we reference them explicitly so the og:image /
// twitter:image survive metadata merging when child segments (e.g. the item
// page) set their own openGraph/twitter objects. metadataBase makes them
// absolute for crawlers.
const ogImage = {
  url: '/opengraph-image.png',
  width: 1200,
  height: 630,
  alt: config.siteName,
}

// Default metadata (Japanese)
export const defaultMetadata: Metadata = {
  // Resolves relative URLs (including the OG/Twitter images) to absolute.
  metadataBase: new URL(origin),
  title: config.siteName,
  description: config.siteDescription,
  openGraph: {
    title: config.siteName,
    description: config.siteDescription,
    url: origin,
    type: 'website',
    siteName: config.siteName,
    images: [ogImage],
  },
  twitter: {
    card: 'summary_large_image',
    site: twitter,
    creator: twitter,
    title: config.siteName,
    description: config.siteDescription,
    images: ['/twitter-image.png'],
  },
}

// Locale-aware metadata generator
export async function getDefaultMetadata(locale: string = 'ja'): Promise<Metadata> {
  const localeConfig = await getConfig(locale)

  return {
    metadataBase: new URL(origin),
    title: localeConfig.siteName,
    description: localeConfig.siteDescription,
    openGraph: {
      title: localeConfig.siteName,
      description: localeConfig.siteDescription,
      url: origin,
      type: 'website',
      siteName: localeConfig.siteName,
      images: [{ ...ogImage, alt: localeConfig.siteName }],
    },
    twitter: {
      card: 'summary_large_image',
      site: twitter,
      creator: twitter,
      title: localeConfig.siteName,
      description: localeConfig.siteDescription,
      images: ['/twitter-image.png'],
    },
  }
}
