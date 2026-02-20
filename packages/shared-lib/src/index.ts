// OpenSearch utilities
export {
  validateQuery,
  validateDocumentId,
  getAllowedIndices,
  fetchFromOpenSearch,
} from './opensearch'

// API utilities
export { createHeaders, createCorsHeaders } from './api'

// IIIF utilities
export {
  getHost,
  esSearch,
  createIIIFHeaders,
  buildCanvas,
  buildManifestV2,
  buildAnnotationList,
} from './iiif'

export type {
  IIIFCanvasImage,
  IIIFManifestOptions,
  IIIFAnnotation,
} from './iiif'
