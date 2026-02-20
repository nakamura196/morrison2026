'use client'

import Script from 'next/script'

interface GoogleAnalyticsProps {
  gaTagId: string
}

export default function GoogleAnalytics({ gaTagId }: GoogleAnalyticsProps) {
  if (!gaTagId) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaTagId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaTagId}');
        `}
      </Script>
    </>
  )
}
