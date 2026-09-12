import { Link } from '@/i18n/routing'
import { HiCalendar, HiChevronRight } from 'react-icons/hi'
import type { NewsItem } from '@/libs/content'

/** Shared between the news index and the home page preview so both render a
 *  news entry the same way. */
export default function NewsList({
  items,
  emptyLabel,
}: {
  items: NewsItem[]
  emptyLabel: string
}) {
  if (items.length === 0) {
    return (
      <p className="text-center text-ink-muted py-12">{emptyLabel}</p>
    )
  }

  return (
    <ul className="divide-y divide-line">
      {items.map((item) => (
        <li key={item.slug}>
          <Link
            href={`/news/${item.slug}`}
            className="group flex items-start gap-4 px-4 sm:px-6 py-4 hover:bg-brand-soft transition-colors"
          >
            <span className="flex items-center text-ink-muted shrink-0 pt-0.5">
              <HiCalendar className="w-5 h-5 mr-2" aria-hidden="true" />
              <time dateTime={item.date} className="font-display tabular-nums">
                {item.date}
              </time>
            </span>
            <span className="flex-1 text-ink group-hover:text-brand transition-colors">
              {item.title}
            </span>
            <HiChevronRight
              className="w-5 h-5 text-ink-subtle group-hover:text-brand transition-colors shrink-0 mt-0.5"
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ul>
  )
}
