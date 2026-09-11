/**
 * Basic 認証。正式公開まで、関係者だけが見られる状態にしておくためのもの。
 *
 * 旧 Omeka 版（toyobunko-lab.jp/morrison）には以前から同じ鍵がかかっていた。
 * 新しい基盤へ移したときに鍵が外れ、意図せず誰でも見られる状態になっていたため、
 * 同じ ID・パスワードを掛け直す（2026-09-11）。
 *
 * 外すときは Worker の secret を消すだけでよい。
 *   npx wrangler secret delete BASIC_AUTH_USER
 *   npx wrangler secret delete BASIC_AUTH_PASSWORD
 * どちらか一方でも無ければ、認証は一切かからない（＝公開状態に戻る）。
 * 設定漏れでサイト全体が閉じてしまう事故を避けるため、この向きにしてある。
 */

/** 認証を通す必要がないパス。監視や共有カードの取得が 401 で落ちないようにする。 */
const OPEN_PATHS = [
  '/api/', // 外部提供 API（IIIF・DTS・検索）。機械向けなので閉じない
  '/opengraph-image',
  '/twitter-image',
  '/icon',
  '/apple-icon',
  '/favicon',
  '/robots.txt',
  '/sitemap.xml',
]

export function isOpenPath(pathname: string): boolean {
  return OPEN_PATHS.some(p => pathname.startsWith(p))
}

/** `Authorization: Basic …` を ID とパスワードに分解する。読めなければ null。 */
export function parseBasicAuth(header: string | null): { user: string; password: string } | null {
  if (!header) return null
  const m = /^Basic\s+(.+)$/i.exec(header.trim())
  if (!m) return null
  let decoded: string
  try {
    decoded = atob(m[1])
  } catch {
    return null
  }
  const at = decoded.indexOf(':')
  if (at < 0) return null
  return { user: decoded.slice(0, at), password: decoded.slice(at + 1) }
}

/**
 * 突き合わせにかかる時間を、入力の内容によって変えない。
 * 早く false を返すと、1 文字ずつ正解を探られる余地が生まれる。
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** 認証を通してよいか。設定が無いときは常に通す（＝公開状態）。 */
export function isAuthorized(
  header: string | null,
  expected: { user: string; password: string },
): boolean {
  const got = parseBasicAuth(header)
  if (!got) return false
  return safeEqual(got.user, expected.user) && safeEqual(got.password, expected.password)
}

/** 認証を求める応答。旧 Omeka 版と同じ文言を出す。 */
export function unauthorizedResponse(): Response {
  return new Response('認証が必要です。', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Please enter your ID and Password.", charset="UTF-8"',
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
