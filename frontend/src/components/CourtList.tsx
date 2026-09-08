import { useEffect, useMemo, useState } from 'react'
import type { Court } from '../services/api'
import { distanceHaversine, sortByDistance } from '../utils/distance'

interface CourtListProps {
  courts: Court[]
  onSelect: (court: Court) => void
}

function CourtList({ courts, onSelect }: CourtListProps) {
  const [sortByProximity, setSortByProximity] = useState(false)
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null)
  const [geolocationAvailable, setGeolocationAvailable] = useState(true)

  useEffect(() => {
    if (!sortByProximity) return
    if (!navigator.geolocation) {
      setGeolocationAvailable(false)
      return
    }
    let cancelled = false
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return
        setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude })
      },
      () => {
        if (cancelled) return
        setGeolocationAvailable(false)
      },
      { timeout: 5000, enableHighAccuracy: false, maximumAge: 60000 },
    )
    return () => {
      cancelled = true
    }
  }, [sortByProximity])

  const sortedCourts = useMemo(() => {
    if (sortByProximity && position != null) {
      return sortByDistance(courts, position.latitude, position.longitude)
    }
    return courts
  }, [courts, sortByProximity, position])

  return (
    <div className="court-list">
      <div className="court-list__toolbar">
        <button
          type="button"
          className="court-list__sort-toggle"
          onClick={() => setSortByProximity((prev) => !prev)}
        >
          {sortByProximity ? 'По умолчанию' : 'По близости'}
        </button>
        {sortByProximity && (
          <span className="court-list__sort-hint">
            {position != null
              ? 'Сортировка по расстоянию от вас'
              : geolocationAvailable
                ? 'Определяем ваше местоположение…'
                : 'Геолокация недоступна — показан список по умолчанию'}
          </span>
        )}
      </div>
      <ul className="court-list__items">
        {sortedCourts.map((court) => {
          const address =
            court.address != null && court.address !== '' ? court.address : 'Адрес не указан'
          const distance =
            sortByProximity && position != null
              ? distanceHaversine(position.latitude, position.longitude, court.latitude, court.longitude)
              : null
          return (
            <li key={court.id ?? `${court.latitude},${court.longitude}`}>
              <button
                type="button"
                className="court-list__row"
                onClick={() => onSelect(court)}
              >
                <div className="court-list__row-main">
                  <h3 className="court-list__row-title">
                    {court.name ?? `Площадка #${court.id ?? ''}`}
                  </h3>
                  <p className="court-list__row-address">{address}</p>
                </div>
                <div className="court-list__row-meta">
                  <span className="court-list__row-surface">{court.surface}</span>
                  <span className="court-list__row-condition">{court.condition}</span>
                  {distance != null && (
                    <span className="court-list__row-distance">
                      {distance < 1
                        ? `${Math.round(distance * 1000)} м`
                        : `${distance.toFixed(1)} км`}
                    </span>
                  )}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default CourtList
