import { useState } from 'react'
import CourtSchematic from './CourtSchematic'

interface CourtPhotoProps {
  src: string | null
  sportType: string
  surface: string
  /** Called when the loaded real photo is tapped; the schematic is never interactive. */
  onOpen?: () => void
  label?: string
}

const SIZE = 88

/** The schematic is always the underlay; a real photo fades in over it once loaded. */
function CourtPhoto({ src, sportType, surface, onOpen, label }: CourtPhotoProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const hasPhoto = src != null && src !== failedSrc
  const loaded = hasPhoto && loadedSrc === src

  return (
    <span className="court-photo">
      <CourtSchematic sportType={sportType} surface={surface} size={SIZE} />
      {hasPhoto && (
        <img
          key={src}
          className={`court-photo__image${loaded ? ' court-photo__image--loaded' : ''}`}
          src={src}
          alt=""
          decoding="async"
          onLoad={() => setLoadedSrc(src)}
          onError={() => setFailedSrc(src)}
        />
      )}
      {loaded && onOpen != null && (
        <button type="button" className="court-photo__open" onClick={onOpen} aria-label={label ?? 'Открыть фото'} />
      )}
    </span>
  )
}

export default CourtPhoto
