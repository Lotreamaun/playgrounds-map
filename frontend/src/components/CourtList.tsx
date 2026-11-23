import { memo } from 'react'
import { House } from '@phosphor-icons/react'
import type { Court } from '../services/api'
import type { CourtsStatus } from '../hooks/useCourts'
import { NO_ADDRESS, lightingLabel, translateSurface } from '../utils/labels'
import ConditionBadge from './ConditionBadge'
import LightIcon from './LightIcon'
import { formatDistance } from '../utils/distance'

interface CourtRowProps {
  court: Court
  distanceKm: number | null
  onSelect: (id: number) => void
}

const CourtRow = memo(function CourtRow({ court, distanceKm, onSelect }: CourtRowProps) {
  const address = court.address != null && court.address !== '' ? court.address : NO_ADDRESS
  return (
    <li>
      <button
        type="button"
        className="court-list__row"
        disabled={court.id == null}
        onClick={() => court.id != null && onSelect(court.id)}
      >
        <span className="court-list__row-main">
          <span className="court-list__row-heading">
            <span className="court-list__row-title">{court.name ?? `Площадка #${court.id ?? ''}`}</span>
            {distanceKm != null && <span className="court-list__row-distance">{formatDistance(distanceKm)}</span>}
          </span>
          <span className="court-list__row-address">{address}</span>
          <span className="court-list__row-meta">
            {court.is_covered === true && (
              <>
                <span className="court-list__row-fact">
                  <House size={16} aria-hidden="true" />
                  Крытая
                </span>
                <span aria-hidden="true">·</span>
              </>
            )}
            <span>{translateSurface(court.surface)}</span>
            {court.has_lighting != null && (
              <>
                <span aria-hidden="true">·</span>
                <span className="court-list__row-fact">
                  <LightIcon on={court.has_lighting} size={16} />
                  {lightingLabel(court.has_lighting)}
                </span>
              </>
            )}
          </span>
        </span>
        <ConditionBadge condition={court.condition} variant="list" />
      </button>
    </li>
  )
})

interface CourtListProps {
  /** Already filtered and sorted. */
  courts: Court[]
  /** Court count before filtering, to tell "no results" from "no courts". */
  totalCount: number
  status: CourtsStatus
  distances: ReadonlyMap<number, number> | null
  onSelect: (id: number) => void
  onRetry: () => void
  onAdd: () => void
  filtersActive: boolean
  onResetFilters: () => void
}

function CourtList({
  courts,
  totalCount,
  status,
  distances,
  onSelect,
  onRetry,
  onAdd,
  filtersActive,
  onResetFilters,
}: CourtListProps) {
  if (totalCount === 0 && status === 'loading') {
    return (
      <div className="court-list" aria-busy="true" aria-label="Загрузка площадок">
        <ul className="court-list__items">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="court-list__skeleton" aria-hidden="true">
              <span className="court-list__skeleton-text">
                <span className="skeleton skeleton--title" />
                <span className="skeleton skeleton--line" />
                <span className="skeleton skeleton--line skeleton--short" />
              </span>
              <span className="skeleton skeleton--badge" />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  if (totalCount === 0 && status === 'error') {
    return (
      <div className="court-list court-list--state">
        <p className="court-list__state-title">Не удалось загрузить площадки</p>
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          Повторить
        </button>
      </div>
    )
  }

  if (totalCount === 0) {
    return (
      <div className="court-list court-list--state">
        <p className="court-list__state-title">Пока нет ни одной площадки</p>
        <button type="button" className="btn btn-primary" onClick={onAdd}>
          Добавить площадку
        </button>
      </div>
    )
  }

  if (courts.length === 0) {
    return (
      <div className="court-list court-list--state">
        <p className="court-list__state-title">Ничего не найдено</p>
        <p className="court-list__state-hint">Попробуйте изменить запрос: название или часть адреса.</p>
        {filtersActive && (
          <button type="button" className="btn btn-secondary" onClick={onResetFilters}>
            Сбросить фильтры
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="court-list">
      <ul className="court-list__items">
        {courts.map((court) => (
          <CourtRow
            key={court.id ?? `${court.latitude},${court.longitude}`}
            court={court}
            distanceKm={court.id != null ? (distances?.get(court.id) ?? null) : null}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  )
}

export default CourtList
