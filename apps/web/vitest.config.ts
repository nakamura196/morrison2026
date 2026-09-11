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
    include: ['src/**/*.test.ts'],
    server: {
      deps: {
        // next-intl's ESM build imports `next/server` without an extension,
        // which Node's strict ESM resolver rejects. Let Vite resolve it instead.
        inline: ['next-intl'],
      },
    },
  },
})
