/**
 * Minimal AWS Signature Version 2 GET for the object store backing the DTS
 * Document endpoint (the canonical TEI on S3).
 *
 * The store requires SigV2 for GET/PUT (path-style); anonymous GET on the TEI
 * prefix returns 403, so the Worker signs each read with the store's read
 * credentials. All connection details come from env / Worker secrets — nothing
 * is hardcoded, to keep the endpoint/bucket out of the public repo:
 *   S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY
 * When any are missing the Document endpoint falls back to ES-generated TEI.
 *
 * We send `x-amz-date` rather than `Date`: `Date` is a forbidden request header
 * in the Fetch standard (the Workers runtime would drop it), which would break
 * the signature. With x-amz-date present, the Date line in the string-to-sign
 * is empty and x-amz-date goes into the canonicalized amz headers.
 */

export const S3_TEI_PREFIX = (process.env.S3_TEI_PREFIX || 'xml/morrison_p').replace(/^\/+|\/+$/g, '')

function s3Config() {
  const endpoint = (process.env.S3_ENDPOINT || '').replace(/\/+$/, '')
  const bucket = process.env.S3_BUCKET || ''
  const accessKey = process.env.S3_ACCESS_KEY || ''
  const secretKey = process.env.S3_SECRET_KEY || ''
  return { endpoint, bucket, accessKey, secretKey }
}

/** True when the object store endpoint/bucket and read credentials are all configured. */
export function hasS3Credentials(): boolean {
  const { endpoint, bucket, accessKey, secretKey } = s3Config()
  return Boolean(endpoint && bucket && accessKey && secretKey)
}

async function hmacSha1Base64(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  const bytes = new Uint8Array(sig)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

/**
 * GET an object from s3ds with a SigV2 signature (path-style). `key` is the
 * object key without leading slash (e.g. `xml/morrison_p/P-III/P-III-a-0083/tei.xml`).
 * Returns the fetch Response (caller checks res.ok), or null if unconfigured.
 *
 * The key is expected to contain only path-safe characters (the DTS resource id
 * is validated to `[A-Za-z0-9_().-]`), so it is signed and requested verbatim;
 * percent-encoding would desync the signature from the request line.
 */
export async function s3SignedGet(key: string): Promise<Response | null> {
  const { endpoint, bucket, accessKey, secretKey } = s3Config()
  if (!endpoint || !bucket || !accessKey || !secretKey) return null

  const cleanKey = key.replace(/^\/+/, '')
  const resource = `/${bucket}/${cleanKey}`
  const date = new Date().toUTCString()
  // SigV2 with x-amz-date: Date line empty, x-amz-date in canonicalized headers.
  const stringToSign = `GET\n\n\n\nx-amz-date:${date}\n${resource}`
  const signature = await hmacSha1Base64(secretKey, stringToSign)

  return fetch(`${endpoint}${resource}`, {
    headers: {
      'x-amz-date': date,
      Authorization: `AWS ${accessKey}:${signature}`,
    },
    next: { revalidate: 3600 },
  })
}

/** S3 object key for an item's canonical TEI. */
export function teiKey(group: string, callNumber: string): string {
  return `${S3_TEI_PREFIX}/${group}/${callNumber}/tei.xml`
}
