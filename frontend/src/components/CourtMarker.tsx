import { useState } from 'react'
import type { Court } from '../services/api'

function CourtCard({ court }: { court: Court }) {
  const address =
    court.description != null && court.description !== ''
      ? court.description
      : 'Address unavailable'
  const photo = court.photo_url

  return (
    <div className="court-card">
      <h3>{court.name ?? `Court #${court.id ?? ''}`}</h3>
      <p className="court-card__address">{address}</p>
      <p className="court-card__surface">
        <strong>Surface:</strong> {court.surface}
      </p>
      <p className="court-card__condition">
        <strong>Condition:</strong> {court.condition}
      </p>
      {photo != null && photo !== '' && (
        <img className="court-card__photo" src={photo} alt={court.name ?? 'Court photo'} />
      )}
    </div>
  )
}

interface CourtMarkerProps {
  court: Court
  addMode: boolean
}

function CourtMarker({ court, addMode }: CourtMarkerProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="court-marker">
      <button
        type="button"
        className="court-marker__pin"
        aria-label={court.name ?? `Court #${court.id ?? ''}`}
        onClick={() => {
          if (!addMode) setOpen((prev) => !prev)
        }}
      />
      {open && !addMode && (
        <div className="court-marker__popup">
          <CourtCard court={court} />
        </div>
      )}
    </div>
  )
}

export default CourtMarker
