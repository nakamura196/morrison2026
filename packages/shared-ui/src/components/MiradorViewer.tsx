'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'

declare global {
  interface Window {
    Mirador: {
      viewer: (config: {
        id: string
        selectedTheme: string
        language: string
        windows: {
          id: string
          manifestId: string
          canvasId?: string
          thumbnailNavigationPosition: string | null
        }[]
        window: {
          allowFullscreen: boolean
          allowClose: boolean
          allowMaximize: boolean
          hideWindowTitle: boolean
          manifestId: string
          sideBarOpen: boolean
        }
        workspaceControlPanel: {
          enabled: boolean
        }
      }) => {
        store: {
          dispatch: (action: Record<string, unknown>) => void
          getState: () => Record<string, unknown>
          subscribe: (listener: () => void) => () => void
        }
      }
      setCanvas: (
        windowId: string,
        canvasId: string,
      ) => {
        type: string
        payload: { windowId: string; canvasId: string }
      }
      actions: {
        receiveAnnotation: (
          targetId: string,
          canvasId: string,
          annotationPage: {
            id: string
            type: string
            items: {
              id: string
              type: string
              motivation: string
              body: { type: string; value: string }
              target: string
            }[]
          },
        ) => Record<string, unknown>
      }
      receiveSearch?: (
        windowId: string,
        companionWindowId: string,
        searchId: string,
        searchJson: unknown,
      ) => Record<string, unknown>
      addCompanionWindow?: (
        windowId: string,
        payload: { content: string; position: string },
      ) => Record<string, unknown>
    }
  }
}

const getCanvas = async (manifest: string, imageId: string) => {
  const manifestData = await fetch(manifest)
  const manifestJson = await manifestData.json()
  const sequences = manifestJson.sequences
  if (!sequences || !sequences[0]?.canvases) return null

  const canvas = sequences[0].canvases.find(
    (c: { images: { resource: { service: { '@id': string } } }[] }) =>
      c.images[0]?.resource?.service?.['@id'] === imageId.replace('/info.json', ''),
  )
  return canvas ? canvas['@id'] : null
}

const getSearchHitsForCanvas = async (
  manifestUrl: string,
  canvasId: string,
  query: string,
): Promise<{ id: string; chars: string; xywh: string }[]> => {
  try {
    const manifestResponse = await fetch(manifestUrl)
    if (!manifestResponse.ok) return []

    const manifest = await manifestResponse.json()
    const services = manifest.service || []
    const searchService = (Array.isArray(services) ? services : [services]).find(
      (s: { profile?: string }) => s.profile?.includes('search'),
    )

    if (!searchService) return []

    const searchBaseUrl = searchService['@id'] || searchService.id
    const searchUrl = `${searchBaseUrl}?q=${encodeURIComponent(query)}`

    const response = await fetch(searchUrl)
    if (!response.ok) return []

    const data = await response.json()
    const resources = data.resources || []

    const hits: { id: string; chars: string; xywh: string }[] = []
    for (const resource of resources) {
      const [resourceCanvas, fragment] = resource.on.split('#')
      if (resourceCanvas === canvasId && fragment) {
        hits.push({
          id: resource['@id'] || resource.id,
          chars: resource.resource?.chars || query,
          xywh: fragment.replace('xywh=', ''),
        })
      }
    }
    return hits
  } catch (error) {
    console.error('Failed to fetch search hits:', error)
    return []
  }
}

export interface MiradorViewerProps {
  manifestUrl: string
  imageId?: string
  canvasId?: string
  searchQuery?: string
  isEmbed?: boolean
  locale?: string
  height?: string
}

const MiradorViewer = ({
  manifestUrl,
  imageId,
  canvasId: propCanvasId,
  searchQuery,
  isEmbed = false,
  locale = 'ja',
  height,
}: MiradorViewerProps) => {
  const viewerRef = useRef<HTMLDivElement>(null)
  const [viewer, setViewer] = useState<{
    store: {
      dispatch: (action: Record<string, unknown>) => void
      getState: () => Record<string, unknown>
      subscribe: (listener: () => void) => () => void
    }
  } | null>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  const { theme } = useTheme()

  useEffect(() => {
    let isMounted = true

    const loadMirador = async () => {
      if (!viewerRef.current) return

      if (scriptRef.current) {
        document.body.removeChild(scriptRef.current)
      }

      const script = document.createElement('script')
      script.src = 'https://unpkg.com/mirador@4.0.0-alpha.15/dist/mirador.min.js'
      script.async = true
      scriptRef.current = script

      script.onload = async () => {
        if (!isMounted || !viewerRef.current) return

        const mode = theme === 'dark' ? 'dark' : 'light'
        let canvas = propCanvasId || null
        if (!canvas && imageId) {
          canvas = await getCanvas(manifestUrl, imageId)
        }

        const windowConfig: {
          id: string
          manifestId: string
          canvasId?: string
          thumbnailNavigationPosition: string | null
        } = {
          id: 'window-1',
          manifestId: manifestUrl,
          thumbnailNavigationPosition: isEmbed ? null : 'far-right',
        }
        if (canvas) {
          windowConfig.canvasId = canvas
        }

        const miradorViewer = window.Mirador.viewer({
          id: viewerRef.current.id,
          selectedTheme: mode,
          language: locale,
          windows: [windowConfig],
          window: {
            allowFullscreen: true,
            allowClose: false,
            allowMaximize: false,
            hideWindowTitle: isEmbed,
            manifestId: manifestUrl,
            sideBarOpen: !isEmbed,
          },
          workspaceControlPanel: {
            enabled: false,
          },
        })

        if (isMounted) {
          setViewer(miradorViewer)

          if (searchQuery && canvas) {
            const addSearchHighlights = async () => {
              const hits = await getSearchHitsForCanvas(manifestUrl, canvas, searchQuery)

              if (hits.length > 0) {
                const M = window.Mirador as Record<string, unknown>
                const receiveSearch = M.receiveSearch as typeof window.Mirador.receiveSearch

                if (receiveSearch) {
                  const searchResponse = {
                    '@context': 'http://iiif.io/api/search/1/context.json',
                    '@id': `${canvas}/search?q=${encodeURIComponent(searchQuery)}`,
                    '@type': 'sc:AnnotationList',
                    within: {
                      '@type': 'sc:Layer',
                      total: hits.length,
                    },
                    resources: hits.map((hit, idx) => ({
                      '@id': `${canvas}/search-result-${idx}`,
                      '@type': 'oa:Annotation',
                      motivation: 'sc:painting',
                      resource: {
                        '@type': 'cnt:ContentAsText',
                        chars: hit.chars,
                      },
                      on: `${canvas}#xywh=${hit.xywh}`,
                    })),
                  }

                  const state = miradorViewer.store.getState() as {
                    companionWindows: Record<string, { content: string; position: string }>
                  }

                  let searchCompanionWindowId = Object.keys(state.companionWindows).find(
                    id => state.companionWindows[id].content === 'search',
                  )

                  if (!searchCompanionWindowId) {
                    const addCompanionWindow = M.addCompanionWindow as typeof window.Mirador.addCompanionWindow
                    if (addCompanionWindow) {
                      const addAction = addCompanionWindow('window-1', {
                        content: 'search',
                        position: 'right',
                      })
                      miradorViewer.store.dispatch(addAction)

                      const newState = miradorViewer.store.getState() as {
                        companionWindows: Record<string, { content: string }>
                      }
                      searchCompanionWindowId = Object.keys(newState.companionWindows).find(
                        id => newState.companionWindows[id].content === 'search',
                      )
                    }
                  }

                  if (searchCompanionWindowId) {
                    const searchAction = receiveSearch(
                      'window-1',
                      searchCompanionWindowId,
                      `${canvas}/search?q=${encodeURIComponent(searchQuery)}`,
                      searchResponse,
                    )
                    miradorViewer.store.dispatch(searchAction)
                  }
                }
              }
            }

            let highlightAdded = false
            const unsubscribe = miradorViewer.store.subscribe(() => {
              if (highlightAdded || !isMounted) return

              const state = miradorViewer.store.getState() as {
                manifests: Record<string, { isFetching: boolean; json?: unknown }>
              }
              const manifest = state.manifests?.[manifestUrl]

              if (manifest && !manifest.isFetching && manifest.json) {
                highlightAdded = true
                unsubscribe()
                addSearchHighlights()
              }
            })
          }
        }
      }

      document.body.appendChild(script)
    }

    loadMirador()

    return () => {
      isMounted = false
      if (scriptRef.current) {
        document.body.removeChild(scriptRef.current)
        scriptRef.current = null
      }
    }
  }, [manifestUrl, locale, theme, propCanvasId, searchQuery, imageId, isEmbed])

  useEffect(() => {
    if (viewer && imageId) {
      getCanvas(manifestUrl, imageId).then(canvas => {
        if (canvas) {
          const action = window.Mirador.setCanvas('window-1', canvas)
          viewer.store.dispatch(action)
        }
      })
    }
  }, [imageId, manifestUrl, viewer])

  const style: React.CSSProperties = {
    position: 'relative',
    height: height || (isEmbed ? '50vh' : '100vh'),
    width: '100%',
  }

  return (
    <div style={{ position: 'relative' }}>
      <div id="mirador-viewer" ref={viewerRef} style={style} />
    </div>
  )
}

export default MiradorViewer
