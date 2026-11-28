import { useEffect, useState } from 'react'
import type { AdminDeliveryJob, AdminReport, ReportStatus } from '../../types/admin'
import { fetchAdminReports, fetchDeliveryJobs } from '../../services/adminApi'
import { COMPLAINT_TARGET_LABELS, REPORT_KIND_LABELS, REPORT_STATUS_LABELS } from '../../utils/reportLabels'
import { CORRECTION_FIELD_LABELS } from '../../utils/reportLabels'
import OptionGroup from '../OptionGroup'
import type { Option } from '../OptionGroup'

const dateFormatter = new Intl.DateTimeFormat('ru', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const FILTER_OPTIONS: Option[] = [
  { value: 'new', label: 'Новые' },
  { value: 'approved', label: 'Принятые' },
  { value: 'resolved', label: 'Обработанные' },
  { value: 'rejected', label: 'Отклонённые' },
  { value: 'all', label: 'Все' },
]

function reportTargetLabel(report: AdminReport): string {
  if (report.kind === 'correction') return CORRECTION_FIELD_LABELS[report.target as keyof typeof CORRECTION_FIELD_LABELS] ?? report.target
  return COMPLAINT_TARGET_LABELS[report.target as keyof typeof COMPLAINT_TARGET_LABELS] ?? report.target
}

interface AdminReportsPageProps {
  onOpenReport: (id: number) => void
}

/** Общая очередь обращений: исправления и жалобы, фильтр по статусу,
 * ошибки доставки уведомлений видны оператору. */
function AdminReportsPage({ onOpenReport }: AdminReportsPageProps) {
  const [filter, setFilter] = useState<string>('new')
  const [result, setResult] = useState<{ filter: string; reports: AdminReport[]; error: boolean } | null>(null)
  const [jobs, setJobs] = useState<AdminDeliveryJob[] | null>(null)

  useEffect(() => {
    fetchAdminReports(filter === 'all' ? undefined : (filter as ReportStatus))
      .then((items) => setResult({ filter, reports: items, error: false }))
      .catch((err) => {
        console.error('Failed to fetch reports:', err)
        setResult({ filter, reports: [], error: true })
      })
  }, [filter])

  useEffect(() => {
    fetchDeliveryJobs()
      .then((items) => setJobs(items.filter((job) => job.status === 'failed')))
      .catch((err) => console.error('Failed to fetch delivery jobs:', err))
  }, [])

  const loading = result == null || result.filter !== filter
  const failed = result?.filter === filter && result.error

  return (
    <section className="admin-page">
      <OptionGroup
        id="admin-reports-filter"
        label="Статус"
        options={FILTER_OPTIONS}
        value={filter}
        onChange={setFilter}
        variant="segmented"
      />

      {loading && <p className="admin-page__state">Загружаем обращения…</p>}
      {failed && <p className="admin-page__state admin-page__state--error">Не удалось загрузить обращения.</p>}

      {result?.filter === filter && !result.error && (
        <ul className="admin-list">
          {result.reports.length === 0 && (
            <li className="admin-list__empty">В этой очереди пусто.</li>
          )}
          {result.reports.map((report) => (
            <li key={report.id}>
              <button type="button" className="admin-list__row" onClick={() => onOpenReport(report.id)}>
                <span className="admin-list__row-main">
                  <span className="admin-list__row-title">
                    {REPORT_KIND_LABELS[report.kind] ?? report.kind}: {reportTargetLabel(report)}
                    {report.status !== 'new' && (
                      <span className={`admin-chip admin-chip--${report.status === 'approved' || report.status === 'resolved' ? 'ok' : 'muted'}`}>
                        {REPORT_STATUS_LABELS[report.status]}
                      </span>
                    )}
                  </span>
                  <span className="admin-list__row-sub">
                    {report.court != null ? report.court.name ?? `Площадка #${report.court.id}` : `Площадка #${report.court_id}`}
                    {report.reason != null ? ` · ${report.reason}` : ''}
                  </span>
                  <span className="admin-list__row-meta">
                    {report.created_at != null ? dateFormatter.format(new Date(report.created_at)) : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {jobs != null && jobs.length > 0 && (
        <div className="admin-delivery">
          <h3 className="admin-delivery__title">Не доставлено в Telegram</h3>
          <ul>
            {jobs.map((job) => (
              <li key={job.id} className="admin-delivery__item">
                {job.kind === 'court_created' ? `Площадка #${job.court_id}` : `Обращение #${job.report_id}`} —{' '}
                {job.last_error ?? 'ошибка доставки'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default AdminReportsPage
