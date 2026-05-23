/**
 * Self-host Swagger UI: copy the static assets from the pinned `swagger-ui-dist`
 * package into public/swagger-ui/ so the /api-docs page can load them locally
 * (no runtime CDN dependency). Runs in predev/prebuild.
 *
 * Only the files needed for the default (BaseLayout) viewer are copied.
 */
import { mkdir, copyFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

// Resolve the installed swagger-ui-dist regardless of hoisting (monorepo).
const distDir = dirname(require.resolve('swagger-ui-dist/package.json'))
const outDir = join(__dirname, '..', 'public', 'swagger-ui')

const FILES = ['swagger-ui.css', 'swagger-ui-bundle.js']

async function main() {
  await mkdir(outDir, { recursive: true })
  for (const f of FILES) {
    const src = join(distDir, f)
    await access(src) // throws with a clear path if the asset moved between versions
    await copyFile(src, join(outDir, f))
  }
  console.log(`[copy-swagger-ui] copied ${FILES.length} file(s) -> public/swagger-ui/`)
}

main().catch((err) => {
  console.error('[copy-swagger-ui] failed:', err)
  process.exit(1)
})
