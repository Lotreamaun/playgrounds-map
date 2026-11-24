import { useSyncExternalStore } from 'react'

export interface ToastState {
  id: number
  message: string
}

const HIDE_AFTER_MS = 2000

let state: ToastState | null = null
let counter = 0
let timer: number | null = null
const listeners = new Set<() => void>()

function emit(next: ToastState | null) {
  state = next
  listeners.forEach((l) => l())
}

/** One toast per app: a new message replaces the current one. */
export function showToast(message: string) {
  if (timer !== null) window.clearTimeout(timer)
  counter += 1
  emit({ id: counter, message })
  timer = window.setTimeout(() => {
    timer = null
    emit(null)
  }, HIDE_AFTER_MS)
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => state

export function useToast(): ToastState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
