'use client'

import { useEffect, useRef } from 'react'

const BP = process.env.NEXT_PUBLIC_BASE_PATH || ''

/**
 * Renders Swagger UI from the self-hosted assets in public/swagger-ui/
 * (copied from the pinned swagger-ui-dist package at build time — no CDN).
 * Points the viewer at the live /api/openapi.json document.
 */
export default function SwaggerUIClient() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const cssId = 'swagger-ui-css'
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link')
      link.id = cssId
      link.rel = 'stylesheet'
      link.href = `${BP}/swagger-ui/swagger-ui.css`
      document.head.appendChild(link)
    }

    const init = () => {
      const SwaggerUIBundle = (window as unknown as { SwaggerUIBundle?: SwaggerUIBundleFn })
        .SwaggerUIBundle
      if (!SwaggerUIBundle) return
      SwaggerUIBundle({
        url: `${BP}/api/openapi.json`,
        dom_id: '#swagger-ui',
        deepLinking: true,
        tryItOutEnabled: true,
        presets: [SwaggerUIBundle.presets.apis],
      })
    }

    const scriptId = 'swagger-ui-bundle'
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null
    if (existing) {
      init()
      return
    }
    const script = document.createElement('script')
    script.id = scriptId
    script.src = `${BP}/swagger-ui/swagger-ui-bundle.js`
    script.crossOrigin = 'anonymous'
    script.onload = init
    document.body.appendChild(script)
  }, [])

  // Swagger UI assumes a light surface; keep it on a white panel so it reads
  // cleanly even in dark mode.
  return <div id="swagger-ui" className="bg-white rounded-lg p-2 sm:p-4" />
}

type SwaggerUIBundleFn = ((config: Record<string, unknown>) => unknown) & {
  presets: { apis: unknown }
}
