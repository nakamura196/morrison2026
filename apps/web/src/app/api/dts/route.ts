/**
 * DTS 1.0 Entry endpoint.
 *
 * GET /api/dts
 *
 * Returns the EntryPoint document linking to the Collection, Navigation and
 * Document endpoints via URI templates. Spec: https://dtsapi.org/specifications/versions/v1.0/
 */

import { NextRequest } from 'next/server'
import { getHost } from '@toyo/shared-lib'
import { ensureEnv } from '@/libs/cf-env'
import { DTS_CONTEXT, DTS_VERSION, dtsBase, dtsHeaders, uriTemplates } from '@/libs/dts'

export const revalidate = 3600

export async function GET(request: NextRequest) {
  ensureEnv()
  const base = dtsBase(getHost(request))
  const t = uriTemplates(base)

  return new Response(
    JSON.stringify({
      '@context': DTS_CONTEXT,
      dtsVersion: DTS_VERSION,
      '@id': base,
      '@type': 'EntryPoint',
      collection: t.collection,
      navigation: t.navigation,
      document: t.document,
    }),
    { headers: dtsHeaders() },
  )
}
