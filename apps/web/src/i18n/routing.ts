import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'ja'],

  // Used when no locale matches
  defaultLocale: 'ja',

  // Default locale is accessible without prefix
  localePrefix: 'as-needed',

  // The URL alone decides the language: /en/... is English, everything else
  // is Japanese. With detection on, the NEXT_LOCALE cookie redirected
  // unprefixed URLs to /en — and link prefetches of /en/... pages rewrote
  // that cookie right after switching to Japanese, bouncing users back.
  localeDetection: false,
})

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
