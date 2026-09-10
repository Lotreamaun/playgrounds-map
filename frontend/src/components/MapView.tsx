import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCourts } from '../services/api'
import type { Court } from '../services/api'
import CourtMarker from './CourtMarker'
import type { Coordinates } from './CourtForm'
import { loadYandexMaps } from '../services/yandexMaps'
import type { YandexMapsModules } from '../services/yandexMaps'

const TBILISI_CENTER: [number, number] = [44.8271, 41.7151] // [lon, lat]
const DEFAULT_ZOOM = 12
const DEBOUNCE_MS = 250
const INITIAL_LOCATION = { center: TBILISI_CENTER, zoom: DEFAULT_ZOOM }
const API_KEY = import.meta.env.VITE_YANDEX_MAPS_KEY as string | undefined
const GRID_SIZE_PX = 64

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

interface MapViewProps {
  courts: Court[]
  onCourtsChange: (courts: Court[]) => void
  addMode: boolean
  onMapClick: (latitude: number, longitude: number) => void
  pick?: Coordinates | null
  selectedCourt?: Court | null
  onMarkerTap: (court: Court) => void
}

function MapView({ courts, onCourtsChange, addMode, onMapClick, pick, selectedCourt, onMarkerTap }: MapViewProps) {
  const [modules, setModules] = useState<YandexMapsModules | null>(null)
  const [error, setError] = useState<string | null>(() =>
    API_KEY == null || API_KEY === ''
      ? 'Укажите VITE_YANDEX_MAPS_KEY, чтобы отобразить карту Яндекс.Карт.'
      : null,
  )
  const mapInstanceRef = useRef<{
    bounds: [[number, number], [number, number]]
    zoom: number
    zoomRange: { min: number; max: number }
    setLocation: (location: { center?: [number, number]; zoom?: number }) => void
  } | null>(null)
  const debounceRef = useRef<number | null>(null)
  const addModeRef = useRef(addMode)

  useEffect(() => {
    addModeRef.current = addMode
  }, [addMode])

  useEffect(() => {
    if (selectedCourt == null) return
    // Center-only: per the SDK, an update without `zoom` leaves the current
    // zoom untouched, so selecting a court never fights the user's own zoom.
    mapInstanceRef.current?.setLocation({
      center: [selectedCourt.longitude, selectedCourt.latitude],
    })
  }, [selectedCourt])

  useEffect(() => {
    if (pick == null) return
    mapInstanceRef.current?.setLocation({
      center: [pick.longitude, pick.latitude],
    })
  }, [pick])

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

  const fetchCourts = useCallback(() => {
    const map = mapInstanceRef.current
    if (map == null) return
    const [corner1, corner2] = map.bounds
    const lons = [corner1[0], corner2[0]]
    const lats = [corner1[1], corner2[1]]
    getCourts({
      min_lat: Math.min(...lats),
      max_lat: Math.max(...lats),
      min_lon: Math.min(...lons),
      max_lon: Math.max(...lons),
    })
      .then(onCourtsChange)
      .catch((err) => {
        console.error('Failed to fetch courts:', err)
      })
  }, [onCourtsChange])

  const scheduleFetch = useCallback(() => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(fetchCourts, DEBOUNCE_MS)
  }, [fetchCourts])

  const handleMapRef = useCallback(
    (instance: typeof mapInstanceRef.current) => {
      mapInstanceRef.current = instance
      if (instance == null) return

      const centerOnFallback = () => instance.setLocation({ center: TBILISI_CENTER, zoom: DEFAULT_ZOOM })
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
          const { latitude, longitude } = position.coords
          instance.setLocation({ center: [longitude, latitude], zoom: DEFAULT_ZOOM })
        }, centerOnFallback)
      } else {
        centerOnFallback()
      }

      fetchCourts()
    },
    [fetchCourts],
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    }
  }, [])

  const handleMapClick = useCallback(
    (object: unknown, event: { coordinates: [number, number] }) => {
      if (addModeRef.current && object == null) {
        onMapClick(event.coordinates[1], event.coordinates[0])
      }
    },
    [onMapClick],
  )

  const handleGeolocateFallback = useCallback((position: unknown) => {
    if (position == null) {
      mapInstanceRef.current?.setLocation({ center: TBILISI_CENTER, zoom: DEFAULT_ZOOM })
    }
  }, [])

  const handleClusterClick = useCallback((coordinates: [number, number], clustered: CourtFeature[]) => {
    const map = mapInstanceRef.current
    if (map == null) return

    const coords = clustered.map((f) => f.geometry.coordinates)
    const targetZoom = clusterZoomForExtent(coords, map.zoom, map.zoomRange.max)
    map.setLocation({ center: coordinates, zoom: targetZoom })
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

  if (error != null) {
    return <div className="map-view map-view--message">{error}</div>
  }

  if (modules == null) {
    return <div className="map-view map-view--message">Загрузка карты…</div>
  }

  const {
    YMap,
    YMapDefaultSchemeLayer,
    YMapDefaultFeaturesLayer,
    YMapMarker,
    YMapListener,
    YMapControls,
    YMapFeatureDataSource,
    YMapLayer,
    YMapClusterer,
    clusterByGrid,
    YMapZoomControl,
    YMapGeolocationControl,
    reactify,
  } = modules

  const clusterMethod = clusterByGrid({ gridSize: 64 })

  const renderMarker = (feature: CourtFeature) => (
    <YMapMarker key={feature.id} coordinates={feature.geometry.coordinates} source="courts">
      <CourtMarker
        court={feature.properties.court}
        addMode={addMode}
        isSelected={selectedCourt != null && feature.properties.court.id === selectedCourt.id}
        onSelect={onMarkerTap}
      />
    </YMapMarker>
  )

  const renderCluster = (coordinates: [number, number], clustered: CourtFeature[]) => (
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
  )

  return (
    <div className="map-view">
      {/* location is seed-only after mount — camera changes must go through setLocation() on the ref, not by changing this prop */}
      <YMap location={reactify.useDefault(INITIAL_LOCATION)} ref={handleMapRef}>
        <YMapDefaultSchemeLayer />
        <YMapDefaultFeaturesLayer />
        <YMapListener onClick={handleMapClick} onUpdate={scheduleFetch} />
        <YMapControls position="top left">
          <YMapZoomControl />
          <YMapGeolocationControl onGeolocatePosition={handleGeolocateFallback} />
        </YMapControls>
        <YMapFeatureDataSource id="courts" />
        <YMapLayer source="courts" type="markers" zIndex={1800} />
        <YMapClusterer marker={renderMarker} cluster={renderCluster} method={clusterMethod} features={features} />
        {pick != null && (
          <YMapMarker key="pick" coordinates={[pick.longitude, pick.latitude]}>
            <div className="pick-marker" aria-hidden="true" />
          </YMapMarker>
        )}
      </YMap>
    </div>
  )
}

export default MapView
