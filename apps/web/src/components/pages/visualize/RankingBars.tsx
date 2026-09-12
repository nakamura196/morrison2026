'use client'

/**
 * 上位の語を横棒で並べる図。著者の順位と、本文から抽出した固有表現に使う。
 *
 * 棒の長さ = 件数。色は 1 色。行のどこを押しても、その語で絞り込んだ検索に移る。
 *
 * リンク先と読み上げ文は、呼ぶ側で組み立てて渡す (サーバ側の部品から関数を
 * 渡すことはできないため)。
 */

import { Link } from '@/i18n/routing'
import { formatCount } from '@/libs/format'

export interface RankingRow {
  key: string
  count: number
  href: string
  /** 読み上げ用の説明。「◯◯ — 38 件」のような文。 */
  ariaLabel: string
}

export default function RankingBars({
  rows,
  emptyLabel,
}: {
  rows: RankingRow[]
  emptyLabel: string
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-ink-muted">{emptyLabel}</p>
  }

  const max = rows.reduce((m, row) => Math.max(m, row.count), 0)

  return (
    <ol className="space-y-1">
      {rows.map((row) => (
        <li key={row.key}>
          <Link
            href={row.href}
            aria-label={row.ariaLabel}
            className="group grid grid-cols-[minmax(0,9rem)_1fr_3.5rem] items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-brand-soft sm:grid-cols-[minmax(0,14rem)_1fr_4rem]"
          >
            <span className="truncate text-sm text-ink group-hover:text-brand" title={row.key}>
              {row.key}
            </span>
            <span className="flex h-3 items-center" aria-hidden="true">
              <span
                className="h-3 rounded-r-[4px] bg-chart-fill transition-colors group-hover:bg-chart-fill-hover"
                style={{ width: `${max > 0 ? Math.max((row.count / max) * 100, 1) : 0}%` }}
              />
            </span>
            <span className="text-right text-sm tabular-nums text-ink-muted">
              {formatCount(row.count)}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}
