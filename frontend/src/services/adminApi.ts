import type {
  AdminCourt,
  AdminDeliveryJob,
  AdminHistoryEntry,
  AdminReport,
  AdminSession,
  ReportAccepted,
} from '../types/admin'

import { BASE_URL } from './api'

function readCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)admin_csrf=([^;]+)/)
  return match?.[1] ?? null
}

async function extractError(res: Response): Promise<Error> {
  let message = `${res.status} ${res.statusText}`
  try {
    const body = await res.json()
    if (typeof body.detail === 'string') message = body.detail
    else if (Array.isArray(body.detail)) message = body.detail.map((e: { msg: string }) => e.msg).join('; ')
  } catch {
    // non-JSON error body — keep default message
  }
  const error = new Error(message)
  ;(error as unknown as { status: number }).status = res.status
  return error
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = init.method ?? 'GET'
  const headers = new Headers(init.headers)
  if (method !== 'GET' && method !== 'HEAD') {
    const csrf = readCsrfToken()
    if (csrf != null) headers.set('X-CSRF-Token', csrf)
  }
  if (init.body != null && !headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(path, { ...init, method, headers, credentials: 'include' })
}

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) throw await extractError(res)
  return res.json() as Promise<T>
}

// ------------------------------------------------------------------- session

export async function loginAdmin(username: string, password: string, returnTo: string): Promise<AdminSession> {
  const body = new URLSearchParams({ username, password, return_to: returnTo })
  const res = await adminFetch('/admin/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (res.status === 503) throw new Error('Вход администратора не настроен на сервере')
  return jsonOrThrow<AdminSession>(res)
}

export async function fetchAdminSession(): Promise<AdminSession | null> {
  const res = await adminFetch('/admin/session')
  if (res.status === 401) return null
  return jsonOrThrow<AdminSession>(res)
}

export async function logoutAdmin(): Promise<void> {
  const res = await adminFetch('/admin/session', { method: 'DELETE' })
  if (!res.ok && res.status !== 401) throw await extractError(res)
}

// -------------------------------------------------------------------- courts

export async function fetchAdminCourts(query?: string): Promise<AdminCourt[]> {
  const params = query != null && query !== '' ? `?q=${encodeURIComponent(query)}` : ''
  const res = await adminFetch(`/admin/courts${params}`)
  return jsonOrThrow<AdminCourt[]>(res)
}

export async function fetchAdminCourt(id: number): Promise<AdminCourt> {
  return jsonOrThrow<AdminCourt>(await adminFetch(`/admin/courts/${id}`))
}

export interface AdminCourtChanges {
  name?: string | null
  latitude?: number
  longitude?: number
  surface?: string
  condition?: string
  has_lighting?: boolean
  is_covered?: boolean
  description?: string | null
  address?: string | null
  reason?: string
}

export async function patchAdminCourt(id: number, changes: AdminCourtChanges): Promise<AdminCourt> {
  return jsonOrThrow<AdminCourt>(
    await adminFetch(`/admin/courts/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
  )
}

export async function hideAdminCourt(id: number, reason?: string): Promise<AdminCourt> {
  return jsonOrThrow<AdminCourt>(
    await adminFetch(`/admin/courts/${id}/hide`, { method: 'POST', body: JSON.stringify({ reason: reason ?? null }) }),
  )
}

export async function restoreAdminCourt(id: number, reason?: string): Promise<AdminCourt> {
  return jsonOrThrow<AdminCourt>(
    await adminFetch(`/admin/courts/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason ?? null }),
    }),
  )
}

export async function unpublishAdminDescription(id: number, reason?: string): Promise<AdminCourt> {
  return jsonOrThrow<AdminCourt>(
    await adminFetch(`/admin/courts/${id}/unpublish-description`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason ?? null }),
    }),
  )
}

export async function unpublishAdminPhoto(id: number, reason?: string): Promise<AdminCourt> {
  return jsonOrThrow<AdminCourt>(
    await adminFetch(`/admin/courts/${id}/unpublish-photo`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason ?? null }),
    }),
  )
}

export async function fetchCourtHistory(id: number): Promise<AdminHistoryEntry[]> {
  return jsonOrThrow<AdminHistoryEntry[]>(await adminFetch(`/admin/courts/${id}/history`))
}

// ------------------------------------------------------------------- reports

export async function fetchAdminReports(status?: string): Promise<AdminReport[]> {
  const params = status != null && status !== '' ? `?status=${encodeURIComponent(status)}` : ''
  return jsonOrThrow<AdminReport[]>(await adminFetch(`/admin/reports${params}`))
}

export async function fetchAdminReport(id: number): Promise<AdminReport> {
  return jsonOrThrow<AdminReport>(await adminFetch(`/admin/reports/${id}`))
}

export async function approveAdminReport(id: number, note?: string): Promise<AdminReport> {
  return jsonOrThrow<AdminReport>(
    await adminFetch(`/admin/reports/${id}/approve`, { method: 'POST', body: JSON.stringify({ note: note ?? null }) }),
  )
}

export async function rejectAdminReport(id: number, note?: string): Promise<AdminReport> {
  return jsonOrThrow<AdminReport>(
    await adminFetch(`/admin/reports/${id}/reject`, { method: 'POST', body: JSON.stringify({ note: note ?? null }) }),
  )
}

export async function resolveAdminReport(id: number, note?: string): Promise<AdminReport> {
  return jsonOrThrow<AdminReport>(
    await adminFetch(`/admin/reports/${id}/resolve`, { method: 'POST', body: JSON.stringify({ note: note ?? null }) }),
  )
}

// -------------------------------------------------------------- delivery jobs

export async function fetchDeliveryJobs(): Promise<AdminDeliveryJob[]> {
  return jsonOrThrow<AdminDeliveryJob[]>(await adminFetch('/admin/delivery-jobs'))
}

// -------------------------------------------------------- public submissions

export interface SubmitReportParams {
  kind: 'correction' | 'complaint'
  target: string
  proposedValue?: boolean | string
  reason?: string
}

export async function submitCourtReport(courtId: number, params: SubmitReportParams): Promise<ReportAccepted> {
  const body: Record<string, unknown> = { kind: params.kind, target: params.target }
  if (params.proposedValue !== undefined) body.proposed_value = params.proposedValue
  if (params.reason != null) body.reason = params.reason
  const res = await fetch(`${BASE_URL}/courts/${courtId}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw await extractError(res)
  return res.json() as Promise<ReportAccepted>
}
