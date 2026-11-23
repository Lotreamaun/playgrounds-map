import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useEscape } from '../hooks/useEscape'

/*
 * History bookkeeping. Opening a layer pushes one entry so the system "back"
 * closes the layer instead of leaving the page. Closing from the UI must pop
 * that entry (history.back()) without the resulting popstate being treated as
 * a user "back", hence the pendingBacks counter and the single global listener.
 *
 * The history.back() on unmount is deferred by a tick so that an immediate
 * remount (React StrictMode in dev) cancels it instead of desynchronising the
 * history stack (which could navigate away from the app).
 */
interface LayerEntry {
  close: () => void
}
const layerStack: LayerEntry[] = []
let pendingBacks = 0
let listening = false

function onPopState() {
  if (pendingBacks > 0) {
    pendingBacks -= 1
    return
  }
  const top = layerStack.pop()
  top?.close()
}

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
  const entryRef = useRef<LayerEntry | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEscape(!hidden, onClose)

  useEffect(() => {
    if (!listening) {
      listening = true
      window.addEventListener('popstate', onPopState)
    }
    if (closeTimerRef.current != null) {
      // Immediate remount (StrictMode): keep the entry we already pushed.
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    } else {
      const entry: LayerEntry = { close: () => onCloseRef.current() }
      entryRef.current = entry
      layerStack.push(entry)
      history.pushState({ layer: true }, '')
    }
    return () => {
      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null
        const entry = entryRef.current
        entryRef.current = null
        const index = entry == null ? -1 : layerStack.indexOf(entry)
        if (index !== -1) {
          // Closed by the UI (not by popstate): drop the history entry we added.
          layerStack.splice(index, 1)
          pendingBacks += 1
          history.back()
        }
      }, 0)
    }
  }, [])

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
