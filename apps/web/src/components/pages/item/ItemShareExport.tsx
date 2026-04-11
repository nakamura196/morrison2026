'use client'

import { useState } from 'react'
import { HiDownload, HiClipboard, HiClipboardCheck, HiLink } from 'react-icons/hi'
import { FaXTwitter, FaFacebook, FaLine } from 'react-icons/fa6'

interface ItemShareExportProps {
  itemId: string
  title: string
  pageUrl: string
  manifestUrl: string
  hasImages: boolean
  itemJson: Record<string, unknown>
  citation: string
  labels: {
    heading: string
    exportGroup: string
    shareGroup: string
    citationGroup: string
    jsonExport: string
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
  itemJson,
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

  const handleJsonDownload = () => {
    const blob = new Blob([JSON.stringify(itemJson, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${itemId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const encodedUrl = encodeURIComponent(pageUrl)
  const encodedTitle = encodeURIComponent(title)
  const xShareUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`
  const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
  const lineShareUrl = `https://social-plugins.line.me/lineit/share?url=${encodedUrl}`

  const btnBase =
    'inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'

  return (
    <section
      aria-label={labels.heading}
      className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
          {labels.heading}
        </h2>
      </div>

      <div className="px-6 py-4 grid gap-4 md:grid-cols-3">
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            {labels.exportGroup}
          </h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleJsonDownload} className={btnBase}>
              <HiDownload className="w-4 h-4" />
              {labels.jsonExport}
            </button>
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

        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
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
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            {labels.citationGroup}
          </h3>
          <div className="flex items-start gap-2">
            <p className="flex-1 text-xs text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 max-h-24 overflow-y-auto">
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
      </div>
    </section>
  )
}
