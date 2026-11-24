import { useEffect, useRef } from 'react'

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

/** While mounted, the system "back" calls `onClose` (topmost layer first). */
export function useHistoryLayer(onClose: () => void) {
  const entryRef = useRef<LayerEntry | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

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
}
