/** @type {import('next').NextConfig} */

const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin();

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const nextConfig = {
  output: 'standalone',
  env: {
    basePath,
  },
  basePath,
  transpilePackages: ['@toyo/shared-ui', '@toyo/shared-lib'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'iiif.dl.itc.u-tokyo.ac.jp',
      },
      {
        protocol: 'https',
        hostname: '**.omeka.net',
      },
    ],
  },
}

module.exports = withNextIntl(nextConfig)
