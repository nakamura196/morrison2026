'use client'

/**
 * 分類ごとに、本文 (OCR) がどこまで入っているかを帯で示す。
 *
 * 帯の色が濃い部分 = 本文が入っている資料。薄い部分 = まだ画像だけの資料。
 * 押すと、その分類のうち本文が入っているものだけを絞り込んだ検索に移る。
 */

import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { formatCount, formatPercent } from '@/libs/format'
import { classificationFulltextHref } from '@/libs/search-link'
import type { ClassificationNode } from '@/libs/stats'

export default function CoverageMeters({ nodes }: { nodes: ClassificationNode[] }) {
  const t = useTranslations('VisualizePage')

  if (nodes.length === 0) {
    return <p className="text-sm text-ink-muted">{t('noData')}</p>
  }

  const rows = [...nodes].sort((a, b) => b.count - a.count)

  return (
    <ul className="space-y-2">
      {rows.map((node) => {
        const share = formatPercent(node.fulltextCount, node.count)
        return (
          <li key={node.key}>
            <Link
              href={classificationFulltextHref(node.key)}
              aria-label={t('coverageAria', {
                name: node.key,
                done: formatCount(node.fulltextCount),
                total: formatCount(node.count),
              })}
              className="group grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-brand-soft sm:grid-cols-[minmax(0,16rem)_1fr_3.5rem]"
            >
              <span className="truncate text-sm text-ink group-hover:text-brand" title={node.key}>
                {node.key}
              </span>
              <span
                className="flex h-3 overflow-hidden rounded-[4px] bg-chart-track"
                aria-hidden="true"
              >
                <span
                  className="h-3 rounded-r-[4px] bg-chart-fill transition-colors group-hover:bg-chart-fill-hover"
                  style={{
                    width: `${node.count > 0 ? (node.fulltextCount / node.count) * 100 : 0}%`,
                  }}
                />
              </span>
              <span className="text-right text-sm tabular-nums text-ink-muted">{share}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
