import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Court } from '../services/api'
import CourtMarker from './CourtMarker'
import MapControls from './MapControls'
import type { Coordinates } from './CourtForm'
import { loadYandexMaps } from '../services/yandexMaps'
import type { YandexMapsModules } from '../services/yandexMaps'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { requestGeolocation } from '../hooks/useGeolocation'
import type { GeoPosition } from '../hooks/useGeolocation'
import { showToast } from '../hooks/useToast'

const TBILISI_CENTER: [number, number] = [44.8271, 41.7151] // [lon, lat]
const DEFAULT_ZOOM = 12
/** Selecting a court zooms in at least this far, so its marker leaves any cluster. */
const SELECT_ZOOM = 15
const INITIAL_LOCATION = { center: TBILISI_CENTER, zoom: DEFAULT_ZOOM }
const API_KEY = import.meta.env.VITE_YANDEX_MAPS_KEY as string | undefined
const GRID_SIZE_PX = 64
const MOVE_DURATION_MS = 250
/** A map click this soon after a marker/cluster tap belongs to that tap, not to empty map. */
const MARKER_TAP_GUARD_MS = 400
const NO_MARGIN: [number, number, number, number] = [0, 0, 0, 0]

function clusterZoomForExtent(
  coords: [number, number][],
  currentZoom: number,
  maxZoom: number,
): number {
  if (coords.length < 2) return currentZoom
  let minLon = Infinity
  let maxLon = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity
  for (const [lon, lat] of coords) {
    if (lon < minLon) minLon = lon
    if (lon > maxLon) maxLon = lon
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  const extentDeg = Math.max(maxLon - minLon, maxLat - minLat)
  if (extentDeg === 0) return maxZoom
  let z = currentZoom
  while (z < maxZoom) {
    const pxPerDeg = (256 * 2 ** z) / 360
    if (extentDeg * pxPerDeg > GRID_SIZE_PX) break
    z++
  }
  return Math.min(z, maxZoom)
}

interface CourtFeature {
  type: 'Feature'
  id: number | string
  geometry: { coordinates: [number, number] }
  properties: { court: Court }
}

interface MapInstance {
  zoom: number
  zoomRange: { min: number; max: number }
  setLocation: (location: {
    center?: [number, number]
    zoom?: number
    duration?: number
  }) => void
}

interface MapViewProps {
  courts: Court[]
  position: GeoPosition | null
  selectedCourt: Court | null
  addMode: boolean
  pick: Coordinates | null
  isMobile: boolean
  /** Height of the mobile card sheet in px (0 when closed). */
  sheetHeight: number
  controlsHidden: boolean
  onMapClick: (latitude: number, longitude: number) => void
  onSelectCourt: (id: number) => void
  /** Tap on empty map outside add mode. */
  onEmptyTap: () => void
  onAdd: () => void
}

interface MapSceneProps extends MapViewProps {
  modules: YandexMapsModules
}

function MapScene({
  modules,
  courts,
  position,
  selectedCourt,
  addMode,
  pick,
  isMobile,
  sheetHeight,
  controlsHidden,
  onMapClick,
  onSelectCourt,
  onEmptyTap,
  onAdd,
}: MapSceneProps) {
  const isDark = useMediaQuery('(prefers-color-scheme: dark)')
  const mapRef = useRef<MapInstance | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const lastMarkerTapRef = useRef(0)
  const positionCenteredRef = useRef(false)
  const selectedIdRef = useRef<number | null | undefined>(undefined)
  const addModeRef = useRef(addMode)
  const positionRef = useRef(position)
  const onEmptyTapRef = useRef(onEmptyTap)
  const onMapClickRef = useRef(onMapClick)
  const onSelectCourtRef = useRef(onSelectCourt)

  const selectedId = selectedCourt?.id ?? null
  const selectedLat = selectedCourt?.latitude
  const selectedLon = selectedCourt?.longitude

  useEffect(() => {
    addModeRef.current = addMode
    positionRef.current = position
    selectedIdRef.current = selectedId
    onEmptyTapRef.current = onEmptyTap
    onMapClickRef.current = onMapClick
    onSelectCourtRef.current = onSelectCourt
  })

  // Center on the user once, on the first fix — unless a court (deep link) already took the camera.
  useEffect(() => {
    if (!mapReady || position == null || positionCenteredRef.current) return
    positionCenteredRef.current = true
    if (selectedIdRef.current != null) return
    mapRef.current?.setLocation({ center: [position.lon, position.lat], zoom: DEFAULT_ZOOM })
  }, [mapReady, position])

  // On mobile, wait until the card sheet has been measured, so `margin` already
  // reserves its height and the marker lands in the visible part above it.
  const sheetMeasured = !isMobile || sheetHeight > 0

  // Zoom in only if needed (never out), so the selected marker is shown unclustered.
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || map == null || selectedLat == null || selectedLon == null || !sheetMeasured) return
    map.setLocation({
      center: [selectedLon, selectedLat],
      zoom: Math.max(map.zoom, Math.min(SELECT_ZOOM, map.zoomRange.max)),
      duration: MOVE_DURATION_MS,
    })
  }, [mapReady, selectedId, selectedLat, selectedLon, sheetMeasured])

  const pickLat = pick?.latitude
  const pickLon = pick?.longitude
  useEffect(() => {
    if (!mapReady || pickLat == null || pickLon == null) return
    mapRef.current?.setLocation({ center: [pickLon, pickLat] })
  }, [mapReady, pickLat, pickLon])

  const handleMapRef = useCallback((instance: MapInstance | null) => {
    mapRef.current = instance
    setMapReady(instance != null)
  }, [])

  const handleMapClick = useCallback((object: unknown, event: { coordinates: [number, number] }) => {
    if (object != null) return
    if (addModeRef.current) {
      onMapClickRef.current(event.coordinates[1], event.coordinates[0])
      return
    }
    if (performance.now() - lastMarkerTapRef.current < MARKER_TAP_GUARD_MS) return
    onEmptyTapRef.current()
  }, [])

  const handleMarkerSelect = useCallback((id: number) => {
    lastMarkerTapRef.current = performance.now()
    onSelectCourtRef.current(id)
  }, [])

  const handleZoomIn = useCallback(() => {
    const map = mapRef.current
    if (map == null) return
    map.setLocation({ zoom: Math.min(map.zoom + 1, map.zoomRange.max), duration: MOVE_DURATION_MS })
  }, [])

  const handleZoomOut = useCallback(() => {
    const map = mapRef.current
    if (map == null) return
    map.setLocation({ zoom: Math.max(map.zoom - 1, map.zoomRange.min), duration: MOVE_DURATION_MS })
  }, [])

  const handleLocate = useCallback(async () => {
    const state = await requestGeolocation()
    if (state.position == null) {
      showToast('Не удалось определить местоположение')
      return
    }
    // Center-only, so a manual "locate me" doesn't fight the user's chosen zoom.
    mapRef.current?.setLocation({
      center: [state.position.lon, state.position.lat],
      duration: MOVE_DURATION_MS,
    })
  }, [])

  const handleClusterClick = useCallback((coordinates: [number, number], clustered: CourtFeature[]) => {
    lastMarkerTapRef.current = performance.now()
    const map = mapRef.current
    if (map == null) return
    const coords = clustered.map((f) => f.geometry.coordinates)
    const targetZoom = clusterZoomForExtent(coords, map.zoom, map.zoomRange.max)
    map.setLocation({ center: coordinates, zoom: targetZoom, duration: MOVE_DURATION_MS })
  }, [])

  const features = useMemo<CourtFeature[]>(
    () =>
      courts.map((court) => ({
        type: 'Feature',
        id: court.id ?? `${court.latitude},${court.longitude}`,
        geometry: { coordinates: [court.longitude, court.latitude] },
        properties: { court },
      })),
    [courts],
  )

  const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker, YMapListener } = modules
  const { YMapFeatureDataSource, YMapLayer, YMapClusterer, clusterByGrid, reactify } = modules

  const clusterMethod = useMemo(() => clusterByGrid({ gridSize: GRID_SIZE_PX }), [clusterByGrid])

  const renderMarker = useCallback(
    (feature: CourtFeature) => {
      const court = feature.properties.court
      return (
        <YMapMarker key={feature.id} coordinates={feature.geometry.coordinates} source="courts">
          <CourtMarker
            id={court.id ?? null}
            sportType={court.sport_type}
            name={court.name ?? null}
            selected={selectedId != null && court.id === selectedId}
            addMode={addMode}
            onSelect={handleMarkerSelect}
          />
        </YMapMarker>
      )
    },
    [YMapMarker, selectedId, addMode, handleMarkerSelect],
  )

  const renderCluster = useCallback(
    (coordinates: [number, number], clustered: CourtFeature[]) => (
      <YMapMarker
        key={`cluster-${String(clustered[0]?.id)}-${clustered.length}`}
        coordinates={coordinates}
        source="courts"
      >
        <button
          type="button"
          className="court-cluster"
          aria-label={`Показать ${clustered.length} площадок`}
          onClick={() => handleClusterClick(coordinates, clustered)}
        >
          {clustered.length}
        </button>
      </YMapMarker>
    ),
    [YMapMarker, handleClusterClick],
  )

  // `margin` shifts the map's effective center above the card sheet (design §7).
  const margin = useMemo<[number, number, number, number]>(
    () => (isMobile && selectedId != null && sheetHeight > 0 ? [0, 0, sheetHeight, 0] : NO_MARGIN),
    [isMobile, selectedId, sheetHeight],
  )

  return (
    <>
      {/* location is seed-only after mount — camera changes must go through setLocation() on the ref, not by changing this prop */}
      <YMap location={reactify.useDefault(INITIAL_LOCATION)} margin={margin} theme={isDark ? 'dark' : 'light'} ref={handleMapRef}>
        <YMapDefaultSchemeLayer theme={isDark ? 'dark' : 'light'} />
        <YMapDefaultFeaturesLayer />
        <YMapListener onClick={handleMapClick} />
        <YMapFeatureDataSource id="courts" />
        <YMapLayer source="courts" type="markers" zIndex={1800} />
        <YMapClusterer marker={renderMarker} cluster={renderCluster} method={clusterMethod} features={features} />
        {pick != null && (
          <YMapMarker key="pick" coordinates={[pick.longitude, pick.latitude]}>
            <div className="pick-marker" aria-hidden="true" />
          </YMapMarker>
        )}
      </YMap>
      <MapControls
        isMobile={isMobile}
        hidden={controlsHidden}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onLocate={handleLocate}
        onAdd={onAdd}
      />
    </>
  )
}

function MapView(props: MapViewProps) {
  const [modules, setModules] = useState<YandexMapsModules | null>(null)
  const [error, setError] = useState<string | null>(() =>
    API_KEY == null || API_KEY === ''
      ? 'Укажите VITE_YANDEX_MAPS_KEY, чтобы отобразить карту Яндекс.Карт.'
      : null,
  )

  useEffect(() => {
    if (API_KEY == null || API_KEY === '') return
    loadYandexMaps(API_KEY)
      .then(setModules)
      .catch((err) => {
        console.error('Failed to load Yandex Maps API:', err)
        const detail = err instanceof Error ? err.message : String(err)
        setError(`Не удалось загрузить Яндекс.Карты: ${detail}`)
      })
  }, [])

  if (error != null) {
    return <div className="map-view map-view--message">{error}</div>
  }
  if (modules == null) {
    return <div className="map-view map-view--message">Загрузка карты…</div>
  }
  return (
    <div className="map-view">
      <MapScene modules={modules} {...props} />
    </div>
  )
}

export default MapView
