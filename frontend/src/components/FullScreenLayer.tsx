import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useEscape } from '../hooks/useEscape'
import { useHistoryLayer } from '../hooks/useHistoryLayer'

interface FullScreenLayerProps {
  label: string
  onClose: () => void
  /** Keep the layer (and its history entry and state) mounted but invisible. */
  hidden?: boolean
  children: ReactNode
}

const FOCUSABLE = 'input, textarea, button, a[href], [tabindex]:not([tabindex="-1"])'

function FullScreenLayer({ label, onClose, hidden = false, children }: FullScreenLayerProps) {
  const ref = useRef<HTMLDivElement>(null)
  useHistoryLayer(onClose)
  useEscape(!hidden, onClose)

  useEffect(() => {
    const layer = ref.current
    if (layer == null || layer.contains(document.activeElement)) return
    layer.querySelector<HTMLElement>(FOCUSABLE)?.focus()
  }, [])

  return (
    <div ref={ref} className="layer" role="dialog" aria-modal="true" aria-label={label} hidden={hidden}>
      {children}
    </div>
  )
}

export default FullScreenLayer
