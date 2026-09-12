import type { ReactNode } from 'react'

/**
 * 可視化ページの 1 枚分の枠。見出し・説明・図・注記・「表で見る」を同じ形に揃える。
 *
 * 図を足すときはこの枠に入れる。図そのものは中身 (children) として渡す。
 */
export default function Card({
  id,
  title,
  lead,
  children,
  note,
  table,
  tableLabel,
}: {
  id?: string
  title: string
  lead?: string
  children: ReactNode
  note?: string
  /** 目が見えない方・図が読めない環境のための表。図と同じ数字を載せる。 */
  table?: ReactNode
  tableLabel?: string
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-lg border border-line bg-surface-raised p-5 sm:p-7"
    >
      <h2 className="text-xl sm:text-2xl font-bold text-ink">{title}</h2>
      {lead && <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-muted">{lead}</p>}

      <div className="mt-6">{children}</div>

      {note && <p className="mt-5 text-xs leading-relaxed text-ink-subtle">{note}</p>}

      {table && (
        <details className="group mt-5 border-t border-line pt-4">
          <summary className="cursor-pointer text-sm font-medium text-brand hover:underline">
            {tableLabel}
          </summary>
          <div className="mt-4 overflow-x-auto">{table}</div>
        </details>
      )}
    </section>
  )
}

/** 「表で見る」の中身。左が名前、右が件数の 2 列。 */
export function CountTable({
  headers,
  rows,
}: {
  headers: [string, string]
  rows: { key: string; label: string; count: string; href?: string }[]
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-ink-muted">
          <th scope="col" className="py-2 pr-4 font-medium">
            {headers[0]}
          </th>
          <th scope="col" className="py-2 text-right font-medium">
            {headers[1]}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-b border-line/60 last:border-0">
            <th scope="row" className="py-2 pr-4 font-normal text-ink">
              {row.label}
            </th>
            <td className="py-2 text-right tabular-nums text-ink">{row.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
