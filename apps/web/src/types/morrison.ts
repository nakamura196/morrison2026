export interface MorrisonItem {
  id: string
  title?: string
  description?: string
  abstract?: string
  heading1?: string
  publication?: string
  format?: string
  callNumber?: string
  callNumber_converted?: string
  tag1?: string
  tag1_numbered?: string
  holding?: string
  has_image?: boolean
  publication_year?: string
  thumbnail_urls?: {
    small?: string
    medium?: string
    large?: string
  }
  omeka_id?: number
  /** Number of media images (from Omeka S) */
  media_count?: number
}
