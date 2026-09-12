import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { formatCount, formatPercent } from '@/libs/format'
import { flagHref } from '@/libs/search-link'
import type { Stats } from '@/libs/stats'

/**
 * ページの冒頭に置く数字。
 *
 * 資料の件数だけを大きく出し (このページで最初に読む数字)、画像と本文は
 * それを支える小さな数字として並べる。図にするほどの中身ではないので棒にしない。
 */
export default function Overview({ stats }: { stats: Stats }) {
  const t = useTranslations('VisualizePage')

  return (
    <div className="rounded-lg border border-line bg-surface-raised p-5 sm:p-7">
      <div className="grid gap-6 sm:grid-cols-3 sm:items-end">
        <div>
          <p className="text-sm text-ink-muted">{t('heroLabel')}</p>
          <p className="mt-1 font-sans text-5xl font-semibold leading-none text-ink">
            {formatCount(stats.totalItems)}
          </p>
          <p className="mt-2 text-sm text-ink-muted">{t('heroUnit')}</p>
        </div>

        <Tile
          label={t('tileImagePages')}
          value={formatCount(stats.totalImagePages)}
          unit={t('unitPages')}
        />

        <Tile
          label={t('tileFulltext')}
          value={formatCount(stats.withFulltext)}
          unit={t('unitItems')}
          sub={t('tileFulltextShare', {
            percent: formatPercent(stats.withFulltext, stats.totalItems),
          })}
          href={flagHref('has_fulltext', true)}
          linkLabel={t('seeItems')}
        />
      </div>
    </div>
  )
}

function Tile({
  label,
  value,
  unit,
  sub,
  href,
  linkLabel,
}: {
  label: string
  value: string
  unit: string
  sub?: string
  href?: string
  linkLabel?: string
}) {
  return (
    <div className="border-t border-line pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className="mt-1 font-sans text-3xl font-semibold leading-none text-ink">{value}</p>
      <p className="mt-2 text-sm text-ink-muted">{unit}</p>
      {sub && <p className="mt-1 text-xs text-ink-subtle">{sub}</p>}
      {href && linkLabel && (
        <Link href={href} className="mt-2 inline-block text-xs text-brand hover:underline">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}
