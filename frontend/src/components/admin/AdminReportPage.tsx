import { useEffect, useId, useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import type { AdminCourt, AdminReport } from '../../types/admin'
import {
  approveAdminReport,
  fetchAdminCourt,
  fetchAdminReport,
  rejectAdminReport,
  resolveAdminReport,
} from '../../services/adminApi'
import { COMPLAINT_TARGET_LABELS, CORRECTION_FIELD_LABELS, REPORT_KIND_LABELS, REPORT_STATUS_LABELS, formatCourtValue } from '../../utils/reportLabels'
import { showToast } from '../../hooks/useToast'

const dateFormatter = new Intl.DateTimeFormat('ru', {
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})

interface AdminReportPageProps {
  reportId: number
  onBack: () => void
  onOpenCourt: (id: number) => void
}

/** Разбор обращения: прежнее и предлагаемое значения, причина, решения. */
function AdminReportPage({ reportId, onBack, onOpenCourt }: AdminReportPageProps) {
  const uid = useId()
  const [report, setReport] = useState<AdminReport | null>(null)
  const [court, setCourt] = useState<AdminCourt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchAdminReport(reportId)
      .then((loaded) => {
        setReport(loaded)
        return fetchAdminCourt(loaded.court_id)
      })
      .then((loadedCourt) => setCourt(loadedCourt))
      .catch((err) => {
        console.error('Failed to fetch report:', err)
        setError('Не удалось загрузить обращение.')
      })
  }, [reportId])

  const decide = async (action: (id: number, note?: string) => Promise<AdminReport>, message: string) => {
    setBusy(true)
    setDecisionError(null)
    try {
      const updated = await action(reportId, note.trim() !== '' ? note.trim() : undefined)
      setReport(updated)
      showToast(message)
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 409) {
        setDecisionError(
          err instanceof Error && err.message !== ''
            ? `Предложение не применено: ${err.message}`
            : 'Предложение устарело: значение изменилось с момента отправки.',
        )
      } else {
        setDecisionError(err instanceof Error ? err.message : 'Действие не выполнено.')
      }
    } finally {
      setBusy(false)
    }
  }

  if (error != null) {
    return (
      <section className="admin-page">
        <button type="button" className="btn btn-ghost admin-page__back" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          К очереди
        </button>
        <p className="admin-page__state admin-page__state--error">{error}</p>
      </section>
    )
  }

  if (report == null) {
    return (
      <section className="admin-page">
        <p className="admin-page__state">Загружаем обращение…</p>
      </section>
    )
  }

  const isCorrection = report.kind === 'correction'
  const targetLabel = isCorrection
    ? CORRECTION_FIELD_LABELS[report.target as keyof typeof CORRECTION_FIELD_LABELS] ?? report.target
    : COMPLAINT_TARGET_LABELS[report.target as keyof typeof COMPLAINT_TARGET_LABELS] ?? report.target
  const fieldValue = isCorrection ? String(report.target) : ''

  const originalValue = isCorrection ? (report.original_value ?? {})[fieldValue] : undefined
  const proposedValue = isCorrection ? (report.proposed_value ?? {})[fieldValue] : undefined
  const currentValue = court != null && isCorrection ? (court as unknown as Record<string, unknown>)[fieldValue] : undefined
  const stale = currentValue !== undefined && originalValue !== undefined && currentValue !== originalValue

  return (
    <section className="admin-page">
      <button type="button" className="btn btn-ghost admin-page__back" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" />
        К очереди
      </button>

      <header className="admin-report__head">
        <h2 className="admin-report__title">
          {REPORT_KIND_LABELS[report.kind]} #{report.id}: {targetLabel}
        </h2>
        <div className="admin-report__chips">
          <span className={`admin-chip admin-chip--${report.status === 'new' ? 'muted' : 'ok'}`}>
            {report.status === 'new' ? 'Новое' : REPORT_STATUS_LABELS[report.status]}
          </span>
          <button type="button" className="admin-chip admin-chip--link" onClick={() => onOpenCourt(report.court_id)}>
            {court?.name ?? `Площадка #${report.court_id}`}
          </button>
        </div>
      </header>

      {isCorrection ? (
        <dl className="admin-report__facts">
          <div className="court-fact">
            <dt className="court-fact__label">Было на момент заявки</dt>
            <dd className="court-fact__value">{formatCourtValue(fieldValue, originalValue)}</dd>
          </div>
          <div className="court-fact">
            <dt className="court-fact__label">Предлагается</dt>
            <dd className="court-fact__value">{formatCourtValue(fieldValue, proposedValue)}</dd>
          </div>
          <div className="court-fact">
            <dt className="court-fact__label">Сейчас в карточке</dt>
            <dd className={`court-fact__value${stale ? ' court-fact__value--warning' : ''}`}>
              {formatCourtValue(fieldValue, currentValue)}
            </dd>
          </div>
        </dl>
      ) : null}

      {report.reason != null && (
        <blockquote className="admin-report__reason">
          <p>{report.reason}</p>
        </blockquote>
      )}

      {report.created_at != null && (
        <p className="admin-report__time">Поступило {dateFormatter.format(new Date(report.created_at))}</p>
      )}

      {stale && report.status === 'new' && (
        <p className="court-form__message" role="alert">
          Исходное значение изменилось с момента заявки: принятие будет отклонено сервером. Проверьте актуальное
          значение и при необходимости исправьте его в карточке вручную.
        </p>
      )}

      {report.status === 'new' ? (
        <div className="admin-report__decide">
          <div className="court-form__field">
            <label className="form-label" htmlFor={`${uid}-note`}>
              Заметка к решению (необязательно, попадает в журнал)
            </label>
            <input id={`${uid}-note`} type="text" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {decisionError != null && (
            <p className="court-form__message" role="alert">
              {decisionError}
            </p>
          )}

          <div className="court-form__actions">
            {isCorrection ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => decide(approveAdminReport, 'Правка применена')}
                >
                  Принять
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => decide(rejectAdminReport, 'Предложение отклонено')}
                >
                  Отклонить
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => decide(resolveAdminReport, 'Обращение закрыто')}
                >
                  Обработано — закрыть
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => decide(rejectAdminReport, 'Жалоба отклонена')}
                >
                  Отклонить
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="admin-report__resolved">
          {report.resolution_note != null && <p>Заметка: {report.resolution_note}</p>}
          {report.resolved_at != null && <p>Закрыто {dateFormatter.format(new Date(report.resolved_at))}</p>}
        </div>
      )}
    </section>
  )
}

export default AdminReportPage
