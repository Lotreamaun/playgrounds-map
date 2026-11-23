import { useSyncExternalStore } from 'react'

export type GeolocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable'
export interface GeoPosition {
  lat: number
  lon: number
}
export interface GeolocationState {
  status: GeolocationStatus
  position: GeoPosition | null
}

const OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }

let state: GeolocationState = { status: 'idle', position: null }
let pending: Promise<GeolocationState> | null = null
let autoRequested = false
const listeners = new Set<() => void>()

function setState(next: GeolocationState) {
  state = next
  listeners.forEach((l) => l())
}

/** Requests the current position. Concurrent calls share one promise. */
export function requestGeolocation(): Promise<GeolocationState> {
  if (pending != null) return pending
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    setState({ status: 'unavailable', position: null })
    return Promise.resolve(state)
  }
  setState({ status: 'locating', position: state.position })
  pending = new Promise<GeolocationState>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        pending = null
        setState({ status: 'ready', position: { lat: pos.coords.latitude, lon: pos.coords.longitude } })
        resolve(state)
      },
      (err) => {
        pending = null
        // Keep a previously known position on a failed refresh.
        setState({
          status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable',
          position: state.position,
        })
        resolve(state)
      },
      OPTIONS,
    )
  })
  return pending
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (!autoRequested) {
    autoRequested = true
    // Defer so the request does not set state during subscribe.
    queueMicrotask(() => void requestGeolocation())
  }
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => state

export function useGeolocation(): GeolocationState & { request: () => Promise<GeolocationState> } {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { ...snapshot, request: requestGeolocation }
}
