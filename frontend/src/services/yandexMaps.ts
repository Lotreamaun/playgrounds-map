import React from 'react'
import ReactDOM from 'react-dom'
import type { ComponentType } from 'react'

const SCRIPT_ID = 'yandex-maps-js-api'

function loadScript(apiKey: string): Promise<void> {
  if (document.getElementById(SCRIPT_ID) != null) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://api-maps.yandex.ru/v3/?apikey=${encodeURIComponent(apiKey)}&lang=ru_RU`
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load the Yandex Maps JS API script'))
    document.head.appendChild(script)
  })
}

export interface YandexMapsModules {
  YMap: ComponentType<any>
  YMapDefaultSchemeLayer: ComponentType<any>
  YMapDefaultFeaturesLayer: ComponentType<any>
  YMapMarker: ComponentType<any>
  YMapListener: ComponentType<any>
  YMapControls: ComponentType<any>
  YMapFeatureDataSource: ComponentType<any>
  YMapLayer: ComponentType<any>
  YMapClusterer: ComponentType<any>
  clusterByGrid: (options: { gridSize: number }) => unknown
  YMapZoomControl: ComponentType<any>
  YMapGeolocationControl: ComponentType<any>
}

let bootstrapPromise: Promise<YandexMapsModules> | null = null

export function loadYandexMaps(apiKey: string): Promise<YandexMapsModules> {
  if (bootstrapPromise != null) return bootstrapPromise

  bootstrapPromise = loadScript(apiKey)
    .then(() => Promise.all([ymaps3.import('@yandex/ymaps3-reactify'), ymaps3.ready]))
    .then(async ([ymaps3React]) => {
      const reactify = (ymaps3React as any).reactify.bindTo(React, ReactDOM)
      const base = reactify.module(ymaps3 as any)
      // @yandex/ymaps3-clusterer and @yandex/ymaps3-default-ui-theme are standalone npm
      // packages, not "self" modules ymaps3.import knows how to resolve without an explicit
      // CDN registration — since they're installed locally, load them as plain ESM imports
      // instead (per their own READMEs: "Usage with npm").
      const [clustererRaw, themeRaw] = await Promise.all([
        import('@yandex/ymaps3-clusterer'),
        import('@yandex/ymaps3-default-ui-theme'),
      ])
      const clusterer = reactify.module(clustererRaw as any)
      const theme = reactify.module(themeRaw as any)

      return {
        YMap: base.YMap,
        YMapDefaultSchemeLayer: base.YMapDefaultSchemeLayer,
        YMapDefaultFeaturesLayer: base.YMapDefaultFeaturesLayer,
        YMapMarker: base.YMapMarker,
        YMapListener: base.YMapListener,
        YMapControls: base.YMapControls,
        YMapFeatureDataSource: base.YMapFeatureDataSource,
        YMapLayer: base.YMapLayer,
        YMapClusterer: clusterer.YMapClusterer,
        clusterByGrid: clusterer.clusterByGrid,
        YMapZoomControl: theme.YMapZoomControl,
        YMapGeolocationControl: theme.YMapGeolocationControl,
      } satisfies YandexMapsModules
    })
    .catch((err) => {
      bootstrapPromise = null
      throw err
    })

  return bootstrapPromise
}
