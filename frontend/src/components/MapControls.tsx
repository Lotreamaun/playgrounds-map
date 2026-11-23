import { Minus, NavigationArrow, Plus } from '@phosphor-icons/react'

interface MapControlsProps {
  isMobile: boolean
  /** Hidden while the card sheet is open or a point is being picked. */
  hidden: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onLocate: () => void
  onAdd: () => void
}

/** Own DOM stack at the right edge; sits above Yandex attribution (see .map-controls). */
function MapControls({ isMobile, hidden, onZoomIn, onZoomOut, onLocate, onAdd }: MapControlsProps) {
  if (hidden) return null
  return (
    <div className="map-controls">
      {isMobile ? (
        <button type="button" className="map-control-btn" aria-label="Добавить площадку" onClick={onAdd}>
          <Plus size={22} aria-hidden="true" />
        </button>
      ) : (
        <div className="map-control-group">
          <button type="button" className="map-control-btn" aria-label="Приблизить" onClick={onZoomIn}>
            <Plus size={20} aria-hidden="true" />
          </button>
          <div className="map-control-group__divider" />
          <button type="button" className="map-control-btn" aria-label="Отдалить" onClick={onZoomOut}>
            <Minus size={20} aria-hidden="true" />
          </button>
        </div>
      )}
      <button type="button" className="map-control-btn" aria-label="Где я" onClick={onLocate}>
        <NavigationArrow size={22} aria-hidden="true" />
      </button>
    </div>
  )
}

export default MapControls
