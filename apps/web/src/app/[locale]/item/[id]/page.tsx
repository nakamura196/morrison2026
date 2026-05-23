import Common from '@/components/layout/Common'
import { config } from '@/config'
import { getConfig } from '@/libs/getConfig'
import { Metadata } from 'next'
import { cache, type ReactNode } from 'react'
import { getDefaultMetadata } from '@/libs/metadata'
import { getLocale, getTranslations } from 'next-intl/server'
import { createHeaders } from '@/libs/api'
import { esSearch } from '@toyo/shared-lib'
import { Link } from '@/i18n/routing'
import type { MorrisonItem } from '@/types/morrison'
import ItemViewer from '@/components/pages/item/ItemViewer'
import type { OcrPage } from '@/components/pages/item/BookViewer'
import ItemShareExport from '@/components/pages/item/ItemShareExport'
import { ensureEnv } from '@/libs/cf-env'

const getData = cache(async (id: string): Promise<{ item: MorrisonItem | null; raw: Record<string, unknown> | null }> => {
  ensureEnv()
  const host = process.env.ES_URL || ''
  const index = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'

  try {
    const response = await fetch(`${host}/${index}/_doc/${id}`, {
      method: 'GET',
      headers: createHeaders(),
    })

    if (!response.ok) {
      return { item: null, raw: null }
    }

    const data = await response.json()
    if (!data.found) {
      return { item: null, raw: null }
    }

    return {
      item: {
        id: data._id,
        ...data._source,
      },
      raw: data._source,
    }
  } catch (error) {
    console.error('Failed to fetch item:', error)
    return { item: null, raw: null }
  }
})

// OCR text + line bboxes for every page of an item (keyed by omeka_id =
// the morrison OCR index's item_id). `coords` is written by
// scripts/index-ocr-coords.py; absent until that batch runs (viewer degrades
// to text-only in-page search).
const getOcrPages = cache(async (omekaId: string | number): Promise<OcrPage[]> => {
  ensureEnv()
  const ocrIndex = process.env.FULLTEXT_INDEX_NAME || 'morrison'
  try {
    const data = await esSearch(ocrIndex, {
      size: 2000,
      _source: ['page', 'text', 'coords'],
      query: { term: { item_id: String(omekaId) } },
    })
    const hits = (data.hits?.hits || []) as Array<{
      _source: {
        page?: string | number
        text?: string
        coords?: { w?: number; h?: number; lines?: { t: string; x: number; y: number; w: number; h: number }[] }
      }
    }>
    return hits.map((h) => {
      const s = h._source
      const c = s.coords
      return {
        page: Number(s.page),
        text: s.text ?? null,
        w: c?.w ?? null,
        h: c?.h ?? null,
        // map the stored {t,x,y,w,h} shape onto the viewer's {text,x,y,w,h}
        lines: Array.isArray(c?.lines)
          ? c!.lines.map((l) => ({ text: l.t, x: l.x, y: l.y, w: l.w, h: l.h }))
          : null,
      }
    })
  } catch (error) {
    console.error('Failed to fetch OCR pages:', error)
    return []
  }
})

const getIndexLastUpdated = cache(async (): Promise<number | null> => {
  ensureEnv()
  const host = process.env.ES_URL || ''
  const index = process.env.NEXT_PUBLIC_INDEX_NAME || 'morrison_bib'

  try {
    const response = await fetch(`${host}/${index}/_settings`, {
      method: 'GET',
      headers: createHeaders(),
    })
    if (!response.ok) return null
    const data = await response.json()
    const raw = data?.[index]?.settings?.index?.creation_date
    if (!raw) return null
    return Number(raw)
  } catch {
    return null
  }
})

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> => {
  const { locale, id } = await params
  const { item } = await getData(id)

  if (!item) {
    return {
      title: 'Not Found',
    }
  }

  const baseMetadata = await getDefaultMetadata(locale)
  const title = item.title || id

  return {
    ...baseMetadata,
    title: `${title} | ${config.siteName}`,
    openGraph: {
      ...baseMetadata.openGraph,
      title: `${title} | ${config.siteName}`,
    },
    twitter: {
      ...baseMetadata.twitter,
      title: `${title} | ${config.siteName}`,
    },
  }
}

/**
 * One bibliographic field (dt/dd). Renders nothing when empty, so callers can
 * list every field unconditionally. In the 2-column metadata grid, `wide`
 * fields (long text / URLs) span both columns; the rest pair up two-per-row.
 */
function MetaField({
  label,
  wide = false,
  valueClassName,
  children,
}: {
  label: string
  wide?: boolean
  valueClassName?: string
  children?: ReactNode
}) {
  if (children == null || children === '' || (Array.isArray(children) && children.length === 0)) {
    return null
  }
  return (
    <div
      className={`px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 last:border-b-0 sm:grid sm:grid-cols-[7rem_1fr] sm:gap-4 ${
        wide ? 'lg:col-span-2' : ''
      }`}
    >
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className={`mt-1 sm:mt-0 break-words text-sm text-gray-900 dark:text-gray-100 ${valueClassName ?? ''}`}>
        {children}
      </dd>
    </div>
  )
}

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string; page?: string; size?: string; pos?: string; filters?: string; docpage?: string }>
}) {
  const { id } = await params
  const resolvedSearchParams = await searchParams
  const locale = await getLocale()
  const t = await getTranslations('ItemPage')

  const [{ item, raw }, lastUpdatedMs, localeConfig] = await Promise.all([
    getData(id),
    getIndexLastUpdated(),
    getConfig(locale),
  ])

  if (!item) {
    return (
      <Common title="Not Found">
        <div className="text-center py-20">
          <p className="text-gray-600 dark:text-gray-400">{t('noData')}</p>
        </div>
      </Common>
    )
  }

  const title = item.title || id

  // Build search URL with params preserved
  const searchUrlParams = new URLSearchParams()
  if (resolvedSearchParams.q) searchUrlParams.set('q', resolvedSearchParams.q)
  if (resolvedSearchParams.page && resolvedSearchParams.page !== '1') {
    searchUrlParams.set('current', `n_${resolvedSearchParams.page}_n`)
  }
  if (resolvedSearchParams.size && resolvedSearchParams.size !== '20') {
    searchUrlParams.set('size', `n_${resolvedSearchParams.size}_n`)
  }
  if (resolvedSearchParams.filters) {
    searchUrlParams.set('filters', resolvedSearchParams.filters)
  }
  const searchHref = `/search${searchUrlParams.toString() ? `?${searchUrlParams.toString()}` : ''}`

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''

  // IIIF manifest URL
  const manifestUrl = `${siteUrl}/api/iiif/3/${id}/manifest`
  const hasImages = item.has_image

  // OCR pages (text + line bboxes) for the in-viewer 本文検索 / highlight.
  const omekaId = raw?.omeka_id as string | number | undefined
  const ocrPages = hasImages && omekaId != null ? await getOcrPages(omekaId) : []

  // Fulltext availability gates the TEI/XML export. There's no `has_fulltext`
  // field on morrison_bib yet (workflow §10 宿題), so derive it from whether any
  // OCR page actually carries text — which is exactly what the DTS Document
  // endpoint can serve.
  const hasFulltext = ocrPages.some((p) => (p.text?.trim().length ?? 0) > 0)

  const pageUrl = `${siteUrl}/${locale}/item/${id}`
  const dateFormatter = new Intl.DateTimeFormat(locale === 'ja' ? 'ja-JP' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const today = dateFormatter.format(new Date())
  const lastUpdatedText = lastUpdatedMs ? dateFormatter.format(new Date(lastUpdatedMs)) : null

  const citationParts = [
    item.heading1,
    item.title ? `"${item.title}"` : null,
    item.publication,
    item.publisher,
    item.callNumber ? `${t('callNumber')}: ${item.callNumber}` : null,
    localeConfig.siteName,
    `${pageUrl} (${t('accessed')} ${today})`,
  ].filter(Boolean)
  const citation = citationParts.join('. ') + '.'

  return (
    <div>
      <Common isFullWidth title={title} hideHeading>
        {/* IIIF Viewer (OpenSeadragon) — opens at the matched page and
            highlights the search term in-image when arriving from full-text search. */}
        {hasImages && (
          <ItemViewer
            itemId={id}
            ocrPages={ocrPages}
            initialPage={resolvedSearchParams.docpage ? Number(resolvedSearchParams.docpage) : undefined}
            searchQuery={resolvedSearchParams.q}
          />
        )}

        {/* Viewer and the metadata / share area below both span the full page
            width (the page is rendered with Common's full-width container). */}
        <div>

        {/* 画像なしアイテムはサムネ非表示(旧 Omeka files 依存を除去)。
            画像ありは上の IIIF ビューア(media. クリーンPTIF)が担当。 */}

        {/* Two columns below the viewer: bibliographic info on the left,
            share / export / citation panel on the right. */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
        {/* Left: bibliographic info */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 bg-surface-sunken border-b border-brand">
            <h2 className="text-lg font-bold text-ink">
              {t('bibliographicInfo')}
            </h2>
          </div>

          <dl>
            <MetaField label={t('title')} wide valueClassName="font-semibold">
              {item.title}
            </MetaField>
            <MetaField label={t('titleStatement')} wide>
              {item.titleStatement}
            </MetaField>
            <MetaField label={t('author')}>{item.heading1}</MetaField>
            <MetaField label={t('description')} wide>
              {item.description}
            </MetaField>
            <MetaField label={t('abstractEn')} wide>
              {item.abstract_en}
            </MetaField>
            <MetaField label={t('abstractJa')} wide>
              {item.abstract_ja}
            </MetaField>
            <MetaField label={t('language')}>
              {item.language && item.language.length > 0
                ? item.language.map((lang) => lang.toUpperCase()).join(', ')
                : null}
            </MetaField>
            <MetaField label={t('publication')}>{item.publication}</MetaField>
            <MetaField label={t('publisher')}>{item.publisher}</MetaField>
            <MetaField label={t('date')}>{item.date}</MetaField>
            <MetaField label={t('publicationYear')}>{item.publication_year}</MetaField>
            <MetaField label={t('format')}>{item.format}</MetaField>
            <MetaField label={t('callNumber')}>{item.callNumber}</MetaField>
            <MetaField label={t('classification')}>{item.tag1}</MetaField>
            <MetaField label={t('subClassification')}>
              {item.tag2 || item.tag3
                ? [item.tag2, item.tag3].filter(Boolean).join(' > ')
                : null}
            </MetaField>
            <MetaField label={t('holding')}>{item.holding}</MetaField>
            <MetaField label={t('isPartOf')} wide>
              {item.isPartOf
                ? item.isPartOf.startsWith('http')
                  ? (
                    <a
                      href={item.isPartOf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:text-brand-strong underline"
                    >
                      {item.isPartOf}
                    </a>
                  )
                  : item.isPartOf
                : null}
            </MetaField>
            <MetaField label={t('references')} wide>
              {item.references
                ? item.references.startsWith('http')
                  ? (
                    <a
                      href={item.references}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand hover:text-brand-strong underline"
                    >
                      {item.references}
                    </a>
                  )
                  : item.references
                : null}
            </MetaField>
          </dl>
        </div>

        {/* Right: share / export / citation */}
        <div className="lg:col-span-1">
          <ItemShareExport
            itemId={id}
            title={title}
            pageUrl={pageUrl}
            manifestUrl={manifestUrl}
            hasImages={!!hasImages}
            hasFulltext={hasFulltext}
            citation={citation}
            labels={{
              heading: t('shareExportHeading'),
              exportGroup: t('exportGroup'),
              shareGroup: t('shareGroup'),
              citationGroup: t('citationGroup'),
              jsonApiExport: t('jsonApiExport'),
              teiExport: t('teiExport'),
              iiifManifest: t('iiifManifest'),
              copyLink: t('copyLink'),
              copyCitation: t('copyCitation'),
              copied: t('copied'),
              shareOnX: t('shareOnX'),
              shareOnFacebook: t('shareOnFacebook'),
              shareOnLine: t('shareOnLine'),
            }}
          />
        </div>
        </div>

        {/* Last updated */}
        {lastUpdatedText && (
          <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            {t('lastUpdated')}: {lastUpdatedText}
          </div>
        )}

        {/* Back to search */}
        <div className="mt-6 text-center">
          <Link
            href={searchHref}
            className="inline-flex items-center text-sm text-brand hover:text-brand-strong"
          >
            <svg className="mr-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('backToSearch')}
          </Link>
        </div>
        </div>
      </Common>
    </div>
  )
}
