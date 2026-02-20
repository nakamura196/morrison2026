/**
 * Export items from NDJSON bulk file to CSV
 *
 * Usage: npx tsx scripts/export-items-csv.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const DATA_DIR = path.resolve(__dirname, '../data')
const BULK_FILE = path.join(DATA_DIR, 'morrison-bulk.ndjson')
const OUTPUT_FILE = path.join(DATA_DIR, 'items.csv')

const CSV_COLUMNS = [
  'omeka_id',
  'title',
  'heading1',
  'description',
  'abstract',
  'publication',
  'format',
  'callNumber',
  'callNumber_converted',
  'tag1',
  'tag1_numbered',
  'holding',
  'has_image',
  'publication_year',
  'thumbnail_small',
  'thumbnail_medium',
  'thumbnail_large',
]

function escapeCsv(value: string): string {
  if (!value) return ''
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function main() {
  if (!fs.existsSync(BULK_FILE)) {
    console.error(`Bulk file not found: ${BULK_FILE}\nRun 'npx tsx scripts/fetch-omeka.ts' first.`)
    process.exit(1)
  }

  const lines = fs.readFileSync(BULK_FILE, 'utf-8').trim().split('\n')
  const writeStream = fs.createWriteStream(OUTPUT_FILE)

  // Write header
  writeStream.write(CSV_COLUMNS.join(',') + '\n')

  let count = 0
  for (let i = 0; i < lines.length; i += 2) {
    // Skip index line, parse document line
    const doc = JSON.parse(lines[i + 1])

    const row = CSV_COLUMNS.map(col => {
      if (col === 'thumbnail_small') return escapeCsv(doc.thumbnail_urls?.small || '')
      if (col === 'thumbnail_medium') return escapeCsv(doc.thumbnail_urls?.medium || '')
      if (col === 'thumbnail_large') return escapeCsv(doc.thumbnail_urls?.large || '')
      if (col === 'has_image') return doc.has_image ? 'true' : 'false'
      return escapeCsv(String(doc[col] ?? ''))
    })

    writeStream.write(row.join(',') + '\n')
    count++
  }

  writeStream.end()
  console.log(`Exported ${count} items to ${OUTPUT_FILE}`)
}

main()
