import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Flag, PencilSimple } from '@phosphor-icons/react'
import type { Court } from '../services/api'
import { submitCourtReport } from '../services/adminApi'
import type { ComplaintTarget, CorrectionField } from '../types/admin'
import { COMPLAINT_TARGET_LABELS, CORRECTION_FIELD_LABELS, formatCourtValue } from '../utils/reportLabels'
import { CONDITION_LABELS, FORM_SURFACES, SURFACE_LABELS } from '../utils/labels'
import OptionGroup from './OptionGroup'
import type { Option } from './OptionGroup'
import { showToast } from '../hooks/useToast'

type FeedbackMode = 'correction' | 'complaint'

const FIELD_OPTIONS: Option[] = (
  Object.entries(CORRECTION_FIELD_LABELS) as Array<[CorrectionField, string]>
).map(([value, label]) => ({ value, label }))

const COMPLAINT_OPTIONS: Option[] = (Object.keys(COMPLAINT_TARGET_LABELS) as ComplaintTarget[]).map((value) => ({
  value,
  label: COMPLAINT_TARGET_LABELS[value],
}))

const BOOL_OPTIONS: Record<'has_lighting' | 'is_covered', Option[]> = {
  has_lighting: [
    { value: 'true', label: 'Есть' },
    { value: 'false', label: 'Нет' },
  ],
  is_covered: [
    { value: 'true', label: 'Крытая' },
    { value: 'false', label: 'Улица' },
  ],
}

const SURFACE_OPTIONS: Option[] = FORM_SURFACES.map((value) => ({ value, label: SURFACE_LABELS[value] }))
const CONDITION_OPTIONS: Option[] = Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }))
const REASON_LIMIT = 500

function proposedOptionsFor(field: CorrectionField): Option[] {
  if (field === 'has_lighting' || field === 'is_covered') return BOOL_OPTIONS[field]
  if (field === 'surface') return SURFACE_OPTIONS
  return CONDITION_OPTIONS
}

function parseProposedValue(field: CorrectionField, raw: string): boolean | string {
  if (field === 'has_lighting' || field === 'is_covered') return raw === 'true'
  return raw
}

/**
 * Публичные формы обращения по площадке: предложить исправление характеристики
 * или пожаловаться на карточку, описание, фото. Решение остаётся за админом.
 */
function CourtFeedback({ court }: { court: Court }) {
  const uid = useId()
  const [mode, setMode] = useState<FeedbackMode | null>(null)
  const [field, setField] = useState<CorrectionField>('has_lighting')
  const [proposed, setProposed] = useState('')
  const [complaintTarget, setComplaintTarget] = useState<ComplaintTarget>('description')
  const [reason, setReason] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (court.id == null) return null

  const startCorrection = () => {
    setMode('correction')
    setProposed('')
    setReason('')
    setMessage(null)
  }

  const startComplaint = () => {
    setMode('complaint')
    setReason('')
    setMessage(null)
  }

  const cancel = () => {
    setMode(null)
    setMessage(null)
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    setSubmitting(true)
    try {
      if (mode === 'correction') {
        if (proposed === '') {
          setMessage('Выберите новое значение.')
          return
        }
        await submitCourtReport(court.id as number, {
          kind: 'correction',
          target: field,
          proposedValue: parseProposedValue(field, proposed),
          reason: reason.trim() !== '' ? reason.trim() : undefined,
        })
      } else {
        await submitCourtReport(court.id as number, {
          kind: 'complaint',
          target: complaintTarget,
          reason: reason.trim() !== '' ? reason.trim() : undefined,
        })
      }
      showToast(mode === 'correction' ? 'Предложение отправлено' : 'Жалоба отправлена')
      setMode(null)
      setReason('')
      setProposed('')
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 429) {
        setMessage('Слишком много обращений. Попробуйте позже.')
      } else {
        setMessage(err instanceof Error ? err.message : 'Не удалось отправить. Попробуйте позже.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="court-feedback">
      {mode == null && (
        <div className="court-feedback__trigger">
          <button type="button" className="btn btn-ghost court-feedback__btn" onClick={startCorrection}>
            <PencilSimple size={16} aria-hidden="true" />
            Исправить данные
          </button>
          <button type="button" className="btn btn-ghost court-feedback__btn" onClick={startComplaint}>
            <Flag size={16} aria-hidden="true" />
            Пожаловаться
          </button>
        </div>
      )}

      {mode != null && (
        <form className="court-feedback__form" onSubmit={handleSubmit}>
          <div className="court-feedback__head">
            <h2 className="court-feedback__title">
              {mode === 'correction' ? 'Предложить исправление' : 'Пожаловаться'}
            </h2>
            <button type="button" className="icon-btn" aria-label="Закрыть форму" onClick={cancel} disabled={submitting}>
              ×
            </button>
          </div>

          {mode === 'correction' ? (
            <>
              <OptionGroup
                id={`${uid}-field`}
                label="Что исправить"
                options={FIELD_OPTIONS}
                value={field}
                onChange={(value) => {
                  setField(value as CorrectionField)
                  setProposed('')
                }}
              />
              <p className="court-feedback__current">
                Сейчас: {formatCourtValue(field, (court as Record<string, unknown>)[field])}
              </p>
              <OptionGroup
                id={`${uid}-proposed`}
                label="Новое значение"
                options={proposedOptionsFor(field)}
                value={proposed}
                onChange={setProposed}
              />
            </>
          ) : (
            <OptionGroup
              id={`${uid}-target`}
              label="На что жалуетесь"
              options={COMPLAINT_OPTIONS}
              value={complaintTarget}
              onChange={(value) => setComplaintTarget(value as ComplaintTarget)}
            />
          )}

          <div className="court-form__field">
            <label className="form-label" htmlFor={`${uid}-reason`}>
              {mode === 'correction' ? 'Пояснение (необязательно)' : 'Что не так?'}
            </label>
            <textarea
              id={`${uid}-reason`}
              rows={2}
              required={mode === 'complaint'}
              maxLength={REASON_LIMIT}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={mode === 'correction' ? 'Вечером нет света уже месяц' : 'В описании реклама'}
            />
          </div>

          {message != null && (
            <p className="court-form__message" role="alert">
              {message}
            </p>
          )}

          <div className="court-form__actions">
            <button type="button" className="btn btn-secondary" onClick={cancel} disabled={submitting}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Отправка…' : 'Отправить'}
            </button>
          </div>
          <p className="court-feedback__note">Отправим администратору на проверку — изменение применится после одобрения.</p>
        </form>
      )}
    </div>
  )
}

export default CourtFeedback
