/**
 * Fetch all media from Omeka S API and export to CSV
 *
 * Usage: npx tsx scripts/fetch-media.ts
 *
 * Requires: OMEKA_BASE_URL, OMEKA_USER, OMEKA_PASSWORD in .env.local
 * Total media: ~132,196 items
 */

import * as fs from 'fs'
import * as path from 'path'

// Load .env.local if available
try {
  const envPath = path.resolve(__dirname, '../apps/web/.env.local')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        process.env[key.trim()] = valueParts.join('=').trim()
      }
    }
  }
} catch {
  // ignore
}

const OMEKA_BASE_URL = process.env.OMEKA_BASE_URL || process.env.NEXT_PUBLIC_OMEKA_BASE_URL || ''
const OMEKA_USER = process.env.OMEKA_USER || ''
const OMEKA_PASSWORD = process.env.OMEKA_PASSWORD || ''
const PER_PAGE = 100
const OUTPUT_DIR = path.resolve(__dirname, '../data')
const OUTPUT_CSV = path.join(OUTPUT_DIR, 'media.csv')

interface OmekaMedia {
  'o:id': number
  'o:item': { 'o:id': number }
  'o:media_type'?: string
  'o:filename'?: string
  'o:original_url'?: string
  'o:source'?: string
  'o:size'?: number
  'thumbnail_display_urls'?: {
    large?: string
    medium?: string
    square?: string
  }
  data?: {
    dimensions?: {
      original?: { width: number; height: number }
    }
  }
}

const CSV_COLUMNS = [
  'media_id',
  'item_id',
  'media_type',
  'filename',
  'original_url',
  'source',
  'width',
  'height',
  'size',
  'thumbnail_large',
  'thumbnail_medium',
  'thumbnail_square',
]

function escapeCsv(value: string): string {
  if (!value) return ''
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function createAuthHeader(): Record<string, string> {
  if (OMEKA_USER && OMEKA_PASSWORD) {
    const auth = Buffer.from(`${OMEKA_USER}:${OMEKA_PASSWORD}`).toString('base64')
    return { Authorization: `Basic ${auth}` }
  }
  return {}
}

async function fetchMediaPage(page: number): Promise<OmekaMedia[]> {
  const url = `${OMEKA_BASE_URL}/api/media?per_page=${PER_PAGE}&page=${page}&sort_by=id&sort_order=asc`
  const response = await fetch(url, {
    headers: createAuthHeader(),
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch media page ${page}: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

function mediaToRow(media: OmekaMedia): string {
  const dims = media.data?.dimensions?.original
  const thumbs = media.thumbnail_display_urls || {}

  const values = [
    String(media['o:id']),
    String(media['o:item']?.['o:id'] || ''),
    escapeCsv(media['o:media_type'] || ''),
    escapeCsv(media['o:filename'] || ''),
    escapeCsv(media['o:original_url'] || ''),
    escapeCsv(media['o:source'] || ''),
    dims?.width ? String(dims.width) : '',
    dims?.height ? String(dims.height) : '',
    media['o:size'] ? String(media['o:size']) : '',
    escapeCsv(thumbs.large || ''),
    escapeCsv(thumbs.medium || ''),
    escapeCsv(thumbs.square || ''),
  ]

  return values.join(',')
}

async function main() {
  if (!OMEKA_BASE_URL) {
    console.error('Error: OMEKA_BASE_URL not set. Set it in .env.local or as an environment variable.')
    process.exit(1)
  }

  console.log(`Fetching media from: ${OMEKA_BASE_URL}`)

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const writeStream = fs.createWriteStream(OUTPUT_CSV)
  writeStream.write(CSV_COLUMNS.join(',') + '\n')

  let totalMedia = 0
  let page = 1
  let retries = 0
  const MAX_RETRIES = 3

  while (true) {
    process.stdout.write(`\rFetching media page ${page}... (${totalMedia} media so far)`)

    try {
      const mediaItems = await fetchMediaPage(page)

      if (mediaItems.length === 0) {
        break
      }

      for (const media of mediaItems) {
        writeStream.write(mediaToRow(media) + '\n')
        totalMedia++
      }

      if (mediaItems.length < PER_PAGE) {
        break
      }

      page++
      retries = 0

      // Rate limiting - light delay
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      retries++
      if (retries >= MAX_RETRIES) {
        console.error(`\nFailed after ${MAX_RETRIES} retries on page ${page}:`, error)
        break
      }
      console.error(`\nRetry ${retries}/${MAX_RETRIES} on page ${page}:`, error)
      await new Promise(resolve => setTimeout(resolve, 1000 * retries))
    }
  }

  writeStream.end()
  console.log(`\nDone! Total media: ${totalMedia}`)
  console.log(`Output: ${OUTPUT_CSV}`)
}

main().catch(console.error)
