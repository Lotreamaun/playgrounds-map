import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Flag, House, ShareNetwork, Sun } from '@phosphor-icons/react'
import type { Court } from '../services/api'
import { BASE_URL } from '../services/api'
import { translateSurface, NO_ADDRESS } from '../utils/labels'
import { formatDistance } from '../utils/distance'
import { copyText } from '../utils/clipboard'
import { showToast } from '../hooks/useToast'
import { useEscape } from '../hooks/useEscape'
import RouteMenu from './RouteMenu'
import CourtPhoto from './CourtPhoto'
import ConditionBadge from './ConditionBadge'
import LightIcon from './LightIcon'

const REPORT_URL = (import.meta.env.VITE_REPORT_URL as string | undefined) ?? ''

const dateFormatter = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', year: 'numeric' })

function formatDataDate(value: string | undefined): string | null {
  if (value == null) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  // The ru locale appends " г." — the spec format is "12 сентября 2026".
  return dateFormatter.format(date).replace(/\s*г\.$/, '')
}

function PhotoLightbox({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  useEscape(true, onClose)
  // Portal: the card may sit inside a transformed sheet, which would trap `position: fixed`.
  return createPortal(
    <div
      className="court-photo-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <img className="court-photo-lightbox__image" src={src} alt={label} />
      <button type="button" className="court-photo-lightbox__close" aria-label="Закрыть фото" onClick={onClose}>
        ×
      </button>
    </div>,
    document.body,
  )
}

interface CourtCardProps {
  court: Court
  layout: 'panel' | 'sheet'
  distanceKm?: number | null
}

function CourtCard({ court, layout, distanceKm = null }: CourtCardProps) {
  const [photoOpen, setPhotoOpen] = useState(false)

  const title = court.name ?? `Площадка #${court.id ?? ''}`
  const hasAddress = court.address != null && court.address !== ''
  const photo = court.photo_url != null && court.photo_url !== '' ? `${BASE_URL}${court.photo_url}` : null
  const description = court.description?.trim() ?? ''
  const dataDate = formatDataDate(court.updated_at)
  const reportHref =
    REPORT_URL === '' ? null : REPORT_URL.replaceAll('{id}', encodeURIComponent(String(court.id ?? '')))

  const handleCopy = async () => {
    const text = hasAddress ? (court.address as string) : `${court.latitude}, ${court.longitude}`
    const ok = await copyText(text)
    showToast(ok ? (hasAddress ? 'Адрес скопирован' : 'Координаты скопированы') : 'Не удалось скопировать')
  }

  const handleShare = async () => {
    const url = `${location.origin}/?court=${court.id}`
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url })
        return
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        // Any other failure falls through to copying the link.
      }
    }
    const ok = await copyText(url)
    showToast(ok ? 'Ссылка скопирована' : 'Не удалось скопировать')
  }

  return (
    <article className={`court-card court-card--${layout}`}>
      <div className="court-card__head">
        <div className="court-card__headline">
          <h1 className="court-card__title">{title}</h1>
          {distanceKm != null && <p className="court-card__distance">{formatDistance(distanceKm)}</p>}
        </div>
        <CourtPhoto
          src={photo}
          sportType={court.sport_type}
          surface={court.surface}
          onOpen={photo != null ? () => setPhotoOpen(true) : undefined}
          label={`Открыть фото ${title}`}
        />
      </div>

      <ConditionBadge condition={court.condition} variant="banner" />

      <dl className="court-card__facts">
        <div className="court-fact">
          <dt className="court-fact__label">Покрытие</dt>
          <dd className="court-fact__value">{translateSurface(court.surface)}</dd>
        </div>
        <div className="court-fact">
          <dt className="court-fact__label">Площадка</dt>
          <dd className="court-fact__value">
            {court.is_covered === true ? (
              <>
                <House size={18} aria-hidden="true" />
                Крытая
              </>
            ) : court.is_covered === false ? (
              <>
                <Sun size={18} aria-hidden="true" />
                Улица
              </>
            ) : (
              <span className="court-fact__unknown">Нет данных</span>
            )}
          </dd>
        </div>
        <div className="court-fact">
          <dt className="court-fact__label">Освещение</dt>
          <dd
            className={`court-fact__value${court.has_lighting ? ' court-fact__value--lit' : ''}`}
          >
            {court.has_lighting != null ? (
              <>
                <LightIcon on={court.has_lighting} size={18} />
                {court.has_lighting ? 'Есть' : 'Нет'}
              </>
            ) : (
              <span className="court-fact__unknown">Нет данных</span>
            )}
          </dd>
        </div>
      </dl>

      <div className="court-card__address">
        <span className={`court-card__address-text${hasAddress ? '' : ' court-card__address-text--empty'}`}>
          {hasAddress ? court.address : NO_ADDRESS}
        </span>
        <button
          type="button"
          className="icon-btn"
          aria-label={hasAddress ? 'Скопировать адрес' : 'Скопировать координаты'}
          onClick={handleCopy}
        >
          <Copy size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="court-card__actions">
        <RouteMenu latitude={court.latitude} longitude={court.longitude} layout={layout} />
        {court.id != null && (
          <button
            type="button"
            className="btn btn-secondary court-card__share"
            aria-label="Поделиться"
            onClick={handleShare}
          >
            <ShareNetwork size={20} aria-hidden="true" />
          </button>
        )}
      </div>

      {description !== '' && <p className="court-card__description">{description}</p>}

      {(dataDate != null || reportHref != null) && (
        <div className="court-card__meta">
          {dataDate != null && <span>Данные от {dataDate}</span>}
          {reportHref != null && (
            <a className="court-card__report" href={reportHref} target="_blank" rel="noopener noreferrer">
              <Flag size={14} aria-hidden="true" />
              Сообщить о проблеме
            </a>
          )}
        </div>
      )}

      {photo != null && photoOpen && (
        <PhotoLightbox src={photo} label={title} onClose={() => setPhotoOpen(false)} />
      )}
    </article>
  )
}

export default CourtCard
