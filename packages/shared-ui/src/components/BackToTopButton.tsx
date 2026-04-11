'use client'

import { useState, useEffect } from 'react'

export interface BackToTopTranslations {
  backToTop: string
  backToPageTop: string
}

interface BackToTopButtonProps {
  t: BackToTopTranslations
  themeColor?: 'amber' | 'blue' | 'neutral'
}

export default function BackToTopButton({ t, themeColor = 'amber' }: BackToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
      }
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  const bgColor = themeColor === 'amber'
    ? 'bg-amber-600 hover:bg-amber-700'
    : themeColor === 'neutral'
    ? 'bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-800 dark:hover:bg-neutral-700'
    : 'bg-blue-600 hover:bg-blue-700'

  if (!isVisible) return null

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-6 right-6 p-3 ${bgColor} text-white rounded-full shadow-lg transition-all duration-300 z-50`}
      aria-label={t.backToPageTop}
      title={t.backToTop}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    </button>
  )
}
