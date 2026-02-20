'use client'

import type { ComponentType, ReactNode } from 'react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbTranslations {
  home: string
  ariaLabel: string
}

interface LinkProps {
  href: string
  children: ReactNode
  className?: string
}

interface BreadcrumbProps {
  title: string
  items?: BreadcrumbItem[]
  t: BreadcrumbTranslations
  LinkComponent: ComponentType<LinkProps>
}

export default function Breadcrumb({ title, items = [], t, LinkComponent }: BreadcrumbProps) {
  const allItems: BreadcrumbItem[] = [
    { label: t.home, href: '/' },
    ...items,
    { label: title },
  ]

  return (
    <nav aria-label={t.ariaLabel} className="mb-4">
      <ol className="flex flex-wrap items-center text-sm text-gray-600 dark:text-gray-400">
        {allItems.map((item, index) => (
          <li key={index} className="flex items-center">
            {index > 0 && (
              <svg
                className="w-4 h-4 mx-2 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
            {item.href ? (
              <LinkComponent
                href={item.href}
                className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
              >
                {item.label}
              </LinkComponent>
            ) : (
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
