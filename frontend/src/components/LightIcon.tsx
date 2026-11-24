import { memo } from 'react'

interface LightIconProps {
  on: boolean
  size?: number
}

/** Incandescent bulb: with ray sticks when lit, rays-free and struck through when not. Colour comes from the parent. */
function LightIcon({ on, size = 16 }: LightIconProps) {
  return (
    <svg
      className={`light-icon light-icon--${on ? 'on' : 'off'}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M9 18h6M10 21h4" />
      <path d="M8.5 15.5C7 14.3 6 12.6 6 10.6a6 6 0 0 1 12 0c0 2-1 3.7-2.5 4.9-.6.5-.9 1.2-.9 2V18h-5.2v-.5c0-.8-.3-1.5-.9-2z" />
      <path d="M10.5 13.5l1.5-2.5 1.5 2.5" />
      {on ? <path d="M12 1.5v1.6M3.6 4.4l1.2 1.1M20.4 4.4l-1.2 1.1M1.5 11h1.6M20.9 11h1.6" /> : <path d="M3 3l18 18" />}
    </svg>
  )
}

export default memo(LightIcon)
