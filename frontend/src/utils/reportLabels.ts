import type { ComplaintTarget, CorrectionField, ReportStatus } from '../types/admin'
import { CONDITION_LABELS, SURFACE_LABELS } from './labels'

export const CORRECTION_FIELD_LABELS: Record<CorrectionField, string> = {
  has_lighting: 'Освещение',
  surface: 'Покрытие',
  condition: 'Состояние',
  is_covered: 'Крытая площадка',
}

export const COMPLAINT_TARGET_LABELS: Record<ComplaintTarget, string> = {
  card: 'Карточка',
  description: 'Описание',
  photo: 'Фото',
}

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  new: 'Новые',
  approved: 'Принятые',
  rejected: 'Отклонённые',
  resolved: 'Обработанные',
}

export const REPORT_KIND_LABELS: Record<string, string> = {
  correction: 'Исправление',
  complaint: 'Жалоба',
}

export const HISTORY_ACTION_LABELS: Record<string, string> = {
  edit: 'Правка данных',
  hide: 'Скрытие',
  restore: 'Восстановление',
  unpublish_description: 'Убрано описание',
  unpublish_photo: 'Убрано фото',
  approve: 'Одобрение правки',
  reject: 'Отклонение обращения',
  resolve: 'Обращение закрыто',
}

/** Человекочитаемое значение характеристики для карточек и журнала. */
export function formatCourtValue(field: string, value: unknown): string {
  if (value == null) return '—'
  if (field === 'has_lighting') return value === true ? 'Есть' : value === false ? 'Нет' : String(value)
  if (field === 'is_covered') return value === true ? 'Крытая' : value === false ? 'Улица' : String(value)
  if (field === 'surface') return SURFACE_LABELS[value as string] ?? String(value)
  if (field === 'condition') return CONDITION_LABELS[value as string] ?? String(value)
  if (typeof value === 'boolean') return value ? 'да' : 'нет'
  return String(value)
}
