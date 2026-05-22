/**
 * Next.js instrumentation hook (Cloudflare Workers/Pages bootstrap).
 *
 * Cloudflare Workers では vars/secret は Worker の env binding として供給され、
 * デフォルトでは process.env に注入されない。
 * 起動時に getCloudflareContext().env を process.env にコピーし、
 * 既存コード (shared-lib 含む) が process.env.X で読めるようにする。
 *
 * 初期化(register)時はリクエスト外なので async 版 getCloudflareContext を使う。
 * ローカル Node 実行時は import 自体が失敗するため try/catch で無視。
 */
export async function register() {
  try {
    const mod = await import('@opennextjs/cloudflare')
    const getCtx = mod.getCloudflareContext
    if (!getCtx) return
    let cfEnv: Record<string, unknown> | undefined
    try {
      const ctx = await getCtx({ async: true })
      cfEnv = ctx?.env as Record<string, unknown> | undefined
    } catch {
      const ctx = getCtx()
      cfEnv = ctx?.env as Record<string, unknown> | undefined
    }
    if (!cfEnv) {
      console.log('[instrumentation] no cfEnv available')
      return
    }
    const copied: string[] = []
    for (const [k, v] of Object.entries(cfEnv)) {
      if (typeof v === 'string' && process.env[k] === undefined) {
        process.env[k] = v
        copied.push(k)
      }
    }
    console.log('[instrumentation] copied env keys:', copied.join(','))
  } catch (e) {
    console.log('[instrumentation] error:', e instanceof Error ? e.message : String(e))
  }
}
