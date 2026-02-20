/**
 * Fetch all items from Omeka S API and convert to ES bulk format
 *
 * Usage: npx tsx scripts/fetch-omeka.ts
 *
 * Requires: OMEKA_BASE_URL, OMEKA_USER, OMEKA_PASSWORD in .env.local
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
const PER_PAGE = 50
const OUTPUT_DIR = path.resolve(__dirname, '../data')
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'morrison-bulk.ndjson')

interface OmekaPropertyValue {
  '@value'?: string
  '@id'?: string
  type?: string
}

interface OmekaItem {
  'o:id': number
  'o:title'?: string
  'thumbnail_display_urls'?: {
    square?: string
    medium?: string
    large?: string
  }
  [key: string]: unknown
}

function getPropertyValue(item: OmekaItem, property: string, index = 0): string {
  const values = item[property] as OmekaPropertyValue[] | undefined
  if (!values || !values[index]) return ''
  return values[index]['@value'] || ''
}

function getAllPropertyValues(item: OmekaItem, property: string): string[] {
  const values = item[property] as OmekaPropertyValue[] | undefined
  if (!values) return []
  return values.map(v => v['@value'] || '').filter(Boolean)
}

function extractYear(text: string): string {
  const match = text.match(/(\d{4})/)
  return match ? match[1] : ''
}

/**
 * Omeka S field mapping (confirmed from API):
 *   dcterms:title       → title
 *   dcterms:description → description (multiple values possible)
 *   dcterms:abstract    → abstract (multiple values: EN, JA)
 *   dcterms:type        → "あり" = has_image
 *   dcterms:date        → date (sometimes present)
 *   dcndl:callNumber    → callNumber
 *   ex:heading1         → heading1 (author)
 *   ex:format           → format
 *   ex:holding          → holding
 *   ex:publication      → publication
 *   ex:tag1             → tag1 (classification)
 *   ex:tag2, ex:tag3    → tag2, tag3 (sub-classifications)
 *   toyo:callNumber_converted → callNumber_converted
 *   toyo:tag1_numbered  → tag1_numbered
 */
function transformItem(item: OmekaItem) {
  const title = getPropertyValue(item, 'dcterms:title')
  const descriptions = getAllPropertyValues(item, 'dcterms:description')
  const abstracts = getAllPropertyValues(item, 'dcterms:abstract')
  const heading1 = getPropertyValue(item, 'ex:heading1')
  const publication = getPropertyValue(item, 'ex:publication')
  const date = getPropertyValue(item, 'dcterms:date')
  const format = getPropertyValue(item, 'ex:format')
  const callNumber = getPropertyValue(item, 'dcndl:callNumber')
  const callNumberConverted = getPropertyValue(item, 'toyo:callNumber_converted')
  const tag1 = getPropertyValue(item, 'ex:tag1')
  const tag1Numbered = getPropertyValue(item, 'toyo:tag1_numbered')
  const holding = getPropertyValue(item, 'ex:holding')
  const typeValue = getPropertyValue(item, 'dcterms:type')

  const hasImage = typeValue === 'あり'
  const publicationYear = extractYear(date) || extractYear(publication)

  const thumbnails = item.thumbnail_display_urls || {}

  return {
    title,
    description: descriptions.join('\n'),
    abstract: abstracts.join('\n'),
    heading1,
    publication,
    format,
    callNumber,
    callNumber_converted: callNumberConverted || callNumber.replace(/[-\s]/g, ''),
    tag1,
    tag1_numbered: tag1Numbered || tag1,
    holding: holding === '（記録なし）' ? '' : holding,
    has_image: hasImage,
    publication_year: publicationYear,
    thumbnail_urls: {
      small: thumbnails.square || '',
      medium: thumbnails.medium || '',
      large: thumbnails.large || '',
    },
    omeka_id: item['o:id'],
  }
}

function createAuthHeader(): Record<string, string> {
  if (OMEKA_USER && OMEKA_PASSWORD) {
    const auth = Buffer.from(`${OMEKA_USER}:${OMEKA_PASSWORD}`).toString('base64')
    return { Authorization: `Basic ${auth}` }
  }
  return {}
}

async function fetchPage(page: number): Promise<OmekaItem[]> {
  const url = `${OMEKA_BASE_URL}/api/items?per_page=${PER_PAGE}&page=${page}`
  const response = await fetch(url, {
    headers: createAuthHeader(),
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch page ${page}: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

async function main() {
  if (!OMEKA_BASE_URL) {
    console.error('Error: OMEKA_BASE_URL not set. Set it in .env.local or as an environment variable.')
    process.exit(1)
  }

  console.log(`Fetching items from: ${OMEKA_BASE_URL}`)

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true })
  }

  const writeStream = fs.createWriteStream(OUTPUT_FILE)
  let totalItems = 0
  let page = 1

  while (true) {
    process.stdout.write(`\rFetching page ${page}...`)

    try {
      const items = await fetchPage(page)

      if (items.length === 0) {
        break
      }

      for (const item of items) {
        const transformed = transformItem(item)
        // Use callNumber as the document ID (unique per item)
        const id = transformed.callNumber || `morrison_${item['o:id']}`

        writeStream.write(JSON.stringify({ index: { _index: 'morrison_bib', _id: id } }) + '\n')
        writeStream.write(JSON.stringify(transformed) + '\n')
        totalItems++
      }

      if (items.length < PER_PAGE) {
        break
      }

      page++

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error) {
      console.error(`\nError on page ${page}:`, error)
      break
    }
  }

  writeStream.end()
  console.log(`\nDone! Total items: ${totalItems}`)
  console.log(`Output: ${OUTPUT_FILE}`)
}

main().catch(console.error)
