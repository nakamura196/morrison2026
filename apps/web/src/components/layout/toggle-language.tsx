'use client';
import { useTranslations } from 'next-intl';

import { routing } from '@/i18n/routing';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/routing';

type ToggleLanguageProps = {
  variant?: 'header' | 'mobile';
};

export const ToggleLanguage = ({ variant = 'header' }: ToggleLanguageProps) => {
  const pathname = usePathname();
  const t = useTranslations('Header');
  const locale = useLocale();

  const colorClass =
    variant === 'header'
      ? 'text-gray-700 hover:text-black dark:text-gray-300 dark:hover:text-white'
      : 'text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white';

  const getPath = (loc: string) => {
    const p = (pathname || '').replace(`/${locale}`, '');

    if (p === '') {
      return `${loc}`;
    }

    return p;
  };

  return (
    <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
      {routing.locales.map((loc) => {
        if (loc !== locale) {
          return (
            <Link
              key={loc}
              href={getPath(loc)}
              locale={loc}
              className={`text-sm font-medium ${colorClass} cursor-pointer transition-colors`}
            >
              {t(loc)}
            </Link>
          );
        }
      })}
    </div>
  );
};
