/** Типы API администрирования (backend /admin/* и POST /courts/{id}/reports). */

import type { Court } from '../services/api'

export type ReportKind = 'correction' | 'complaint'

export type ReportStatus = 'new' | 'approved' | 'rejected' | 'resolved'

export type CorrectionField = 'has_lighting' | 'surface' | 'condition' | 'is_covered'

export type ComplaintTarget = 'card' | 'description' | 'photo'

export interface AdminCourt extends Court {
  is_hidden: boolean
  is_photo_published: boolean
}

export interface AdminReportCourt {
  id: number
  name: string | null
  sport_type: string
  is_hidden: boolean
}

export interface AdminReport {
  id: number
  court_id: number
  kind: ReportKind
  target: CorrectionField | ComplaintTarget
  original_value: Record<string, unknown> | null
  proposed_value: Record<string, unknown> | null
  reason: string | null
  reporter_ip: string | null
  status: ReportStatus
  resolution_note: string | null
  created_at: string | null
  resolved_at: string | null
  court: AdminReportCourt | null
}

export interface AdminHistoryEntry {
  id: number
  court_id: number | null
  report_id: number | null
  admin: string
  action: 'edit' | 'hide' | 'restore' | 'unpublish_description' | 'unpublish_photo' | 'approve' | 'reject' | 'resolve'
  reason: string | null
  result: 'done' | 'stale'
  details: Record<string, unknown> | null
  created_at: string | null
}

export interface AdminDeliveryJob {
  id: number
  kind: 'court_created' | 'report_created'
  court_id: number | null
  report_id: number | null
  status: 'pending' | 'done' | 'failed'
  attempts: number
  last_error: string | null
  created_at: string | null
}

export interface ReportAccepted {
  id: number
  status: ReportStatus
  message: string
}

export interface AdminSession {
  admin: string
  return_to?: string | null
}
