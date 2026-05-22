import next from 'eslint-config-next'

const config = [
  {
    ignores: [
      '.next/**',
      '.open-next/**',
      'node_modules/**',
      'out/**',
      'dist/**',
      '*.config.js',
      '*.config.ts',
      'scripts/**',
    ],
  },
  ...next,
]

export default config
