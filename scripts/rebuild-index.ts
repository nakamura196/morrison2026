/**
 * Create Morrison index in OpenSearch and bulk ingest data
 *
 * Usage: npx tsx scripts/rebuild-index.ts
 *
 * Requires: ES_HOST, ES_USERNAME, ES_PASSWORD in .env.local
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

const ES_HOST = process.env.ES_HOST || ''
const ES_USERNAME = process.env.ES_USERNAME || ''
const ES_PASSWORD = process.env.ES_PASSWORD || ''
const INDEX_NAME = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'
const BULK_FILE = path.resolve(__dirname, '../data/morrison-bulk.ndjson')

function createHeaders() {
  const auth = Buffer.from(`${ES_USERNAME}:${ES_PASSWORD}`).toString('base64')
  return {
    'Content-Type': 'application/json',
    Authorization: `Basic ${auth}`,
  }
}

const indexMapping = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
  },
  mappings: {
    properties: {
      title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      titleStatement: { type: 'text' },
      description: { type: 'text' },
      abstract_en: { type: 'text' },
      abstract_ja: { type: 'text' },
      heading1: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      publication: { type: 'text' },
      publisher: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      date: { type: 'keyword' },
      isPartOf: { type: 'keyword' },
      format: { type: 'keyword' },
      callNumber: { type: 'keyword' },
      callNumber_converted: { type: 'keyword' },
      tag1: { type: 'keyword' },
      tag1_numbered: { type: 'keyword' },
      tag2: { type: 'keyword' },
      tag3: { type: 'keyword' },
      holding: { type: 'keyword' },
      references: { type: 'keyword' },
      has_image: { type: 'boolean' },
      publication_year: { type: 'keyword' },
      language: { type: 'keyword' },
      thumbnail_urls: { type: 'object', enabled: false },
      omeka_id: { type: 'integer' },
    },
  },
}

async function deleteIndex() {
  try {
    const response = await fetch(`${ES_HOST}/${INDEX_NAME}`, {
      method: 'DELETE',
      headers: createHeaders(),
    })
    if (response.ok) {
      console.log(`Deleted existing index: ${INDEX_NAME}`)
    }
  } catch {
    // Index may not exist, that's fine
  }
}

async function createIndex() {
  const response = await fetch(`${ES_HOST}/${INDEX_NAME}`, {
    method: 'PUT',
    headers: createHeaders(),
    body: JSON.stringify(indexMapping),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create index: ${error}`)
  }

  console.log(`Created index: ${INDEX_NAME}`)
}

async function bulkIngest() {
  if (!fs.existsSync(BULK_FILE)) {
    throw new Error(`Bulk file not found: ${BULK_FILE}\nRun 'npx tsx scripts/fetch-omeka.ts' first.`)
  }

  const content = fs.readFileSync(BULK_FILE, 'utf-8')
  const lines = content.trim().split('\n')
  const totalDocs = lines.length / 2

  console.log(`Ingesting ${totalDocs} documents...`)

  // Send in batches of 500 documents (1000 lines)
  const BATCH_SIZE = 500
  let processed = 0

  for (let i = 0; i < lines.length; i += BATCH_SIZE * 2) {
    const batchLines = lines.slice(i, i + BATCH_SIZE * 2)
    const body = batchLines.join('\n') + '\n'

    const response = await fetch(`${ES_HOST}/_bulk`, {
      method: 'POST',
      headers: createHeaders(),
      body,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Bulk ingest failed: ${error}`)
    }

    const result = await response.json()
    if (result.errors) {
      const errorItems = result.items.filter((item: { index?: { error?: unknown } }) => item.index?.error)
      console.error(`Batch errors: ${errorItems.length} items failed`)
      if (errorItems.length > 0) {
        console.error('First error:', JSON.stringify(errorItems[0].index.error, null, 2))
      }
    }

    processed += batchLines.length / 2
    process.stdout.write(`\rIngested ${processed}/${totalDocs} documents`)
  }

  console.log('\nBulk ingest complete!')
}

async function main() {
  if (!ES_HOST) {
    console.error('Error: ES_HOST not set. Set it in .env.local or as an environment variable.')
    process.exit(1)
  }

  console.log(`Target: ${ES_HOST}/${INDEX_NAME}`)

  await deleteIndex()
  await createIndex()
  await bulkIngest()

  // Refresh index
  await fetch(`${ES_HOST}/${INDEX_NAME}/_refresh`, {
    method: 'POST',
    headers: createHeaders(),
  })

  // Get count
  const countResponse = await fetch(`${ES_HOST}/${INDEX_NAME}/_count`, {
    method: 'GET',
    headers: createHeaders(),
  })
  const countData = await countResponse.json()
  console.log(`\nIndex document count: ${countData.count}`)
}

main().catch(console.error)
