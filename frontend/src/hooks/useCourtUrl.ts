import { useEffect, useRef, useState } from 'react'

const PARAM = 'court'

function readInitialId(): number | null {
  const raw = new URLSearchParams(window.location.search).get(PARAM)
  if (raw == null || raw === '') return null
  const id = Number(raw)
  return Number.isInteger(id) ? id : null
}

function writeUrl(id: number | null) {
  const url = new URL(window.location.href)
  const current = url.searchParams.get(PARAM)
  if (id == null) {
    if (current == null) return
    url.searchParams.delete(PARAM)
  } else {
    if (current === String(id)) return
    url.searchParams.set(PARAM, String(id))
  }
  // Only replaceState: history entries are owned by the full-screen layers.
  window.history.replaceState(window.history.state, '', url)
}

interface Options {
  selectedId: number | null
  /** Courts are loaded, so an id from the URL can be resolved. */
  ready: boolean
  exists: (id: number) => boolean
  onOpen: (id: number) => void
}

/** Keeps `?court=<id>` in sync with the selected court; opens the one named at startup. */
export function useCourtUrl({ selectedId, ready, exists, onOpen }: Options) {
  const [initialId] = useState(readInitialId)
  const hasPendingRef = useRef(true)
  useEffect(() => {
    hasPendingRef.current = initialId != null
  }, [initialId])
  const selectedIdRef = useRef(selectedId)

  useEffect(() => {
    selectedIdRef.current = selectedId
  })

  useEffect(() => {
    if (!ready || !hasPendingRef.current) return
    hasPendingRef.current = false
    const id = initialId
    if (id != null && exists(id)) {
      onOpen(id)
    } else {
      writeUrl(null)
    }
  }, [ready, exists, onOpen, initialId])

  useEffect(() => {
    if (hasPendingRef.current) return
    writeUrl(selectedId)
  }, [selectedId, ready])

  // Closing a layer pops a history entry, which can restore a stale URL.
  useEffect(() => {
    const onPopState = () => {
      if (!hasPendingRef.current) writeUrl(selectedIdRef.current)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
}
