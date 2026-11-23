import type { ReactNode } from 'react'

interface CourtSchematicProps {
  sportType: string
  surface: string
  size?: number
}

const KNOWN_SURFACES = ['asphalt', 'rubber', 'wood', 'grass']

/** Markings drawn over the court rectangle (x 12..40, y 5..47 in a 52×52 box). */
function BasketballMarkings() {
  return (
    <>
      <rect x="12" y="5" width="28" height="42" rx="2" />
      <path d="M12 26h28" />
      <circle cx="26" cy="26" r="4.5" />
      <path d="M21 5v8h10V5M21 47v-8h10v8" />
      <path d="M15 5v3a11 11 0 0 0 22 0V5M15 47v-3a11 11 0 0 1 22 0v3" />
    </>
  )
}

/** Neutral fallback for sports without their own drawing: a rectangle with a centre line. */
function GenericMarkings() {
  return (
    <>
      <rect x="12" y="5" width="28" height="42" rx="2" />
      <path d="M12 26h28" />
    </>
  )
}

/** Add a sport by adding an entry here. */
const MARKINGS: Record<string, () => ReactNode> = {
  basketball: BasketballMarkings,
}

/** Top view of a court filled with the surface colour and white markings. */
function CourtSchematic({ sportType, surface, size = 88 }: CourtSchematicProps) {
  const Markings = MARKINGS[sportType] ?? GenericMarkings
  const material = KNOWN_SURFACES.includes(surface) ? surface : 'other'
  return (
    <svg
      className={`court-schematic court-schematic--${material}`}
      width={size}
      height={size}
      viewBox="0 0 52 52"
      aria-hidden="true"
      focusable="false"
    >
      <rect className="court-schematic__ground" width="52" height="52" />
      <rect className="court-schematic__field" x="12" y="5" width="28" height="42" rx="2" />
      <g className="court-schematic__lines">
        <Markings />
      </g>
    </svg>
  )
}

export default CourtSchematic
