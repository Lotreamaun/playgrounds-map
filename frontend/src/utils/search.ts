import type { Court } from '../services/api'
import { distanceHaversine } from './distance'

export interface Position {
  lat: number
  lon: number
}

export function normalize(value: string): string {
  return value.toLowerCase().replaceAll('ё', 'е')
}

export function filterCourts(courts: Court[], query: string): Court[] {
  const q = normalize(query.trim())
  if (q === '') return courts
  return courts.filter(
    (c) => normalize(`${c.name ?? ''} ${c.address ?? ''}`).includes(q),
  )
}

export function sortCourts(courts: Court[], position: Position | null): Court[] {
  if (position != null) {
    const withDistance = courts.map((c) => ({
      c,
      d: distanceHaversine(position.lat, position.lon, c.latitude, c.longitude),
    }))
    withDistance.sort((a, b) => a.d - b.d)
    return withDistance.map((x) => x.c)
  }
  return [...courts].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ru'))
}
