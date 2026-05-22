import { getCloudflareContext } from '@opennextjs/cloudflare'

/**
 * Copy Cloudflare Worker env (vars + secrets) into process.env for the
 * current request.
 *
 * On OpenNext/Cloudflare, vars/secrets live in getCloudflareContext().env
 * and are NOT reliably mirrored into process.env inside route handlers, so
 * shared-lib code that reads process.env.X (ES_URL, CF_ACCESS_*, ...) sees
 * empty values. Call this at the top of a handler/page before invoking such
 * code. No-op outside the Worker runtime (local dev uses real process.env).
 */
export function ensureEnv(): void {
  try {
    const env = getCloudflareContext().env as Record<string, unknown>
    for (const [k, v] of Object.entries(env)) {
      if (typeof v === 'string') {
        process.env[k] = v
      }
    }
  } catch {
    // not in the cloudflare runtime
  }
}
