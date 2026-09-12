'use client'

/**
 * 出版年ごとの件数。
 *
 * 既定は 10 年ごと。細かく見たいときは「1 年ごと」に切り替える。棒を押すと、
 * その年 (または 10 年分) に絞り込んだ検索結果に移る。
 *
 * 棒は 1 色。高さが件数なので、色で件数を重ねて示さない。
 */

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { formatCount } from '@/libs/format'
import { publicationYearHref } from '@/libs/search-link'
import type { YearBucket } from '@/libs/stats'
import { ChartTooltip, useChartTooltip } from './chart-ui'

type Grain = 'decade' | 'year'

interface Column {
  /** 画面に出す見出し (「1900年代」「1904」)。 */
  label: string
  /** 軸に出す短い見出し。 */
  tick: string
  count: number
  /** この棒に含まれる年。検索の絞り込みにそのまま渡す。件数 0 のときは空。 */
  years: string[]
  /** 軸に見出しを出す位置か。 */
  major: boolean
  /** 狭い画面でも見出しを出す位置か (数を間引く)。 */
  majorNarrow: boolean
}

/** 棒の太さの上限。太い塊は図を騒がしくする。 */
const MAX_BAR_PX = 24

function toColumns(
  years: YearBucket[],
  grain: Grain,
  decadeSuffix: string,
  yearSuffix: string,
): Column[] {
  if (years.length === 0) return []

  const counts = new Map<number, number>()
  for (const y of years) counts.set(y.year, y.count)
  const first = years[0].year
  const last = years[years.length - 1].year

  if (grain === 'year') {
    // 資料の無い年も棒 1 本分の場所を空けておく。年の目盛りを詰めてしまうと、
    // 出版の無かった時期が図から消え、時の流れが実際と違って見える。
    const columns: Column[] = []
    for (let year = first; year <= last; year++) {
      const count = counts.get(year) || 0
      columns.push({
        label: `${year}${yearSuffix}`,
        tick: String(year),
        count,
        years: count > 0 ? [String(year)] : [],
        major: year % 20 === 0,
        majorNarrow: year % 50 === 0,
      })
    }
    return columns
  }

  const firstDecade = Math.floor(first / 10) * 10
  const lastDecade = Math.floor(last / 10) * 10
  const columns: Column[] = []
  for (let decade = firstDecade; decade <= lastDecade; decade += 10) {
    const included: string[] = []
    let count = 0
    for (let year = decade; year < decade + 10; year++) {
      const c = counts.get(year)
      if (c === undefined) continue
      count += c
      included.push(String(year))
    }
    columns.push({
      label: `${decade}${decadeSuffix}`,
      tick: String(decade),
      count,
      years: included,
      major: decade % 20 === 0,
      majorNarrow: decade % 40 === 0,
    })
  }
  return columns
}

export default function YearHistogram({
  years,
  missing,
}: {
  years: YearBucket[]
  missing: number
}) {
  const t = useTranslations('VisualizePage')
  const [grain, setGrain] = useState<Grain>('decade')
  const { containerRef, tooltip, show, showForElement, hide } = useChartTooltip()

  const columns = useMemo(
    () => toColumns(years, grain, t('decadeSuffix'), t('yearSuffix')),
    [years, grain, t],
  )
  const max = columns.reduce((m, c) => Math.max(m, c.count), 0)
  const peak = columns.reduce<Column | null>((best, c) => (!best || c.count > best.count ? c : best), null)

  if (columns.length === 0) {
    return <p className="text-sm text-ink-muted">{t('noData')}</p>
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {peak && (
          <p className="text-sm text-ink-muted">
            {t('yearPeak', { period: peak.label, count: formatCount(peak.count) })}
          </p>
        )}
        <div className="flex overflow-hidden rounded-full border border-line">
          {(['decade', 'year'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setGrain(value)}
              aria-pressed={grain === value}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                grain === value
                  ? 'bg-brand text-white'
                  : 'bg-surface-raised text-ink-muted hover:bg-brand-soft'
              }`}
            >
              {value === 'decade' ? t('byDecade') : t('byYear')}
            </button>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="relative" onMouseLeave={hide}>
        {/* 目盛り。細い実線を 1 段だけ地の色から離して引く */}
        <div className="relative mt-6 h-56 sm:h-64">
          {/* 目盛りは棒の下に敷く。pointer-events-none が無いと、線が棒の
              当たり判定を奪い、棒を押しても検索に移らない。 */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 border-t border-line" />
            <div className="absolute inset-x-0 top-1/2 border-t border-line" />
            <div className="absolute inset-x-0 bottom-0 border-t border-line" />
            <span className="absolute -top-2 left-0 -translate-y-full text-[11px] tabular-nums text-ink-subtle">
              {formatCount(max)}
            </span>
          </div>

          <div className="relative flex h-full items-end gap-[2px]">
            {columns.map((column) => {
              const countLabel = t('itemsCount', { count: formatCount(column.count) })
              if (column.years.length === 0) {
                return (
                  <span
                    key={column.label}
                    aria-hidden="true"
                    className="flex h-full flex-1 items-end justify-center"
                  />
                )
              }
              const href = publicationYearHref(column.years)
              return (
                <Link
                  key={column.label}
                  href={href}
                  onMouseMove={(e) => show(column.label, countLabel, e.clientX, e.clientY)}
                  onFocus={(e) => {
                    // 当たり判定は棒より背が高い。吹き出しは棒の先に合わせる。
                    const bar = e.currentTarget.firstElementChild
                    showForElement(column.label, countLabel, (bar as HTMLElement) ?? e.currentTarget)
                  }}
                  onBlur={hide}
                  aria-label={`${column.label} — ${countLabel}`}
                  className="group flex h-full flex-1 items-end justify-center"
                >
                  <span
                    className="w-full rounded-t-[4px] bg-chart-fill transition-colors group-hover:bg-chart-fill-hover group-focus-visible:bg-chart-fill-hover"
                    style={{
                      height: `${max > 0 ? (column.count / max) * 100 : 0}%`,
                      maxWidth: MAX_BAR_PX,
                    }}
                  />
                </Link>
              )
            })}
          </div>
        </div>

        {/* 年の目盛り */}
        <div className="relative mt-2 h-4">
          {columns.map((column, index) =>
            column.major ? (
              <span
                key={column.label}
                className={`absolute -translate-x-1/2 text-[11px] tabular-nums text-ink-subtle ${
                  column.majorNarrow ? '' : 'max-sm:hidden'
                }`}
                style={{ left: `${((index + 0.5) / columns.length) * 100}%` }}
              >
                {column.tick}
              </span>
            ) : null,
          )}
        </div>

        <ChartTooltip state={tooltip} />
      </div>

      {missing > 0 && (
        <p className="mt-4 text-xs text-ink-subtle">
          {t('yearMissing', { count: formatCount(missing) })}
        </p>
      )}
    </div>
  )
}
