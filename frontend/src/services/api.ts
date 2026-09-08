import type { components } from '../types/court'

export const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export type Court = components['schemas']['Court']

export interface BBox {
  min_lat: number
  min_lon: number
  max_lat: number
  max_lon: number
}

export async function getCourts(bbox?: BBox): Promise<Court[]> {
  const params = new URLSearchParams()
  if (bbox != null) {
    for (const [key, value] of Object.entries(bbox)) {
      params.set(key, String(value))
    }
  }

  const query = params.toString()
  const res = await fetch(`${BASE_URL}/courts${query === '' ? '' : `?${query}`}`)
  if (!res.ok) {
    throw new Error(`GET /courts failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<Court[]>
}

export async function getCourt(id: number): Promise<Court> {
  const res = await fetch(`${BASE_URL}/courts/${id}`)
  if (!res.ok) {
    throw new Error(`GET /courts/${id} failed: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<Court>
}

export interface CreateCourtParams {
  sport_type: string
  name?: string
  latitude: number
  longitude: number
  surface: string
  condition: string
  has_lighting: boolean
  description?: string
  address?: string
  photo?: File
}

export async function createCourt(params: CreateCourtParams): Promise<Court> {
  const formData = new FormData()
  formData.set('sport_type', params.sport_type)
  formData.set('latitude', String(params.latitude))
  formData.set('longitude', String(params.longitude))
  formData.set('surface', params.surface)
  formData.set('condition', params.condition)
  formData.set('has_lighting', String(params.has_lighting))
  if (params.name != null) formData.set('name', params.name)
  if (params.description != null) formData.set('description', params.description)
  if (params.address != null) formData.set('address', params.address)
  if (params.photo != null) formData.set('photo', params.photo)

  const res = await fetch(`${BASE_URL}/courts`, { method: 'POST', body: formData })

  if (!res.ok) {
    let message = `POST /courts failed: ${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body.detail != null) {
        message = typeof body.detail === 'string'
          ? body.detail
          : Array.isArray(body.detail)
            ? body.detail.map((e: { msg: string }) => e.msg).join('; ')
            : message
      }
    } catch {
      // non-JSON error body — keep default message
    }
    const error = new Error(message)
    ;(error as unknown as { status: number }).status = res.status
    throw error
  }

  return res.json() as Promise<Court>
}