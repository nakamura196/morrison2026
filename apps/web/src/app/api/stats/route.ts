/**
 * 可視化ページが使う集計値。
 *
 * GET /api/stats — 分類・出版年・著者・本文の固有表現の件数をまとめて返す。
 * ページ側はサーバ側で libs/stats-data.ts を直に呼ぶので、この経路は外部から
 * 同じ数字を取りたいとき (再利用・確認) のためのもの。
 */

import { fetchStats, STATS_REVALIDATE_SECONDS } from '@/libs/stats-data'

/**
 * 毎回その場で数える。書き出し (ビルド) のときは検索エンジンに繋がらないため、
 * 静的に焼くと空の集計が固定されてしまう (実際にそうなっていた)。
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const stats = await fetchStats()
    return new Response(JSON.stringify(stats), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': `s-maxage=${STATS_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Stats API error:', error)
    return new Response(JSON.stringify({ error: 'Failed to build statistics' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
