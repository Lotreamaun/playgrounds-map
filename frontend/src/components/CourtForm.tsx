import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { createCourt } from '../services/api'
import type { Court } from '../services/api'
import { reverseGeocode } from '../services/yandexMaps'

export interface Coordinates {
  latitude: number
  longitude: number
}

interface CourtFormProps {
  coordinates: Coordinates | null
  onCreated: (court: Court) => void
  onCancel: () => void
}

const SURFACES = ['asphalt', 'rubber', 'grass', 'sand', 'wood', 'other']
const CONDITIONS = ['excellent', 'good', 'fair', 'poor']
const API_KEY = import.meta.env.VITE_YANDEX_GEOCODER_KEY as string | undefined

const addressCache = new Map<string, string | null>()

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)},${longitude.toFixed(6)}`
}

function CourtForm({ coordinates, onCreated, onCancel }: CourtFormProps) {
  const [surface, setSurface] = useState('')
  const [condition, setCondition] = useState('')
  const [address, setAddress] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (coordinates == null) {
      setAddress('')
      return
    }
    const key = cacheKey(coordinates.latitude, coordinates.longitude)
    if (addressCache.has(key)) {
      setAddress(addressCache.get(key) ?? '')
      return
    }
    if (API_KEY == null || API_KEY === '') {
      addressCache.set(key, null)
      return
    }
    let cancelled = false
    reverseGeocode(coordinates.latitude, coordinates.longitude, API_KEY)
      .then((value) => {
        if (cancelled) return
        addressCache.set(key, value)
        setAddress(value ?? '')
      })
      .catch((err) => {
        if (cancelled) return
        console.error('Failed to geocode coordinates:', err)
        addressCache.set(key, null)
      })
    return () => {
      cancelled = true
    }
  }, [coordinates])

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
      setMessage('Покрытие и состояние обязательны.')
      return
    }

    setSubmitting(true)
    try {
      const court = await createCourt({
        sport_type: 'basketball',
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        surface,
        condition,
        has_lighting: false,
        address: address != null && address !== '' ? address : undefined,
        photo: photo ?? undefined,
      })
      onCreated(court)
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 409) {
        setMessage(
          'Рядом с этой точкой уже есть баскетбольная площадка. Выберите другую точку.',
        )
      } else {
        setMessage(err instanceof Error ? err.message : 'Не удалось добавить площадку. Попробуйте ещё раз.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="court-form" onSubmit={handleSubmit}>
      <h2>Добавить площадку</h2>

      <div className="court-form__coords">
        <label>Координаты</label>
        <div>
          {coordinates == null ? (
            <span>Нажмите на карту, чтобы выбрать точку</span>
          ) : (
            <span>
              {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
            </span>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="address">Адрес</label>
        <input
          id="address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Адрес автоматически, можно изменить"
        />
      </div>

      <div>
        <label htmlFor="surface">Покрытие</label>
        <select
          id="surface"
          value={surface}
          onChange={(e) => setSurface(e.target.value)}
          required
        >
          <option value="" disabled>
            Выберите покрытие
          </option>
          {SURFACES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="condition">Состояние</label>
        <select
          id="condition"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          required
        >
          <option value="" disabled>
            Выберите состояние
          </option>
          {CONDITIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="photo">Фото (необязательно)</label>
        <input id="photo" type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} />
      </div>

      {message != null && <p className="court-form__message">{message}</p>}

      <div className="court-form__actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Добавление…' : 'Добавить площадку'}
        </button>
        <button type="button" onClick={onCancel} disabled={submitting}>
          Отмена
        </button>
      </div>
    </form>
  )
}

export default CourtForm