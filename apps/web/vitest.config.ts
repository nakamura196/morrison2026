import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // 共有部品 (packages/shared-ui など) の試験もここで走らせる。置き場所が
    // 別でも、走らなければ意味が無い (CI は apps/web の vitest だけを叩く)。
    include: ['src/**/*.test.ts', '../../packages/shared-*/src/**/*.test.ts'],
    server: {
      deps: {
        // next-intl's ESM build imports `next/server` without an extension,
        // which Node's strict ESM resolver rejects. Let Vite resolve it instead.
        inline: ['next-intl'],
      },
    },
  },
})
