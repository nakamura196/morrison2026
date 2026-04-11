'use client'

import { useTranslations } from 'next-intl'
import { BackToTopButton } from '@toyo/shared-ui'

export default function BackToTopButtonClient() {
  const t = useTranslations('BackToTop')

  return (
    <BackToTopButton
      t={{
        backToTop: t('backToTop'),
        backToPageTop: t('backToPageTop'),
      }}
      themeColor="neutral"
    />
  )
}
