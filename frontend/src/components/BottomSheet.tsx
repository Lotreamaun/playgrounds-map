import { useLayoutEffect, useEffect, useRef, useState, type ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  modal?: boolean
  onClose: () => void
  children: ReactNode
}

const PEEK_HEIGHT = 80
const EXPAND_DELTA = 60
const DISMISS_DELTA = 120

type SheetState = 'peek' | 'expanded'

function BottomSheet({ open, modal = false, onClose, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [sheetState, setSheetState] = useState<SheetState>('peek')
  const [offset, setOffset] = useState(0)
  const [translateY, setTranslateY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const draggingRef = useRef(false)
  const startY = useRef(0)
  const startTransform = useRef(0)
  const stateRef = useRef(sheetState)
  const offsetRef = useRef(offset)

  useEffect(() => {
    stateRef.current = sheetState
  }, [sheetState])

  useEffect(() => {
    offsetRef.current = offset
  }, [offset])

  useLayoutEffect(() => {
    if (open) {
      const el = sheetRef.current
      const overflow = el == null ? 1 : Math.max(1, el.offsetHeight - PEEK_HEIGHT)
      setOffset(overflow)
      setSheetState(modal ? 'expanded' : 'peek')
      setTranslateY(modal ? 0 : overflow)
    } else {
      setTranslateY(typeof window !== 'undefined' ? window.innerHeight + 20 : 1200)
    }
  }, [open, modal])

  const handlePointerDown = (e: React.PointerEvent) => {
    if (modal) return
    draggingRef.current = true
    setDragging(true)
    startY.current = e.clientY
    startTransform.current = translateY
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const delta = e.clientY - startY.current
    const raw = startTransform.current + delta
    const min = -1
    const max = window.innerHeight + 20
    const clamped = Math.max(min, Math.min(max, raw))
    setTranslateY(clamped)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    const delta = e.clientY - startY.current
    if (delta > DISMISS_DELTA) {
      onClose()
      return
    }
    if (stateRef.current === 'peek') {
      if (delta < -EXPAND_DELTA) {
        setSheetState('expanded')
        setTranslateY(0)
      } else {
        setTranslateY(offsetRef.current)
      }
    } else {
      if (delta > EXPAND_DELTA) {
        setSheetState('peek')
        setTranslateY(offsetRef.current)
      } else {
        setTranslateY(0)
      }
    }
  }

  const handleOverlayClick = () => {
    if (!modal) onClose()
  }

  const sheetStyle: React.CSSProperties = {
    transform: `translateY(${translateY}px)`,
  }

  return (
    <div
      className={`bottom-sheet-overlay${open ? ' bottom-sheet-overlay--visible' : ''}`}
      onClick={handleOverlayClick}
    >
      <div
        ref={sheetRef}
        className={`bottom-sheet${modal ? ' bottom-sheet--modal' : ''}${dragging ? ' bottom-sheet--dragging' : ''}`}
        style={sheetStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {!modal && (
          <div
            className="bottom-sheet__handle"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div className="bottom-sheet__handle-bar" />
          </div>
        )}
        <div className="bottom-sheet__content">{open ? children : null}</div>
      </div>
    </div>
  )
}

export default BottomSheet