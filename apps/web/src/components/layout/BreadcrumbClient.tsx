'use client'

import { Breadcrumb } from '@toyo/shared-ui'
import { Link } from '@/i18n/routing'
import type { BreadcrumbTranslations, BreadcrumbItem } from '@toyo/shared-ui'

interface BreadcrumbClientProps {
  title: string
  items?: BreadcrumbItem[]
  t: BreadcrumbTranslations
}

export default function BreadcrumbClient({ title, items, t }: BreadcrumbClientProps) {
  return (
    <Breadcrumb
      title={title}
      items={items}
      t={t}
      LinkComponent={Link}
    />
  )
}
