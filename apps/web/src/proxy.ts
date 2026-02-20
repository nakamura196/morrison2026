import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

const intlMiddleware = createMiddleware({
  locales: ['ja', 'en'],
  defaultLocale: 'ja',
  localePrefix: 'as-needed',
});

export function proxy(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return intlMiddleware(request as any);
}

export const config = {
  matcher: [
    // Match all paths except static files, API routes, and error pages
    '/((?!_next|_error|404|500|favicon.ico|apple-icon.png|icon.svg|manifest.json|sitemap.xml|robots.txt|api|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.webp|.*\\.svg|.*\\.css|.*\\.html).*)',
  ],
};
