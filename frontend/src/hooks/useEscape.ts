import { useEffect, useRef } from 'react'

/**
 * Escape handling with a stack: only the most recently activated handler runs,
 * so a lightbox or open menu closes before the card or screen underneath it.
 */
const stack: Array<() => void> = []
let installed = false

function onKeyDown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || stack.length === 0) return
  event.stopPropagation()
  stack[stack.length - 1]()
}

export function useEscape(active: boolean, handler: () => void) {
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    if (!active) return
    const entry = () => handlerRef.current()
    stack.push(entry)
    if (!installed) {
      installed = true
      window.addEventListener('keydown', onKeyDown)
    }
    return () => {
      const index = stack.lastIndexOf(entry)
      if (index !== -1) stack.splice(index, 1)
    }
  }, [active])
}
