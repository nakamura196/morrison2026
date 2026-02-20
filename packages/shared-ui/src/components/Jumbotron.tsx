'use client'

import type { ComponentType, ReactNode } from 'react'

export interface JumbotronTranslations {
  startSearch: string
}

export type ThemeColor = 'amber' | 'blue'

interface LinkProps {
  href: string
  children: ReactNode
  className?: string
}

interface JumbotronProps {
  siteName: string
  siteDescription: string
  backgroundImage?: string
  searchHref?: string
  themeColor?: ThemeColor
  LinkComponent: ComponentType<LinkProps>
  t: JumbotronTranslations
}

export default function Jumbotron({
  siteName,
  siteDescription,
  backgroundImage,
  searchHref = '/search',
  themeColor = 'amber',
  LinkComponent,
  t,
}: JumbotronProps) {
  const buttonColor = themeColor === 'amber'
    ? 'bg-amber-600 hover:bg-amber-700'
    : 'bg-blue-600 hover:bg-blue-700'

  return (
    <div className="relative h-[70vh] min-h-[500px]">
      {/* Background Image */}
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/40" />

      {/* Content */}
      <div className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 md:px-8">
        <div className="w-full max-w-[95%] sm:max-w-[90%] md:max-w-[85%] lg:max-w-[80%] xl:max-w-[75%] mx-auto text-center space-y-3 sm:space-y-4 md:space-y-6">
          <div
            className="space-y-2 sm:space-y-3 md:space-y-4 backdrop-blur-sm bg-black/20
            p-3 sm:p-4 md:p-6 lg:p-8 rounded-lg sm:rounded-xl md:rounded-2xl"
          >
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              {siteName}
            </h1>
            <p
              className="text-sm sm:text-base md:text-lg lg:text-xl
              text-gray-200 max-w-prose mx-auto
              leading-relaxed"
            >
              {siteDescription}
            </p>

            {/* CTA Button */}
            <div className="flex items-center justify-center mt-3 sm:mt-4 md:mt-6">
              <LinkComponent
                href={searchHref}
                className={`inline-flex items-center justify-center
                  px-4 sm:px-6 py-2 sm:py-3 ${buttonColor}
                  text-white font-medium rounded-full
                  transition-all duration-300
                  transform hover:scale-105 hover:shadow-lg
                  text-sm sm:text-base md:text-lg`}
              >
                <span>{t.startSearch}</span>
              </LinkComponent>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
