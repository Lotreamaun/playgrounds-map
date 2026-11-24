import { memo } from 'react'
import { Basketball, MapPin } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'

const SPORT_ICONS: Record<string, Icon> = {
  basketball: Basketball,
}
const DEFAULT_SPORT_ICON = MapPin
const SPORT_PIN_MODIFIERS = ['basketball', 'football', 'hockey', 'tennis']

interface CourtMarkerProps {
  id: number | null
  sportType: string
  name: string | null
  selected: boolean
  addMode: boolean
  onSelect: (id: number) => void
}

function CourtMarker({ id, sportType, name, selected, addMode, onSelect }: CourtMarkerProps) {
  const handleClick = () => {
    if (addMode || id == null) return
    onSelect(id)
  }

  const sportModifier = SPORT_PIN_MODIFIERS.includes(sportType)
    ? ` court-marker__pin--${sportType}`
    : ' court-marker__pin--default'
  const SportIcon = SPORT_ICONS[sportType] ?? DEFAULT_SPORT_ICON

  return (
    <div className="court-marker">
      <button
        type="button"
        className={`court-marker__pin${selected ? ' court-marker__pin--selected' : ''}${sportModifier}`}
        aria-label={name ?? `Площадка #${id ?? ''}`}
        aria-pressed={selected}
        onClick={handleClick}
      >
        <SportIcon weight={selected ? 'duotone' : 'regular'} size={18} color="#fff" />
      </button>
    </div>
  )
}

export default memo(CourtMarker)
