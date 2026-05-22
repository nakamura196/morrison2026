'use client'

/**
 * Item detail viewer for Morrison pages — modeled on mirai-web's IssueViewer.
 *
 * Layout: OpenSeadragon (left) + a tabbed sidebar (right) with
 *   - 本文検索 (in-page search): client-side search across every page's OCR
 *     lines; results are grouped by page, highlight the term, and (when the
 *     page has bbox coords) overlay + zoom to the matched line on the image.
 *   - ページ (pages): thumbnail grid with per-page hit-count badges.
 *   - OCR: every detected line for the active page, with hover-sync + zoom.
 *
 * Image identifiers come from the item's IIIF v2 manifest (fetched client-side,
 * same-origin). OCR text + line bboxes come from the `morrison` index, passed
 * in as `ocrPages` and merged with the manifest by page number (= media order).
 * Line bboxes are populated by scripts/index-ocr-coords.py; until that runs,
 * search falls back to page-level text matches (navigate + highlight, no zoom).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import OpenSeadragonViewer, {
  type ViewerApi,
  type ViewerHighlight,
} from './OpenSeadragonViewer'

export interface OcrLine {
  text: string
  x: number
  y: number
  w: number
  h: number
}

/** OCR data for one page, keyed by page number (= media order). */
export interface OcrPage {
  page: number
  text?: string | null
  /** ALTO page pixel dims (coord space for `lines`). */
  w?: number | null
  h?: number | null
  lines?: OcrLine[] | null
}

interface BookPage {
  page_id: string
  page_key: string
  page_number: number
  serviceId: string
  infoUrl: string
  image_width: number | null
  image_height: number | null
  ocr_text: string | null
  lines: OcrLine[] | null
}

type HitLine = OcrLine & { lineIdx: number; hasBox: boolean }
interface PageMatch {
  page: BookPage
  lines: HitLine[]
}
type Tab = 'hits' | 'pages' | 'ocr'

function thumbUrl(serviceId: string): string {
  return `${serviceId}/full/!200,280/0/default.jpg`
}

/** Highlight literal occurrences of `term` in `text`. */
function highlightText(text: string, term: string | null): React.ReactNode {
  if (!term) return text
  const t = term.trim()
  if (!t) return text
  const lower = text.toLowerCase()
  const needle = t.toLowerCase()
  const out: React.ReactNode[] = []
  let i = 0
  let key = 0
  while (i < text.length) {
    const j = lower.indexOf(needle, i)
    if (j < 0) {
      out.push(text.slice(i))
      break
    }
    if (j > i) out.push(text.slice(i, j))
    out.push(
      <mark key={`m${key++}`} className="bg-amber-200 dark:bg-amber-700/60 text-inherit px-0.5 rounded">
        {text.slice(j, j + t.length)}
      </mark>,
    )
    i = j + t.length
  }
  return out
}

/** Per-page matches. Uses bbox lines when present, else falls back to scanning
 *  ocr_text split on newlines (navigate/highlight only, no overlay). */
function findMatches(pages: BookPage[], q: string): PageMatch[] {
  const term = q.trim().toLowerCase()
  if (!term) return []
  const out: PageMatch[] = []
  for (const page of pages) {
    const hits: HitLine[] = []
    if (page.lines && page.lines.length > 0) {
      for (let i = 0; i < page.lines.length; i++) {
        const ln = page.lines[i]
        if (ln.text.toLowerCase().includes(term)) hits.push({ ...ln, lineIdx: i, hasBox: true })
      }
    } else if (page.ocr_text) {
      const textLines = page.ocr_text.split('\n')
      for (let i = 0; i < textLines.length; i++) {
        const tx = textLines[i]
        if (tx.toLowerCase().includes(term)) {
          hits.push({ text: tx, x: 0, y: 0, w: 0, h: 0, lineIdx: i, hasBox: false })
        }
      }
    }
    if (hits.length) out.push({ page, lines: hits })
  }
  return out
}

/** Lines to list on the OCR tab — bbox lines if present, else text lines. */
function displayLines(page: BookPage): HitLine[] {
  if (page.lines && page.lines.length > 0) {
    return page.lines.map((ln, i) => ({ ...ln, lineIdx: i, hasBox: true }))
  }
  if (page.ocr_text) {
    return page.ocr_text
      .split('\n')
      .filter((t) => t.trim().length > 0)
      .map((text, i) => ({ text, x: 0, y: 0, w: 0, h: 0, lineIdx: i, hasBox: false }))
  }
  return []
}

async function fetchServiceIds(itemId: string): Promise<string[]> {
  try {
    const res = await fetch(`/api/iiif/2/${encodeURIComponent(itemId)}/manifest`)
    if (!res.ok) return []
    const m = (await res.json()) as {
      sequences?: { canvases?: { images?: { resource?: Record<string, unknown> }[] }[] }[]
    }
    const canvases = m?.sequences?.[0]?.canvases ?? []
    const ids: string[] = []
    for (const c of canvases) {
      const resource = c?.images?.[0]?.resource as
        | { '@id'?: string; id?: string; service?: { '@id'?: string; id?: string } }
        | undefined
      const svc = resource?.service
      const sid = svc?.['@id'] || svc?.id
      if (sid) ids.push(sid)
    }
    return ids
  } catch {
    return []
  }
}

export default function BookViewer({
  itemId,
  ocrPages,
  initialPage,
  query,
}: {
  itemId: string
  ocrPages: OcrPage[]
  initialPage?: number
  query?: string | null
}) {
  const t = useTranslations('Viewer')
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  // Build pages once the manifest's ordered image services arrive.
  const [serviceIds, setServiceIds] = useState<string[] | null>(null)
  useEffect(() => {
    let cancelled = false
    fetchServiceIds(itemId).then((ids) => {
      if (!cancelled) setServiceIds(ids)
    })
    return () => {
      cancelled = true
    }
  }, [itemId])

  const ocrByPage = useMemo(() => {
    const map = new Map<number, OcrPage>()
    for (const p of ocrPages) map.set(Number(p.page), p)
    return map
  }, [ocrPages])

  const pages: BookPage[] = useMemo(() => {
    if (!serviceIds) return []
    return serviceIds.map((sid, i) => {
      const pageNumber = i + 1
      const ocr = ocrByPage.get(pageNumber)
      return {
        page_id: `p${pageNumber}`,
        page_key: `p.${pageNumber}`,
        page_number: pageNumber,
        serviceId: sid,
        infoUrl: `${sid}/info.json`,
        image_width: ocr?.w ?? null,
        image_height: ocr?.h ?? null,
        ocr_text: ocr?.text ?? null,
        lines: ocr?.lines ?? null,
      }
    })
  }, [serviceIds, ocrByPage])

  const [activeQuery, setActiveQuery] = useState<string>(query ?? '')
  const [draft, setDraft] = useState<string>(query ?? '')
  // Re-seed from the `query` prop on full navigations (e.g. arriving from
  // fulltext-search). Tracked-prev + setState-during-render is React's
  // sanctioned "derive from props" pattern — no effect, no cascading render.
  const [prevQuery, setPrevQuery] = useState<string | null | undefined>(query)
  if (query !== prevQuery) {
    setPrevQuery(query)
    setActiveQuery(query ?? '')
    setDraft(query ?? '')
  }

  const matches = useMemo(
    () => (activeQuery ? findMatches(pages, activeQuery) : []),
    [pages, activeQuery],
  )
  const totalHits = matches.reduce((acc, m) => acc + m.lines.length, 0)

  const initialActiveId = useMemo(() => {
    if (pages.length === 0) return ''
    if (initialPage != null) {
      const hit = pages.find((p) => p.page_number === initialPage)
      if (hit) return hit.page_id
    }
    if (matches.length) return matches[0].page.page_id
    return pages[0].page_id
  }, [pages, initialPage, matches])

  const [activeId, setActiveId] = useState<string>('')
  const [tab, setTab] = useState<Tab>('hits')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [showAllOcr, setShowAllOcr] = useState(false)
  const viewerApi = useRef<ViewerApi | null>(null)

  // Seed the active page + default tab once the manifest resolves (activeId is
  // still '' until then). setState-during-render, guarded so it runs once.
  if (activeId === '' && initialActiveId) {
    setActiveId(initialActiveId)
    setTab(activeQuery && matches.length ? 'hits' : 'pages')
  }

  const active = useMemo(
    () => pages.find((p) => p.page_id === activeId) ?? pages[0],
    [pages, activeId],
  )

  const submitQuery = (next: string) => {
    const trimmed = next.trim()
    setActiveQuery(trimmed)
    if (trimmed && matches.length === 0) setTab('hits')
    const params = new URLSearchParams(sp?.toString() ?? '')
    if (trimmed) params.set('q', trimmed)
    else params.delete('q')
    const qs = params.toString()
    router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  // Active page's overlays: matched lines (+ all OCR boxes when toggled).
  const activeHighlights: ViewerHighlight[] = useMemo(() => {
    if (!active) return []
    const out: ViewerHighlight[] = []
    if (showAllOcr) {
      const ls = active.lines ?? []
      for (let i = 0; i < ls.length; i++) {
        const ln = ls[i]
        out.push({ id: `ocr:${active.page_id}:${i}`, x: ln.x, y: ln.y, w: ln.w, h: ln.h })
      }
    }
    if (activeQuery) {
      const m = matches.find((x) => x.page.page_id === active.page_id)
      if (m) {
        for (const ln of m.lines) {
          if (!ln.hasBox) continue
          out.push({ id: `hit:${active.page_id}:${ln.lineIdx}`, x: ln.x, y: ln.y, w: ln.w, h: ln.h })
        }
      }
    }
    return out
  }, [active, showAllOcr, activeQuery, matches])

  if (serviceIds === null) {
    return (
      <div className="mb-6 flex h-[40vh] items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
        {t('loading')}
      </div>
    )
  }
  if (pages.length === 0 || !active) {
    return (
      <div className="mb-6 flex h-[40vh] items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
        {t('noImages')}
      </div>
    )
  }

  const goToPage = (pageId: string) => {
    if (pageId !== active.page_id) setActiveId(pageId)
  }
  const focusOnLine = (pageId: string, line: OcrLine) => {
    if (pageId !== active.page_id) {
      setActiveId(pageId)
      setTimeout(() => viewerApi.current?.zoomToBox(line), 300)
      return
    }
    viewerApi.current?.zoomToBox(line)
  }

  const tabBtn = (id: Tab, label: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className={`flex-1 px-3 py-2 text-sm font-medium transition ${
        tab === id
          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 border-b-2 border-amber-500'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0">
        <OpenSeadragonViewer
          ref={viewerApi}
          key={active.infoUrl}
          infoUrl={active.infoUrl}
          className="w-full h-[calc(100vh-12rem)] min-h-[420px] bg-black rounded-lg overflow-hidden"
          highlightImageWidth={active.image_width}
          highlightImageHeight={active.image_height}
          highlights={activeHighlights}
          focusedHighlightId={hoveredId}
        />
      </div>

      <aside className="flex h-[calc(100vh-12rem)] min-h-[420px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {tabBtn(
            'hits',
            <>
              {t('inPageSearch')}
              {activeQuery && <span className="ml-1 text-xs font-normal text-gray-500">({totalHits})</span>}
            </>,
          )}
          {tabBtn('pages', <>{t('pages')} ({pages.length})</>)}
          {tabBtn('ocr', t('ocr'))}
        </div>

        {tab === 'hits' ? (
          <div className="flex flex-1 flex-col overflow-y-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                submitQuery(draft)
              }}
              className="sticky top-0 z-10 flex items-center gap-1 border-b border-gray-200 bg-white px-2 py-1.5 dark:border-gray-800 dark:bg-gray-900"
            >
              <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('searchPlaceholder')}
                aria-label={t('searchPlaceholder')}
                className="min-w-0 flex-1 bg-transparent px-1 py-1 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100"
              />
              {draft && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft('')
                    submitQuery('')
                  }}
                  aria-label={t('clear')}
                  className="rounded p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
              <button type="submit" className="rounded-md bg-amber-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-amber-500">
                {t('search')}
              </button>
            </form>

            <div className="flex-1 p-2">
              {!activeQuery ? (
                <div className="py-8 text-center text-sm text-gray-500">{t('noQuery')}</div>
              ) : matches.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">{t('noHits', { q: activeQuery })}</div>
              ) : (
                <ul className="space-y-3">
                  {matches.map((m) => {
                    const isActiveGroup = m.page.page_id === active.page_id
                    return (
                      <li key={m.page.page_id}>
                        <div
                          className={`mb-1 flex items-center justify-between px-1 font-mono text-xs ${
                            isActiveGroup ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          <span>
                            {m.page.page_key}
                            {isActiveGroup && <span className="ml-1 font-normal">{t('showing')}</span>}
                          </span>
                          <span className="font-normal text-gray-500">{t('count', { n: m.lines.length })}</span>
                        </div>
                        <ul className="space-y-1">
                          {m.lines.slice(0, 50).map((ln) => {
                            const hid = `hit:${m.page.page_id}:${ln.lineIdx}`
                            return (
                              <li
                                key={hid}
                                onMouseEnter={() => isActiveGroup && ln.hasBox && setHoveredId(hid)}
                                onMouseLeave={() => setHoveredId(null)}
                                className={`flex items-start gap-1 rounded px-1 py-0.5 ${
                                  isActiveGroup
                                    ? 'bg-amber-50/80 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-800/40'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => goToPage(m.page.page_id)}
                                  className="flex-1 px-1 py-0.5 text-left text-sm leading-relaxed text-gray-700 dark:text-gray-200"
                                  title={isActiveGroup ? t('clickToFocus') : t('goToPage')}
                                >
                                  {highlightText(ln.text, activeQuery || null)}
                                </button>
                                {isActiveGroup && ln.hasBox && (
                                  <button
                                    type="button"
                                    onClick={() => focusOnLine(m.page.page_id, ln)}
                                    aria-label={t('focusArea')}
                                    title={t('focusArea')}
                                    className="mt-0.5 shrink-0 rounded p-1 text-amber-600 hover:bg-amber-200/70 hover:text-amber-700 dark:text-amber-300 dark:hover:bg-amber-800/60"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m-3-3h6" />
                                    </svg>
                                  </button>
                                )}
                              </li>
                            )
                          })}
                          {m.lines.length > 50 && (
                            <li className="px-2 text-xs text-gray-500">{t('moreHits', { n: m.lines.length - 50 })}</li>
                          )}
                        </ul>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : tab === 'pages' ? (
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {pages.map((p) => {
                const selected = p.page_id === active.page_id
                const hits = matches.find((x) => x.page.page_id === p.page_id)
                return (
                  <button
                    key={p.page_id}
                    type="button"
                    onClick={() => setActiveId(p.page_id)}
                    aria-pressed={selected}
                    title={p.page_key}
                    className={`group relative flex flex-col items-center gap-1 rounded-md border p-1 transition ${
                      selected
                        ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-300/60 dark:bg-amber-900/10'
                        : 'border-gray-200 hover:border-gray-400 dark:border-gray-700'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbUrl(p.serviceId)}
                      alt={p.page_key}
                      loading="lazy"
                      className="aspect-[3/4] w-full rounded-sm bg-gray-100 object-cover dark:bg-gray-800"
                    />
                    <span className="font-mono text-[11px] text-gray-700 dark:text-gray-300">{p.page_key}</span>
                    {hits && (
                      <span className="absolute right-1 top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                        {hits.lines.length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-2 overflow-y-auto p-2">
            {(active.lines?.length ?? 0) > 0 && (
              <label className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={showAllOcr}
                  onChange={(e) => setShowAllOcr(e.target.checked)}
                  className="accent-amber-600"
                />
                {t('showAllOcr', { n: active.lines?.length ?? 0 })}
              </label>
            )}
            <div className="-mt-1 px-2 text-[11px] text-gray-500">{active.page_key}</div>
            <ul className="space-y-0.5 px-1">
              {displayLines(active).map((ln) => {
                const hid = `ocr:${active.page_id}:${ln.lineIdx}`
                return (
                  <li
                    key={hid}
                    onMouseEnter={() => ln.hasBox && setHoveredId(hid)}
                    onMouseLeave={() => setHoveredId(null)}
                    className="flex items-start gap-1 rounded px-1 py-0.5 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <span className="flex-1 px-1 py-0.5 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                      {highlightText(ln.text, activeQuery || null)}
                    </span>
                    {ln.hasBox && (
                      <button
                        type="button"
                        onClick={() => viewerApi.current?.zoomToBox(ln)}
                        aria-label={t('focusArea')}
                        title={t('focusArea')}
                        className="mt-0.5 shrink-0 rounded p-1 text-gray-400 hover:bg-amber-100/60 hover:text-amber-700 dark:hover:bg-amber-800/40 dark:hover:text-amber-300"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m-3-3h6" />
                        </svg>
                      </button>
                    )}
                  </li>
                )
              })}
              {displayLines(active).length === 0 && (
                <li className="px-2 py-3 text-xs text-gray-500">{t('noLineData')}</li>
              )}
            </ul>
          </div>
        )}
      </aside>
    </div>
  )
}
