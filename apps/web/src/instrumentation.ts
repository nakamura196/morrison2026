/**
 * Next.js instrumentation hook (Cloudflare Workers/Pages bootstrap).
 *
 * Cloudflare Workers では vars/secret は Worker の env binding として供給され、
 * デフォルトでは process.env に注入されない。
 * 起動時に getCloudflareContext().env を process.env にコピーし、
 * 既存コード (shared-lib 含む) が process.env.X で読めるようにする。
 *
 * ローカル Node 実行時は @opennextjs/cloudflare の import 自体が失敗するため
 * try/catch で無視 (process.env は .env / op run 経由で既に注入済み)。
 */
export async function register() {
  try {
    const mod = await import('@opennextjs/cloudflare')
    const ctx = mod.getCloudflareContext?.()
    const cfEnv = ctx?.env as Record<string, unknown> | undefined
    if (!cfEnv) return
    for (const [k, v] of Object.entries(cfEnv)) {
      if (typeof v === 'string') {
        process.env[k] = v
      }
    }
  } catch {
    // not in cloudflare runtime; nothing to do
  }
}
