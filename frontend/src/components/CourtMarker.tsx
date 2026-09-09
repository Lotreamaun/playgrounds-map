import { useEffect, useState } from 'react'
import type { Court } from '../services/api'
import { BASE_URL } from '../services/api'
import { translateSurface, translateCondition } from '../utils/labels'

const SPORT_ICONS: Record<string, string> = {
  basketball: '🏀',
}
const DEFAULT_SPORT_ICON = '📍'

function sportIcon(sportType: string): string {
  return SPORT_ICONS[sportType] ?? DEFAULT_SPORT_ICON
}

export function CourtCard({ court }: { court: Court }) {
  const address =
    court.address != null && court.address !== '' ? court.address : 'Адрес не указан'
  const photo = court.photo_url != null && court.photo_url !== ''
    ? `${BASE_URL}${court.photo_url}`
    : null
  const [photoOpen, setPhotoOpen] = useState(false)

  useEffect(() => {
    if (!photoOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPhotoOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photoOpen])

  return (
    <div className="court-card">
      {photo != null && (
        <button
          type="button"
          className="court-card__photo-btn"
          onClick={() => setPhotoOpen(true)}
          aria-label={`Открыть фото ${court.name ?? 'площадки'}`}
        >
          <img
            className="court-card__photo"
            src={photo}
            alt={court.name ?? 'Фото площадки'}
          />
        </button>
      )}
      <div className="court-card__body">
        <h3>{court.name ?? `Площадка #${court.id ?? ''}`}</h3>
        <p className="court-card__address">{address}</p>
        <p className="court-card__surface">
          <strong>Покрытие:</strong> {translateSurface(court.surface)}
        </p>
        <p className="court-card__condition">
          <strong>Состояние:</strong> {translateCondition(court.condition)}
        </p>
      </div>
      {photo != null && photoOpen && (
        <div
          className="court-photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={court.name ?? 'Фото площадки'}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPhotoOpen(false)
          }}
        >
          <img
            className="court-photo-lightbox__image"
            src={photo}
            alt={court.name ?? 'Фото площадки'}
          />
          <button
            type="button"
            className="court-photo-lightbox__close"
            aria-label="Закрыть фото"
            onClick={() => setPhotoOpen(false)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

interface CourtMarkerProps {
  court: Court
  addMode: boolean
  isSelected?: boolean
  onSelect: (court: Court) => void
}

function CourtMarker({ court, addMode, isSelected = false, onSelect }: CourtMarkerProps) {
  const handleClick = () => {
    if (addMode) return
    onSelect(court)
  }

  return (
    <div className="court-marker">
      <button
        type="button"
        className={`court-marker__pin${isSelected ? ' court-marker__pin--selected' : ''}`}
        aria-label={court.name ?? `Площадка #${court.id ?? ''}`}
        onClick={handleClick}
      >
        {sportIcon(court.sport_type)}
      </button>
    </div>
  )
}

export default CourtMarker
