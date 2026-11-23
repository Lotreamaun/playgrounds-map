import { useEffect, useId, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { ArrowLeft, Camera, MapPin } from '@phosphor-icons/react'
import { createCourt } from '../services/api'
import type { Court } from '../services/api'
import { reverseGeocode } from '../services/yandexMaps'
import { SURFACE_LABELS, CONDITION_LABELS } from '../utils/labels'
import OptionGroup from './OptionGroup'
import type { Option } from './OptionGroup'

export interface Coordinates {
  latitude: number
  longitude: number
}

interface CourtFormProps {
  coordinates: Coordinates | null
  locating?: boolean
  locationFailed?: boolean
  /** Mobile only: collapse the form so the user can tap a point on the map. */
  onPickOnMap?: () => void
  onCreated: (court: Court) => void
  onCancel: () => void
}

const SURFACE_OPTIONS: Option[] = Object.entries(SURFACE_LABELS).map(([value, label]) => ({ value, label }))
const CONDITION_OPTIONS: Option[] = Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }))
const API_KEY = import.meta.env.VITE_YANDEX_GEOCODER_KEY as string | undefined
const COMMENT_LIMIT = 500
const COMMENT_COUNTER_FROM = 450

const addressCache = new Map<string, string | null>()

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)},${longitude.toFixed(6)}`
}

function CourtForm({
  coordinates,
  locating = false,
  locationFailed = false,
  onPickOnMap,
  onCreated,
  onCancel,
}: CourtFormProps) {
  const uid = useId()
  const [surface, setSurface] = useState('')
  const [condition, setCondition] = useState('')
  const [manualAddress, setManualAddress] = useState<{ key: string | null; value: string } | null>(null)
  const [resolved, setResolved] = useState<{ key: string; value: string | null } | null>(null)
  const [comment, setComment] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const key = coordinates != null ? cacheKey(coordinates.latitude, coordinates.longitude) : null

  useEffect(() => {
    if (key == null || addressCache.has(key) || API_KEY == null || API_KEY === '') return
    const [latitude, longitude] = key.split(',').map(Number)
    let cancelled = false
    reverseGeocode(latitude, longitude, API_KEY)
      .then((value) => {
        addressCache.set(key, value)
        if (!cancelled) setResolved({ key, value })
      })
      .catch((err) => {
        console.error('Failed to geocode coordinates:', err)
        addressCache.set(key, null)
        if (!cancelled) setResolved({ key, value: null })
      })
    return () => {
      cancelled = true
    }
  }, [key])

  // Geocoded address for the current point; `undefined` while it is still being looked up.
  let geocoded: string | null | undefined
  if (key == null) geocoded = null
  else if (API_KEY == null || API_KEY === '') geocoded = null
  else if (addressCache.has(key)) geocoded = addressCache.get(key)
  else if (resolved?.key === key) geocoded = resolved.value
  const addressPending = key != null && geocoded === undefined

  const address = manualAddress != null && manualAddress.key === key ? manualAddress.value : (geocoded ?? '')

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPhoto(event.target.files?.[0] ?? null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)

    if (coordinates == null) {
      setMessage('Сначала выберите точку на карте.')
      return
    }
    if (!surface || !condition) {
      setMessage('Выберите покрытие и состояние.')
      return
    }

    const description = comment.trim()
    const trimmedAddress = address.trim()

    setSubmitting(true)
    try {
      const court = await createCourt({
        sport_type: 'basketball',
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        surface,
        condition,
        has_lighting: false,
        address: trimmedAddress !== '' ? trimmedAddress : undefined,
        description: description !== '' ? description : undefined,
        photo: photo ?? undefined,
      })
      onCreated(court)
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 409) {
        setMessage('Рядом с этой точкой уже есть баскетбольная площадка. Выберите другую точку.')
      } else {
        setMessage(err instanceof Error ? err.message : 'Не удалось добавить площадку. Попробуйте ещё раз.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  let locationText: string
  if (coordinates != null) {
    locationText =
      address.trim() !== '' ? address : addressPending ? 'Определяем адрес…' : 'Точка выбрана на карте'
  } else if (locating) {
    locationText = 'Определяем местоположение…'
  } else if (locationFailed) {
    locationText = 'Не удалось определить местоположение'
  } else {
    locationText = 'Нажмите на карту, чтобы выбрать точку'
  }

  return (
    <form className="court-form" onSubmit={handleSubmit}>
      <header className="court-form__header">
        <button type="button" className="icon-btn" aria-label="Закрыть форму" onClick={onCancel} disabled={submitting}>
          <ArrowLeft size={22} aria-hidden="true" />
        </button>
        <h2 className="court-form__title">Добавить площадку</h2>
      </header>

      <div className="court-form__body">
        <div className="court-form__field">
          <span className="form-label">Местоположение</span>
          <div className="court-form__location" aria-live="polite">
            <MapPin size={20} aria-hidden="true" />
            <span className="court-form__location-text">{locationText}</span>
            {onPickOnMap != null && (
              <button type="button" className="btn btn-secondary court-form__location-btn" onClick={onPickOnMap}>
                {coordinates != null ? 'Изменить' : 'Указать на карте'}
              </button>
            )}
          </div>
        </div>

        <div className="court-form__field">
          <label className="form-label" htmlFor={`${uid}-address`}>
            Адрес
          </label>
          <input
            id={`${uid}-address`}
            type="text"
            value={address}
            onChange={(e) => setManualAddress({ key, value: e.target.value })}
            placeholder="Адрес автоматически, можно изменить"
          />
        </div>

        <OptionGroup
          id={`${uid}-surface`}
          label="Покрытие"
          options={SURFACE_OPTIONS}
          value={surface}
          onChange={setSurface}
        />
        <OptionGroup
          id={`${uid}-condition`}
          label="Состояние"
          options={CONDITION_OPTIONS}
          value={condition}
          onChange={setCondition}
        />

        <div className="court-form__field">
          <span className="form-label">Фото (необязательно)</span>
          <label className="court-form__file btn btn-secondary">
            <Camera size={20} aria-hidden="true" />
            <span className="court-form__file-name">{photo != null ? photo.name : 'Добавить фото'}</span>
            <input type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} />
          </label>
        </div>

        <div className="court-form__field">
          <label className="form-label" htmlFor={`${uid}-comment`}>
            Комментарий (необязательно)
          </label>
          <textarea
            id={`${uid}-comment`}
            rows={3}
            maxLength={COMMENT_LIMIT}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Вход со стороны школы, вечером многолюдно"
          />
          {comment.length >= COMMENT_COUNTER_FROM && (
            <span className="court-form__counter">
              {comment.length}/{COMMENT_LIMIT}
            </span>
          )}
        </div>

        {message != null && (
          <p className="court-form__message" role="alert">
            {message}
          </p>
        )}
      </div>

      <footer className="court-form__actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Отмена
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Добавление…' : 'Добавить площадку'}
        </button>
      </footer>
    </form>
  )
}

export default CourtForm
