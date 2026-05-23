/**
 * Emit the OpenAPI document to apps/web/openapi.json for external consumers
 * (Postman, client codegen, etc.). The live endpoint /api/openapi.json serves
 * the same document at runtime.
 *
 * Run: npm run gen:openapi  (uses tsx to import the TS source of truth)
 */
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openApiDocument } from '../src/libs/openapi.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outFile = join(__dirname, '..', 'openapi.json')

await writeFile(outFile, JSON.stringify(openApiDocument, null, 2) + '\n')
console.log(`[gen-openapi] wrote ${outFile}`)
