/**
 * 可視化ページのデータ取得。集計の中身は libs/stats.ts にある。
 *
 * 検索エンジンへの問い合わせは 2 本 (書誌・本文)。片方が落ちても残りは出せるよう、
 * それぞれ独立に扱い、失敗した側は空のまま返す。
 */

import { esSearch } from '@toyo/shared-lib'
import { ensureEnv } from './cf-env'
import { BIB_INDEX, FULLTEXT_INDEX } from './dts'
import {
  buildBibAggsQuery,
  buildEntityAggsQuery,
  emptyStats,
  parseBibStats,
  parseEntityStats,
  type Stats,
} from './stats'

/** 集計は 1 時間もたせる。資料の追加は日に何度も起きない。 */
export const STATS_REVALIDATE_SECONDS = 3600

export async function fetchStats(): Promise<Stats> {
  ensureEnv()

  const [bib, entity] = await Promise.allSettled([
    esSearch(BIB_INDEX, buildBibAggsQuery()),
    esSearch(FULLTEXT_INDEX, buildEntityAggsQuery()),
  ])

  const base = emptyStats()

  // 検索エンジンは、集計を断るときも 200 で `error` を返す。投げてこないので、
  // ここで見ておかないと原因が分からないまま 0 件のページが出る。
  logEsError('bib', bib)
  logEsError('entity', entity)

  if (bib.status === 'fulfilled') Object.assign(base, parseBibStats(bib.value))
  if (entity.status === 'fulfilled') Object.assign(base, parseEntityStats(entity.value))

  return base
}

function logEsError(label: string, result: PromiseSettledResult<unknown>): void {
  if (result.status === 'rejected') {
    console.error(`Stats: ${label} aggregation failed:`, result.reason)
    return
  }
  const error = (result.value as { error?: unknown } | null)?.error
  if (error) {
    console.error(`Stats: ${label} aggregation rejected by Elasticsearch:`, JSON.stringify(error))
  }
}
