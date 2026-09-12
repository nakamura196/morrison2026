'use client'

/**
 * 本文から抽出した固有表現 (人名・地名・組織名・年月日) の上位語。
 *
 * 件数は「その語が出てくるページ数」。資料の数ではない。押すと全文検索の
 * 絞り込みに移り、その語が実際に出てくるページだけが並ぶ。
 */

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { entityHref } from '@/libs/search-link'
import { ENTITY_FIELDS, type EntityField, type NameCount } from '@/libs/stats'
import { formatCount } from '@/libs/format'
import RankingBars from './RankingBars'

const TAB_LABEL_KEY: Record<EntityField, string> = {
  ne_persName: 'entityPersName',
  ne_placeName: 'entityPlaceName',
  ne_orgName: 'entityOrgName',
  ne_date: 'entityDate',
}

export default function EntityRanking({
  entities,
  entityPages,
}: {
  entities: Record<EntityField, NameCount[]>
  entityPages: Record<EntityField, number>
}) {
  const t = useTranslations('VisualizePage')
  const [active, setActive] = useState<EntityField>('ne_persName')

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label={t('entityTabsLabel')}>
        {ENTITY_FIELDS.map((field) => (
          <button
            key={field}
            type="button"
            role="tab"
            aria-selected={active === field}
            onClick={() => setActive(field)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              active === field
                ? 'bg-brand text-white'
                : 'border border-line bg-surface-raised text-ink-muted hover:bg-brand-soft'
            }`}
          >
            {t(TAB_LABEL_KEY[field])}
          </button>
        ))}
      </div>

      <RankingBars
        rows={entities[active].map((item) => ({
          key: item.key,
          count: item.count,
          href: entityHref(active, item.key),
          ariaLabel: `${item.key} — ${t('pagesCount', { count: formatCount(item.count) })}`,
        }))}
        emptyLabel={t('noData')}
      />

      <p className="mt-4 text-xs leading-relaxed text-ink-subtle">
        {t('entityNote', { count: formatCount(entityPages[active]) })}
      </p>
    </div>
  )
}
