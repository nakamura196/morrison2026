'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface CarouselTranslations {
  slide: (params: { number: number }) => string
  goToSlide: (params: { number: number }) => string
  previousSlide: string
  nextSlide: string
}

interface CarouselProps {
  slides: string[]
  interval?: number
  t: CarouselTranslations
}

export default function Carousel({
  slides,
  interval = 5000,
  t,
}: CarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  const startTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    timerRef.current = setInterval(() => {
      setCurrentSlide((current) => (current + 1) % slides.length)
    }, interval)
  }, [slides.length, interval])

  useEffect(() => {
    if (slides.length > 1) {
      startTimer()
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [startTimer, slides.length])

  const handleSlideChange = (index: number) => {
    setCurrentSlide(index)
    if (slides.length > 1) {
      startTimer()
    }
  }

  return (
    <div className="absolute inset-0 w-full h-full">
      {slides.map((slide, index) => (
        <div
          key={slide}
          className={`absolute inset-0 transition-all duration-1000 transform ${
            currentSlide === index ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${slide})` }}
            role="img"
            aria-label={t.slide({ number: index + 1 })}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
        </div>
      ))}

      {/* Navigation dots */}
      {slides.length > 1 && (
        <div className="hidden sm:flex absolute bottom-2 sm:bottom-4 md:bottom-6 left-1/2 transform -translate-x-1/2 space-x-1.5 sm:space-x-2 md:space-x-3 z-50">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 rounded-full transition-all duration-300 ${
                currentSlide === index ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/75'
              }`}
              onClick={() => handleSlideChange(index)}
            >
              <span className="sr-only">{t.goToSlide({ number: index + 1 })}</span>
            </button>
          ))}
        </div>
      )}

      {/* Arrow buttons */}
      {slides.length > 1 && (
        <>
          <button
            className="hidden sm:block absolute left-1 sm:left-2 md:left-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 md:p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-all duration-300 z-50 backdrop-blur-sm"
            onClick={() => handleSlideChange((currentSlide - 1 + slides.length) % slides.length)}
          >
            <span className="sr-only">{t.previousSlide}</span>
            <svg
              className="w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            className="hidden sm:block absolute right-1 sm:right-2 md:right-4 top-1/2 -translate-y-1/2 p-1.5 sm:p-2 md:p-3 rounded-full bg-black/30 text-white hover:bg-black/50 transition-all duration-300 z-50 backdrop-blur-sm"
            onClick={() => handleSlideChange((currentSlide + 1) % slides.length)}
          >
            <span className="sr-only">{t.nextSlide}</span>
            <svg
              className="w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
