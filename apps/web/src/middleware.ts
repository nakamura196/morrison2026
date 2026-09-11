import { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { isAuthorized, isOpenPath, unauthorizedResponse } from './libs/basic-auth';

const intlMiddleware = createMiddleware(routing);

/**
 * Worker の secret を読む。middleware は Edge で動くため、
 * process.env に載らない環境がある。両方から探す。
 */
function readSecret(request: NextRequest, key: string): string {
  const fromProcess = process.env[key];
  if (fromProcess) return fromProcess;
  // OpenNext (Cloudflare) は request 側に env をぶら下げることがある
  const env = (request as unknown as { cf?: Record<string, unknown> })?.cf;
  const v = env?.[key];
  return typeof v === 'string' ? v : '';
}

export function middleware(request: NextRequest) {
  // 正式公開まで、旧 Omeka 版と同じ鍵をかける。
  // secret（BASIC_AUTH_USER / BASIC_AUTH_PASSWORD）が揃ったときだけ効く。
  // 外したいときは secret を消せばよい（＝公開状態に戻る）。
  const user = readSecret(request, 'BASIC_AUTH_USER');
  const password = readSecret(request, 'BASIC_AUTH_PASSWORD');
  if (user && password && !isOpenPath(request.nextUrl.pathname)) {
    if (!isAuthorized(request.headers.get('authorization'), { user, password })) {
      return unauthorizedResponse();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return intlMiddleware(request as any);
}

export const config = {
  matcher: [
    // Match all paths except static files, API routes, and error pages
    // NOTE: exclude `api/` (with the slash) — a bare `api` here also matches
    // page routes that merely start with "api" (e.g. /api-docs), which would
    // skip the locale middleware and render them as `[locale]=api-docs`.
    '/((?!_next|_error|404|500|favicon.ico|apple-icon.png|icon.png|manifest.json|sitemap.xml|robots.txt|api/|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.webp|.*\\.svg|.*\\.css|.*\\.js|.*\\.html).*)',
  ],
};
