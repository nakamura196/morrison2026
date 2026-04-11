export interface MorrisonItem {
  id: string
  title?: string
  titleStatement?: string
  description?: string
  abstract_en?: string
  abstract_ja?: string
  heading1?: string
  publication?: string
  publisher?: string
  date?: string
  isPartOf?: string
  format?: string
  callNumber?: string
  callNumber_converted?: string
  tag1?: string
  tag1_numbered?: string
  tag2?: string
  tag3?: string
  holding?: string
  references?: string
  has_image?: boolean
  publication_year?: string
  language?: string[]
  thumbnail_urls?: {
    small?: string
    medium?: string
    large?: string
  }
  omeka_id?: number
  /** Number of media images (from Omeka S) */
  media_count?: number
}
