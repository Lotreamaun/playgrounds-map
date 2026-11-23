import { useEffect, useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { X } from '@phosphor-icons/react'
import { useEscape } from '../hooks/useEscape'

const DISMISS_DISTANCE_PX = 80
const DISMISS_VELOCITY_PX_MS = 0.5
const DISMISS_ANIMATION_MS = 180

interface CardSheetProps {
  label: string
  onClose: () => void
  /** Called with the sheet's rendered height (0 on unmount). */
  onHeightChange: (height: number) => void
  /** Scroll position resets when this changes (another court was selected). */
  resetKey: string | number
  children: ReactNode
}

/**
 * Non-modal bottom sheet: no overlay element, so the map above stays interactive.
 * Dragging works only on the header (touch-action: none); the body scrolls natively.
 */
function CardSheet({ label, onClose, onHeightChange, resetKey, children }: CardSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startY: number; startTime: number; dy: number } | null>(null)
  const closing = useRef(false)

  useEscape(true, onClose)

  useEffect(() => {
    const sheet = sheetRef.current
    if (sheet == null) return
    const observer = new ResizeObserver(([entry]) => {
      onHeightChange(Math.round(entry.borderBoxSize?.[0]?.blockSize ?? sheet.offsetHeight))
    })
    observer.observe(sheet)
    return () => {
      observer.disconnect()
      onHeightChange(0)
    }
  }, [onHeightChange])

  useEffect(() => {
    if (bodyRef.current != null) bodyRef.current.scrollTop = 0
  }, [resetKey])

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button') != null || closing.current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { startY: event.clientY, startTime: performance.now(), dy: 0 }
    sheetRef.current?.classList.add('card-sheet--dragging')
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (state == null || sheetRef.current == null) return
    state.dy = Math.max(0, event.clientY - state.startY)
    sheetRef.current.style.transform = `translateY(${state.dy}px)`
  }

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const state = drag.current
    const sheet = sheetRef.current
    drag.current = null
    if (state == null || sheet == null) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    sheet.classList.remove('card-sheet--dragging')
    const elapsed = Math.max(1, performance.now() - state.startTime)
    const fast = state.dy > 20 && state.dy / elapsed > DISMISS_VELOCITY_PX_MS
    if (!cancelled && (state.dy > DISMISS_DISTANCE_PX || fast)) {
      closing.current = true
      sheet.style.transform = 'translateY(100%)'
      window.setTimeout(onClose, DISMISS_ANIMATION_MS)
    } else {
      sheet.style.transform = ''
    }
  }

  return (
    <div ref={sheetRef} className="card-sheet" role="region" aria-label={label}>
      <div
        className="card-sheet__header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => finishDrag(e, false)}
        onPointerCancel={(e) => finishDrag(e, true)}
      >
        <span className="card-sheet__handle" aria-hidden="true" />
        <button type="button" className="icon-btn card-sheet__close" aria-label="Закрыть карточку" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      <div ref={bodyRef} className="card-sheet__body">
        {children}
      </div>
    </div>
  )
}

export default CardSheet
