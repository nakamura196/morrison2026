'use client'

/**
 * 分類の内訳を面積で見せる図。
 *
 * 面積 = 件数。外側の枠が大分類 (1972 年の内容分類カタログの大区分)、その中の
 * 濃い区画が請求記号の下位区分 (P-III-a など)。区画を押すと、その範囲だけを
 * 絞り込んだ検索結果に移る。
 *
 * 色は 1 色だけ使う。大きさで件数を示しているので、濃淡で件数を重ねて示すと
 * 同じことを二度言うことになり、色の区別が効かない人にも伝わらない。
 *
 * 画面の幅で図の形を変える。横長と縦長の 2 つを組んでおき、CSS でどちらかを
 * 隠す。組み方 (squarify) は縦横比で結果が変わるため、1 つを引き伸ばすと
 * 細長い短冊ばかりになってしまう。
 */

import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { formatCount } from '@/libs/format'
import { callNumberPrefixHref, classificationHref } from '@/libs/search-link'
import type { ClassificationNode } from '@/libs/stats'
import { squarify } from '@/libs/treemap'
import { ChartTooltip, useChartTooltip } from './chart-ui'

interface Layout {
  /** 組み方に使う座標の大きさ。画面上の比率はこの縦横比になる。 */
  width: number
  height: number
  /** 座標 1 あたり、画面でおよそ何 px になるか。文字が入るかの判断に使う。 */
  pxPerUnit: number
  /** 大分類の中をさらに区分に割るか。狭い画面では割らない。 */
  nested: boolean
}

const WIDE: Layout = { width: 1000, height: 560, pxPerUnit: 0.9, nested: true }
const TALL: Layout = { width: 640, height: 880, pxPerUnit: 0.52, nested: false }

/** 見出し帯の高さ (画面上の px)。 */
const HEADER_PX = 24

/** 12px の欧文 1 文字のおおよその幅。文字が収まるかの見積もりに使う。 */
const CHAR_PX = 7.2

/** 区画の中に名前を出すのは、収まると見込めるときだけ。はみ出させない。 */
function fitsLabel(text: string, widthPx: number, heightPx: number, minHeightPx: number): boolean {
  return heightPx >= minHeightPx && widthPx >= text.length * CHAR_PX + 14
}

/** 「III. CHINA」→「III」。名前が入らないときの短い呼び方。 */
function shortName(key: string): string {
  return key.split(/[.\s]/)[0] || key
}

export default function ClassificationTreemap({ nodes }: { nodes: ClassificationNode[] }) {
  return (
    <>
      <Figure nodes={nodes} layout={WIDE} className="hidden sm:block" />
      <Figure nodes={nodes} layout={TALL} className="sm:hidden" />
    </>
  )
}

function Figure({
  nodes,
  layout,
  className,
}: {
  nodes: ClassificationNode[]
  layout: Layout
  className: string
}) {
  const t = useTranslations('VisualizePage')
  const { containerRef, tooltip, showForElement, hide } = useChartTooltip()

  const rects = squarify(
    nodes.map((node) => ({ key: node.key, value: node.count, node })),
    layout.width,
    layout.height,
  )

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
        onMouseLeave={hide}
      >
        {rects.map(({ item, x, y, width, height }) => {
          const node = item.node
          const widthPx = width * layout.pxPerUnit
          const heightPx = height * layout.pxPerUnit
          const nested = layout.nested && node.children.length >= 2 && heightPx >= 96 && widthPx >= 130

          return (
            <div
              key={node.key}
              className="absolute"
              style={{
                left: `${(x / layout.width) * 100}%`,
                top: `${(y / layout.height) * 100}%`,
                width: `${(width / layout.width) * 100}%`,
                height: `${(height / layout.height) * 100}%`,
              }}
            >
              {nested ? (
                <NestedGroup
                  node={node}
                  widthUnits={width}
                  heightUnits={height}
                  layout={layout}
                  onHover={showForElement}
                  onLeave={hide}
                  countLabel={t('itemsCount', { count: formatCount(node.count) })}
                />
              ) : (
                <LeafTile
                  href={classificationHref(node.key)}
                  name={node.key}
                  count={node.count}
                  countLabel={t('itemsCount', { count: formatCount(node.count) })}
                  widthPx={widthPx}
                  heightPx={heightPx}
                  onHover={showForElement}
                  onLeave={hide}
                />
              )}
            </div>
          )
        })}
        <ChartTooltip state={tooltip} />
      </div>
    </div>
  )
}

/** 大分類の枠。見出し帯 + 中を下位区分で割ったもの。 */
function NestedGroup({
  node,
  widthUnits,
  heightUnits,
  layout,
  onHover,
  onLeave,
  countLabel,
}: {
  node: ClassificationNode
  widthUnits: number
  heightUnits: number
  layout: Layout
  onHover: (label: string, value: string, element: HTMLElement) => void
  onLeave: () => void
  countLabel: string
}) {
  const t = useTranslations('VisualizePage')
  const innerHeightUnits = Math.max(heightUnits - HEADER_PX / layout.pxPerUnit, 1)
  const childRects = squarify(
    node.children.map((child) => ({ key: child.key, value: child.count })),
    widthUnits,
    innerHeightUnits,
  )

  const headerWidthPx = widthUnits * layout.pxPerUnit
  const headerText = fitsLabel(node.key, headerWidthPx - 70, HEADER_PX, 0)
    ? node.key
    : shortName(node.key)

  return (
    <div className="absolute inset-[1px] overflow-hidden rounded-[3px] bg-chart-soft">
      <Link
        href={classificationHref(node.key)}
        className="flex items-center justify-between gap-2 px-2 text-[11px] font-medium text-ink hover:underline"
        style={{ height: HEADER_PX }}
        title={`${node.key} — ${countLabel}`}
      >
        <span className="truncate">{headerText}</span>
        <span className="shrink-0 tabular-nums text-ink-muted">{formatCount(node.count)}</span>
      </Link>

      <div className="absolute inset-x-0 bottom-0" style={{ top: HEADER_PX }}>
        {childRects.map(({ item, x, y, width, height }) => (
          <div
            key={item.key}
            className="absolute"
            style={{
              left: `${(x / widthUnits) * 100}%`,
              top: `${(y / innerHeightUnits) * 100}%`,
              width: `${(width / widthUnits) * 100}%`,
              height: `${(height / innerHeightUnits) * 100}%`,
            }}
          >
            <LeafTile
              href={callNumberPrefixHref(item.key)}
              name={item.key}
              count={item.value}
              countLabel={t('itemsCount', { count: formatCount(item.value) })}
              widthPx={width * layout.pxPerUnit}
              heightPx={height * layout.pxPerUnit}
              onHover={onHover}
              onLeave={onLeave}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/** 押せる区画 1 つ。間の 2px の隙間は inset-[1px] で作る (線は引かない)。 */
function LeafTile({
  href,
  name,
  count,
  countLabel,
  widthPx,
  heightPx,
  onHover,
  onLeave,
}: {
  href: string
  name: string
  count: number
  countLabel: string
  widthPx: number
  heightPx: number
  onHover: (label: string, value: string, element: HTMLElement) => void
  onLeave: () => void
}) {
  const full = fitsLabel(name, widthPx, heightPx, 22)
  const short = shortName(name)
  const label = full ? name : fitsLabel(short, widthPx, heightPx, 22) ? short : null
  const showCount = label !== null && heightPx >= 42 && widthPx >= 56

  return (
    <Link
      href={href}
      title={`${name} — ${countLabel}`}
      aria-label={`${name} — ${countLabel}`}
      onMouseEnter={(e) => onHover(name, countLabel, e.currentTarget)}
      onFocus={(e) => onHover(name, countLabel, e.currentTarget)}
      onBlur={onLeave}
      className="absolute inset-[1px] flex flex-col justify-center overflow-hidden rounded-[3px] bg-chart-fill px-1.5 text-chart-on-fill transition-colors hover:bg-chart-fill-hover"
    >
      {label && <span className="text-[11px] font-medium leading-tight">{label}</span>}
      {showCount && (
        <span className="text-[10px] leading-tight tabular-nums opacity-85">
          {formatCount(count)}
        </span>
      )}
    </Link>
  )
}
