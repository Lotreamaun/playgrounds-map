import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { createCourt } from '../services/api'
import type { Court } from '../services/api'

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

function CourtForm({ coordinates, onCreated, onCancel }: CourtFormProps) {
  const [surface, setSurface] = useState('')
  const [condition, setCondition] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPhoto(event.target.files?.[0] ?? null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)

    if (coordinates == null) {
      setMessage('Pick a location on the map first.')
      return
    }
    if (!surface || !condition) {
      setMessage('Surface and condition are required.')
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
        photo: photo ?? undefined,
      })
      onCreated(court)
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 409) {
        setMessage(
          'A basketball court already exists near this spot. Choose a different point.',
        )
      } else {
        setMessage(err instanceof Error ? err.message : 'Failed to add the court. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="court-form" onSubmit={handleSubmit}>
      <h2>Add a court</h2>

      <div className="court-form__coords">
        <label>Coordinates</label>
        <div>
          {coordinates == null ? (
            <span>Click the map to pick a location</span>
          ) : (
            <span>
              {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
            </span>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="surface">Surface</label>
        <select
          id="surface"
          value={surface}
          onChange={(e) => setSurface(e.target.value)}
          required
        >
          <option value="" disabled>
            Select surface
          </option>
          {SURFACES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="condition">Condition</label>
        <select
          id="condition"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          required
        >
          <option value="" disabled>
            Select condition
          </option>
          {CONDITIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="photo">Photo (optional)</label>
        <input id="photo" type="file" accept="image/jpeg,image/png" onChange={handlePhotoChange} />
      </div>

      {message != null && <p className="court-form__message">{message}</p>}

      <div className="court-form__actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding…' : 'Add court'}
        </button>
        <button type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default CourtForm