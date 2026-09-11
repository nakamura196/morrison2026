'use client'

/**
 * 項目を指定して絞り込む欄。
 *
 * キーワード欄 (SearchBox) は全項目を横断して探すが、図書部の作業では
 * 「タイトルにこの語を含むものだけ」のように項目を指定した絞り込みがよく使われる
 * (2025-09-11 に東洋文庫図書部よりご要望)。旧 Omeka 版にはこの欄があった。
 *
 * 値は search-ui のフィルタとして持たせる。URL に載るので、絞り込んだ状態のまま
 * リンクを共有できる。実際の問い合わせの組み立ては
 * `app/api/[index]/search/route.ts` の buildFilterClauses を参照。
 */

import { useState } from 'react'
import { WithSearch } from '@elastic/react-search-ui'
import type { SearchContextState, FilterType, FilterValue, Filter } from '@elastic/search-ui'

/** 画面に出す項目と、検索エンジン側の項目名の対応。 */
export const FIELDS = [
  { field: 'title', labelKey: 'advTitle' },
  { field: 'heading1', labelKey: 'advAuthor' },
  { field: 'publication', labelKey: 'advPublication' },
  { field: 'callNumber', labelKey: 'advCallNumber' },
] as const

type Values = Record<string, string>

/** フィルタ一覧から、この欄が扱う項目の現在値を取り出す。 */
function readValues(filters: Filter[] | undefined): Values {
  const out: Values = {}
  for (const f of FIELDS) {
    const hit = filters?.find(x => x.field === f.field)
    const v = hit?.values?.[0]
    out[f.field] = typeof v === 'string' ? v : ''
  }
  return out
}

function Panel({
  filters,
  setFilter,
  removeFilter,
  t,
}: {
  filters?: Filter[]
  setFilter?: (name: string, value: FilterValue, type?: FilterType) => void
  removeFilter?: (name: string) => void
  t: (key: string) => string
}) {
  const applied = readValues(filters)
  const hasApplied = Object.values(applied).some(Boolean)
  const [open, setOpen] = useState(hasApplied)
  const [draft, setDraft] = useState<Values>(applied)

  const submit = () => {
    // 変わった項目だけを操作する。search-ui の絞り込みは 1 つずつ順に適用され、
    // 変化の無い項目まで毎回消しにいくと、直前に入れた条件ごと流れてしまう。
    for (const f of FIELDS) {
      const next = (draft[f.field] || '').trim()
      const now = applied[f.field] || ''
      if (next === now) continue
      if (next) setFilter?.(f.field, next, 'all')
      else removeFilter?.(f.field)
    }
  }

  const clear = () => {
    for (const f of FIELDS) {
      if (applied[f.field]) removeFilter?.(f.field)
    }
    setDraft({})
  }

  return (
    <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-800/60">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        <span>
          {t('advancedSearch')}
          {hasApplied && (
            <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              {t('advApplied')}
            </span>
          )}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-gray-200 px-4 py-4 dark:border-gray-700">
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map(f => (
              <label key={f.field} className="block text-sm">
                <span className="mb-1 block text-gray-600 dark:text-gray-400">{t(f.labelKey)}</span>
                <input
                  type="text"
                  value={draft[f.field] || ''}
                  onChange={e => setDraft(d => ({ ...d, [f.field]: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') submit()
                  }}
                  placeholder={f.field === 'callNumber' ? t('advCallNumberHint') : ''}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-800 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:focus:border-amber-400"
                />
              </label>
            ))}
          </div>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t('advNote')}</p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={submit}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              {t('advApply')}
            </button>
            <button
              type="button"
              onClick={clear}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t('advClear')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 絞り込み中の表示 (フィルタ) に出す見出し。
 *
 * フィルタの見出しはファセットの一覧から引いているが、ここの項目はファセット
 * ではないので引けず、`: travel` のように空欄になっていた。項目名を渡して補う。
 */
export function advancedFilterLabels(t: (key: string) => string): Record<string, string> {
  return Object.fromEntries(FIELDS.map(f => [f.field, t(f.labelKey)]))
}

export default function AdvancedSearch({ t }: { t: (key: string) => string }) {
  return (
    <WithSearch
      mapContextToProps={({ filters, setFilter, removeFilter }: Partial<SearchContextState>) => ({
        filters,
        setFilter,
        removeFilter,
      })}
    >
      {({ filters, setFilter, removeFilter }: Partial<SearchContextState>) => {
        // フィルタが外から変わったとき (戻る/進む・共有リンクで開いたとき) は
        // key を変えて作り直し、入力欄の初期値を取り直す。
        const applied = readValues(filters)
        const key = FIELDS.map(f => `${f.field}=${applied[f.field]}`).join('&')
        return (
          <Panel key={key} filters={filters} setFilter={setFilter} removeFilter={removeFilter} t={t} />
        )
      }}
    </WithSearch>
  )
}
