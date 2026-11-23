import { useSyncExternalStore } from 'react'
import { getCourts } from '../services/api'
import type { Court } from '../services/api'

export type CourtsStatus = 'loading' | 'ready' | 'error'
export interface CourtsState {
  status: CourtsStatus
  courts: Court[]
}

let state: CourtsState = { status: 'loading', courts: [] }
let started = false
const listeners = new Set<() => void>()

function setState(next: CourtsState) {
  state = next
  listeners.forEach((l) => l())
}

function load() {
  setState({ status: 'loading', courts: state.courts })
  getCourts().then(
    (courts) => setState({ status: 'ready', courts }),
    (err) => {
      console.error('Failed to fetch courts:', err)
      setState({ status: 'error', courts: state.courts })
    },
  )
}

export function retryCourts() {
  if (state.status === 'loading' && started) return
  started = true
  load()
}

/** Optimistic add after a successful POST. */
export function addCourt(court: Court) {
  setState({ ...state, courts: [...state.courts.filter((c) => c.id !== court.id), court] })
}

export function courtById(id: number | null | undefined): Court | undefined {
  if (id == null) return undefined
  return state.courts.find((c) => c.id === id)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  if (!started) {
    started = true
    // Defer so state is not updated during subscribe.
    queueMicrotask(load)
  }
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => state

export function useCourts() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { ...snapshot, retry: retryCourts, add: addCourt, byId: courtById }
}
