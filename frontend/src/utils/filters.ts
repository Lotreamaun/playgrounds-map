import type { Court } from '../services/api'
import { SURFACE_LABELS } from './labels'

export type ConditionFilter = 'any' | 'good' | 'excellent'

export interface CourtFilters {
  condition: ConditionFilter
  lit: boolean
  covered: boolean
  surfaces: string[]
}

export const EMPTY_FILTERS: CourtFilters = { condition: 'any', lit: false, covered: false, surfaces: [] }

const ACCEPTED_CONDITIONS: Record<ConditionFilter, readonly string[] | null> = {
  any: null,
  good: ['excellent', 'good'],
  excellent: ['excellent'],
}

/** Groups combine with AND; surfaces inside their group combine with OR. */
export function applyFilters(courts: Court[], filters: CourtFilters): Court[] {
  if (activeFilterCount(filters) === 0) return courts
  const conditions = ACCEPTED_CONDITIONS[filters.condition]
  return courts.filter((c) => {
    if (conditions != null && !conditions.includes(c.condition)) return false
    if (filters.lit && c.has_lighting !== true) return false
    if (filters.covered && c.is_covered !== true) return false
    if (filters.surfaces.length > 0 && !filters.surfaces.includes(c.surface)) return false
    return true
  })
}

/** Number of enabled groups (not of individual surfaces). */
export function activeFilterCount(filters: CourtFilters): number {
  return (
    (filters.condition !== 'any' ? 1 : 0) +
    (filters.lit ? 1 : 0) +
    (filters.covered ? 1 : 0) +
    (filters.surfaces.length > 0 ? 1 : 0)
  )
}

/** Surfaces present in the data, in the order of SURFACE_LABELS (unknown ones last). */
export function availableSurfaces(courts: Court[]): string[] {
  const present = new Set<string>()
  for (const c of courts) present.add(c.surface)
  const known = Object.keys(SURFACE_LABELS)
  const rest = [...present].filter((s) => !known.includes(s)).sort()
  return [...known.filter((s) => present.has(s)), ...rest]
}
