import configJa from '@/config.json'

export interface Config {
  siteName: string
  siteDescription: string
  links: Array<{
    url: string
    title: string
    title_en: string
  }>
}

// Cache for config files
let configEn: Config | null = null

export async function getConfig(locale: string = 'ja'): Promise<Config> {
  if (locale === 'ja') {
    return configJa as Config
  }

  // Load English config dynamically only when needed
  if (locale === 'en') {
    if (!configEn) {
      try {
        configEn = (await import('@/config.en.json')).default as Config
      } catch (error) {
        console.warn('English config not found, falling back to Japanese')
        return configJa as Config
      }
    }
    return configEn
  }

  // Default to Japanese for any other locale
  return configJa as Config
}
