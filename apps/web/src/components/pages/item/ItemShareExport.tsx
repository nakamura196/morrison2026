'use client'

import { useState } from 'react'
import { HiClipboard, HiClipboardCheck, HiLink } from 'react-icons/hi'
import { FaXTwitter, FaFacebook, FaLine } from 'react-icons/fa6'
import { VscJson } from 'react-icons/vsc'

interface ItemShareExportProps {
  itemId: string
  title: string
  pageUrl: string
  manifestUrl: string
  hasImages: boolean
  /** Whether the item has OCR fulltext — gates the TEI/XML download. */
  hasFulltext: boolean
  citation: string
  labels: {
    heading: string
    exportGroup: string
    shareGroup: string
    citationGroup: string
    jsonApiExport: string
    teiExport: string
    iiifManifest: string
    copyLink: string
    copyCitation: string
    copied: string
    shareOnX: string
    shareOnFacebook: string
    shareOnLine: string
  }
}

export default function ItemShareExport({
  itemId,
  title,
  pageUrl,
  manifestUrl,
  hasImages,
  hasFulltext,
  citation,
  labels,
}: ItemShareExportProps) {
  const [citationCopied, setCitationCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  const handleCopy = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text)
      setter(true)
      setTimeout(() => setter(false), 2000)
    } catch {
      // noop
    }
  }

  // Download links resolve to documented API endpoints (see /api-docs):
  //   JSON:API  -> GET /api/item/:id            (morrison_bib _source, wrapped)
  //   TEI/XML   -> GET /api/dts/document?resource=:id (canonical TEI from S3)
  // Both are same-origin so the `download` attribute applies the filename even
  // though the endpoints already send Content-Disposition: attachment.
  const jsonApiUrl = `/api/item/${encodeURIComponent(itemId)}`
  const teiUrl = `/api/dts/document?resource=${encodeURIComponent(itemId)}`

  const encodedUrl = encodeURIComponent(pageUrl)
  const encodedTitle = encodeURIComponent(title)
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`
  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
  const lineShareUrl = `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`

  const btnBase =
    'inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-line text-ink hover:bg-surface-sunken transition-colors'

  return (
    <section
      aria-label={labels.heading}
      className="bg-surface-raised rounded-lg shadow-sm border border-line overflow-hidden"
    >
      <div className="px-6 py-4 bg-surface-sunken border-b border-brand">
        <h2 className="text-lg font-bold text-ink">{labels.heading}</h2>
      </div>

      <div className="px-6 py-4 flex flex-col gap-5">
        {/* Citation first — the most broadly useful action. Share next, then
            export (JSON / IIIF) last, since those are unfamiliar to most
            visitors. */}
        <div>
          <h3 className="text-xs font-medium text-ink-muted mb-2">
            {labels.citationGroup}
          </h3>
          <div className="flex items-start gap-2">
            <p className="flex-1 text-xs text-ink-muted leading-relaxed bg-surface-sunken border border-line rounded-md px-3 py-2">
              {citation}
            </p>
            <button
              type="button"
              onClick={() => handleCopy(citation, setCitationCopied)}
              aria-label={citationCopied ? labels.copied : labels.copyCitation}
              title={citationCopied ? labels.copied : labels.copyCitation}
              className={`${btnBase} shrink-0`}
            >
              {citationCopied ? (
                <HiClipboardCheck className="w-4 h-4" />
              ) : (
                <HiClipboard className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-ink-muted mb-2">
            {labels.shareGroup}
          </h3>
          <div className="flex flex-wrap gap-2">
            <a
              href={xShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={labels.shareOnX}
              title={labels.shareOnX}
              className={btnBase}
            >
              <FaXTwitter className="w-4 h-4" />
            </a>
            <a
              href={fbShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={labels.shareOnFacebook}
              title={labels.shareOnFacebook}
              className={btnBase}
            >
              <FaFacebook className="w-4 h-4" />
            </a>
            <a
              href={lineShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={labels.shareOnLine}
              title={labels.shareOnLine}
              className={btnBase}
            >
              <FaLine className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={() => handleCopy(pageUrl, setLinkCopied)}
              aria-label={labels.copyLink}
              title={linkCopied ? labels.copied : labels.copyLink}
              className={btnBase}
            >
              {linkCopied ? (
                <HiClipboardCheck className="w-4 h-4" />
              ) : (
                <HiLink className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-ink-muted mb-2">
            {labels.exportGroup}
          </h3>
          <div className="flex flex-wrap gap-2">
            <a href={jsonApiUrl} download={`${itemId}.json`} className={btnBase}>
              <VscJson className="w-4 h-4" />
              {labels.jsonApiExport}
            </a>
            {hasFulltext && (
              <a href={teiUrl} download={`${itemId}.xml`} className={btnBase}>
                <img src="/images/tei-logo.svg" alt="" className="w-4 h-4" />
                {labels.teiExport}
              </a>
            )}
            {hasImages && (
              <a
                href={manifestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={btnBase}
              >
                <img
                  src="https://iiif.io/assets/images/logos/logo-sm.png"
                  alt=""
                  className="w-4 h-4"
                />
                {labels.iiifManifest}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
