/**
 * `npm audit` の結果を判定する。high 以上があれば失敗する。
 *
 * `npm audit --audit-level=high` をそのまま使わないのは、直せない既知の 1 件で
 * CI が止まり続け、そのうち誰かが監査ごと外してしまうため。除外する場合は下の
 * ALLOW に「理由」と「期限」を書いて残す。期限を過ぎたら、除外が書いてあっても
 * 失敗させる。「なぜ放置しているのか」と「いつ見直すのか」が常にこのファイルに残る。
 *
 * 手本: cj_front_next/scripts/audit.mjs
 *
 * 使い方: node scripts/audit.mjs
 */
import { execFileSync } from 'node:child_process'

// --- 2026-09-08 の導入時点で、すでに存在していた分 (baseline) ------------------
//
// この PR は「気づく仕組み」を入れるだけで、依存そのものは更新していない。
// 仕組みの導入と依存の更新を同じ PR に混ぜると、CI が赤くなったときに
// どちらが原因か切り分けられなくなるため。
//
// 下記はいずれも npm audit 上は修正版が存在する (fixAvailable)。同じ PR で
// 有効にした Dependabot が cooldown 付きで更新 PR を出すので、それで潰していく。
// 期限を過ぎれば、行が残っていても CI は失敗する = 放置できない。
const UNTIL = '2026-12-08'
const BASELINE =
  '導入時 (2026-09-08) から存在する既知分。修正版はあるが、依存更新は本 PR の対象外。Dependabot の更新 PR で解消する。'

// Next.js は 2026-09-09 の緊急対応で別途バージョンを上げる。ここは検知の仕組みを
// 入れるための一時的な除外なので、期限を 1 か月に切ってある。
const NEXT_UNTIL = '2026-10-08'
const NEXT_REASON =
  '2026-09-09 の Next.js 緊急対応で別途バージョンを上げる。本 PR は検知の仕組みだけを入れるため一時的に除外する。'

/** @type {{ id: string, package: string, until: string, reason: string }[]} */
const ALLOW = [
  { id: 'GHSA-3jxr-9vmj-r5cp', package: 'brace-expansion', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-mh99-v99m-4gvg', package: 'brace-expansion', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-rgw5-rvv9-x895', package: 'brace-expansion', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-73wf-gq98-2v4g', package: 'browserslist', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-c83g-rgw3-j3cx', package: 'browserslist', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-hmw2-7cc7-3qxx', package: 'form-data', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-2883-xcg3-v3hh', package: 'js-yaml', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-52cp-r559-cp3m', package: 'js-yaml', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-5p4m-2wfm-xmqj', package: 'js-yaml', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-28wg-ghj8-5hjv', package: 'nanoid', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-2v37-7h3g-55p8', package: 'nanoid', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-2xp9-vwfh-vxw4', package: 'next', until: NEXT_UNTIL, reason: NEXT_REASON }, // critical
  { id: 'GHSA-6gpp-xcg3-4w24', package: 'next', until: NEXT_UNTIL, reason: NEXT_REASON }, // high
  { id: 'GHSA-89xv-2m56-2m9x', package: 'next', until: NEXT_UNTIL, reason: NEXT_REASON }, // high
  { id: 'GHSA-m99w-x7hq-7vfj', package: 'next', until: NEXT_UNTIL, reason: NEXT_REASON }, // high
  { id: 'GHSA-p293-qw3h-jr36', package: 'next', until: NEXT_UNTIL, reason: NEXT_REASON }, // critical
  { id: 'GHSA-p9j2-gv94-2wf4', package: 'next', until: NEXT_UNTIL, reason: NEXT_REASON }, // high
  { id: 'GHSA-r28c-9q8g-f849', package: 'postcss', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-f88m-g3jw-g9cj', package: 'sharp', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-rgj7-g3m4-5g8c', package: 'sharp', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-4cwx-7wf7-3272', package: 'undici', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-hm92-r4w5-c3mj', package: 'undici', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-vmh5-mc38-953g', package: 'undici', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-vxpw-j846-p89q', package: 'undici', until: UNTIL, reason: BASELINE }, // high
  { id: 'GHSA-96hv-2xvq-fx4p', package: 'ws', until: UNTIL, reason: BASELINE }, // high
]

function audit() {
  try {
    return JSON.parse(
      execFileSync('npm', ['audit', '--json'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    )
  } catch (error) {
    // 脆弱性があると npm audit は終了コード 1 を返す。出力は標準出力に出ている。
    if (error.stdout) return JSON.parse(error.stdout)
    throw error
  }
}

const today = new Date().toISOString().slice(0, 10)
const report = audit()
const serious = new Map()

for (const [name, entry] of Object.entries(report.vulnerabilities ?? {})) {
  if (entry.severity !== 'high' && entry.severity !== 'critical') continue
  for (const via of entry.via) {
    // 文字列の via は「脆弱なパッケージに依存しているだけ」の参照。根本 advisory だけ見る。
    if (typeof via !== 'object') continue
    if (via.severity !== 'high' && via.severity !== 'critical') continue
    const id = (via.url || '').split('/').pop()
    const allowed = ALLOW.find((a) => a.id === id || a.id === via.source)
    if (allowed && allowed.until >= today) continue
    const key = `${via.name || name}|${id}`
    if (serious.has(key)) continue
    serious.set(key, {
      name: via.name || name,
      severity: via.severity,
      title: via.title,
      url: via.url,
      expired: allowed ? allowed.until : null,
    })
  }
}

for (const a of ALLOW) {
  if (a.until < today) {
    console.error(`除外の期限切れ: ${a.package} (${a.id}) の期限 ${a.until} を過ぎています。見直してください。`)
  }
}

if (serious.size === 0) {
  const skipped = ALLOW.filter((a) => a.until >= today)
  console.log(`high 以上の脆弱性なし (期限内の除外 ${skipped.length} 件)`)
  for (const a of skipped) console.log(`  除外中: ${a.package} ${a.id} (期限 ${a.until})`)
  process.exit(0)
}

console.error(`high 以上の脆弱性が ${serious.size} 件あります:`)
for (const s of serious.values()) {
  const note = s.expired ? ` [除外の期限 ${s.expired} 切れ]` : ''
  console.error(`  ${s.severity.padEnd(8)} ${s.name}: ${s.title}${note}`)
  console.error(`           ${s.url}`)
}
process.exit(1)
