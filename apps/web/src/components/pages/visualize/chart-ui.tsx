'use client'

/** 図のための小さな共通部品 (吹き出し)。数字の書き方は libs/format.ts にある。 */

import { useCallback, useRef, useState } from 'react'

export interface TooltipState {
  label: string
  value: string
  x: number
  y: number
}

/**
 * 図の上に浮かべる吹き出し。棒や区画が細くて文字を置けないときの逃げ道になる。
 * 位置は図の左上からの座標で受け取る。
 */
export function ChartTooltip({ state }: { state: TooltipState | null }) {
  if (!state) return null
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-20 max-w-[16rem] -translate-x-1/2 -translate-y-full rounded-md bg-ink px-2.5 py-1.5 text-xs leading-snug text-surface-raised shadow-lg"
      style={{ left: state.x, top: state.y - 10 }}
    >
      <span className="font-medium">{state.label}</span>
      <span className="ml-2 tabular-nums opacity-80">{state.value}</span>
    </div>
  )
}

/**
 * 吹き出しの出し入れ。図を包む要素に ref を付けて使う。
 * マウスだけでなく、キーボードで移動したときにも出す。
 */
export function useChartTooltip() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const show = useCallback((label: string, value: string, clientX: number, clientY: number) => {
    const box = containerRef.current?.getBoundingClientRect()
    if (!box) return
    const x = Math.min(Math.max(clientX - box.left, 8), box.width - 8)
    const y = Math.min(Math.max(clientY - box.top, 0), box.height)
    setTooltip({ label, value, x, y })
  }, [])

  const showForElement = useCallback((label: string, value: string, element: HTMLElement) => {
    const box = containerRef.current?.getBoundingClientRect()
    const target = element.getBoundingClientRect()
    if (!box) return
    setTooltip({
      label,
      value,
      x: Math.min(Math.max(target.left + target.width / 2 - box.left, 8), box.width - 8),
      y: Math.max(target.top - box.top, 0),
    })
  }, [])

  const hide = useCallback(() => setTooltip(null), [])

  return { containerRef, tooltip, show, showForElement, hide }
}
