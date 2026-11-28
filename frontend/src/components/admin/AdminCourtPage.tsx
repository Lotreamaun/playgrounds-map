import { useCallback, useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, ClockClockwise, EyeSlash, Image, TextAa } from '@phosphor-icons/react'
import type { AdminCourt, AdminHistoryEntry } from '../../types/admin'
import {
  fetchAdminCourt,
  fetchCourtHistory,
  hideAdminCourt,
  patchAdminCourt,
  restoreAdminCourt,
  unpublishAdminDescription,
  unpublishAdminPhoto,
} from '../../services/adminApi'
import type { AdminCourtChanges } from '../../services/adminApi'
import { CONDITION_LABELS, FORM_SURFACES, SURFACE_LABELS } from '../../utils/labels'
import { HISTORY_ACTION_LABELS, formatCourtValue } from '../../utils/reportLabels'
import OptionGroup from '../OptionGroup'
import type { Option } from '../OptionGroup'
import { showToast } from '../../hooks/useToast'

interface AdminCourtPageProps {
  courtId: number
  onBack: () => void
  onOpenReport: (id: number) => void
}

const dateFormatter = new Intl.DateTimeFormat('ru', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function surfaceOptions(current: string): Option[] {
  const values = FORM_SURFACES.includes(current) ? FORM_SURFACES : [...FORM_SURFACES, current]
  return values.map((value) => ({ value, label: SURFACE_LABELS[value] ?? value }))
}

const PRIVATE_HISTORY_FIELDS: Record<string, string> = {
  name: 'Название',
  address: 'Адрес',
  description: 'Описание',
}

function formatHistoryValue(field: string, value: unknown): string {
  if (field in PRIVATE_HISTORY_FIELDS) return value ? 'Заполнено' : 'Пусто'
  return formatCourtValue(field, value)
}

const CONDITION_OPTIONS: Option[] = Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label }))

/** Форма управления площадкой: правка полей и координат, снятие описания/фото,
 * скрытие и восстановление, история действий по площадке и её обращениям. */
function AdminCourtPage({ courtId, onBack, onOpenReport }: AdminCourtPageProps) {
  const uid = useId()
  const [court, setCourt] = useState<AdminCourt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<AdminHistoryEntry[] | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)

  // Поля формы: инициализируются после загрузки.
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [surface, setSurface] = useState('')
  const [condition, setCondition] = useState('')
  const [hasLighting, setHasLighting] = useState(false)
  const [covered, setCovered] = useState(false)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchAdminCourt(courtId)
      .then((loaded) => {
        setCourt(loaded)
        setName(loaded.name ?? '')
        setAddress(loaded.address ?? '')
        setDescription(loaded.description ?? '')
        setLatitude(String(loaded.latitude))
        setLongitude(String(loaded.longitude))
        setSurface(loaded.surface)
        setCondition(loaded.condition)
        setHasLighting(loaded.has_lighting === true)
        setCovered(loaded.is_covered === true)
      })
      .catch((err) => {
        console.error('Failed to fetch admin court:', err)
        setError('Не удалось загрузить площадку.')
      })
  }, [courtId])

  const refreshHistory = useCallback(() => {
    fetchCourtHistory(courtId)
      .then(setHistory)
      .catch((err) => console.error('Failed to fetch history:', err))
  }, [courtId])

  useEffect(() => {
    if (historyOpen && history == null) refreshHistory()
  }, [historyOpen, history, refreshHistory])

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (court == null) return
    setActionError(null)
    const lat = Number(latitude)
    const lon = Number(longitude)
    if (latitude.trim() === '' || longitude.trim() === '' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
      setActionError('Введите широту и долготу числами.')
      return
    }
    const changes: AdminCourtChanges = {}
    if (name.trim() !== (court.name ?? '')) changes.name = name.trim() || null
    if (address.trim() !== (court.address ?? '')) changes.address = address.trim() || null
    if (description.trim() !== (court.description ?? '')) changes.description = description.trim() || null
    if (lat !== court.latitude) changes.latitude = lat
    if (lon !== court.longitude) changes.longitude = lon
    if (surface !== court.surface) changes.surface = surface
    if (condition !== court.condition) changes.condition = condition
    if (hasLighting !== (court.has_lighting === true)) changes.has_lighting = hasLighting
    if (covered !== (court.is_covered === true)) changes.is_covered = covered
    if (Object.keys(changes).length === 0) return
    changes.reason = reason.trim() || undefined
    setSaving(true)
    try {
      const updated = await patchAdminCourt(courtId, changes)
      setCourt(updated)
      showToast('Изменения сохранены')
      if (historyOpen) refreshHistory()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось сохранить изменения.'
      setActionError(message)
    } finally {
      setSaving(false)
    }
  }

  const runAction = async (action: () => Promise<AdminCourt>, successMessage: string) => {
    setBusy(true)
    setActionError(null)
    try {
      const updated = await action()
      setCourt(updated)
      setDescription(updated.description ?? '')
      showToast(successMessage)
      if (historyOpen) refreshHistory()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Действие не выполнено.')
    } finally {
      setBusy(false)
    }
  }

  if (error != null) {
    return (
      <section className="admin-page">
        <button type="button" className="btn btn-ghost admin-page__back" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          К списку
        </button>
        <p className="admin-page__state admin-page__state--error">{error}</p>
      </section>
    )
  }

  if (court == null) {
    return (
      <section className="admin-page">
        <p className="admin-page__state">Загружаем площадку…</p>
      </section>
    )
  }

  const trimmedReason = reason.trim() !== '' ? reason.trim() : undefined

  return (
    <section className="admin-page">
      <button type="button" className="btn btn-ghost admin-page__back" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" />
        К списку
      </button>

      <header className="admin-court__head">
        <h2 className="admin-court__title">{court.name ?? `Площадка #${court.id}`}</h2>
        <div className="admin-court__chips">
          {court.is_hidden && <span className="admin-chip admin-chip--muted">Скрыта</span>}
          {!court.is_hidden && <span className="admin-chip admin-chip--ok">Опубликовано</span>}
          <a className="admin-chip admin-chip--link" href={`/?court=${court.id}`}>
            Открыть карточку
          </a>
        </div>
      </header>

      <form className="admin-court__form" onSubmit={handleSave}>
        <div className="court-form__field">
          <label className="form-label" htmlFor={`${uid}-name`}>
            Название
          </label>
          <input id={`${uid}-name`} type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="admin-court__coords">
          <div className="court-form__field">
            <label className="form-label" htmlFor={`${uid}-lat`}>
              Широта
            </label>
            <input id={`${uid}-lat`} type="text" inputMode="decimal" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
          </div>
          <div className="court-form__field">
            <label className="form-label" htmlFor={`${uid}-lon`}>
              Долгота
            </label>
            <input id={`${uid}-lon`} type="text" inputMode="decimal" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
          </div>
        </div>

        <OptionGroup
          id={`${uid}-surface`}
          label="Покрытие"
          options={surfaceOptions(court.surface)}
          value={surface}
          onChange={setSurface}
        />

        <button
          type="button"
          role="switch"
          aria-checked={hasLighting}
          className="court-form__switch"
          onClick={() => setHasLighting((v) => !v)}
        >
          <span className="court-form__switch-text">Есть освещение</span>
          <span className="court-form__switch-track" aria-hidden="true">
            <span className="court-form__switch-thumb" />
          </span>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={covered}
          className="court-form__switch"
          onClick={() => setCovered((v) => !v)}
        >
          <span className="court-form__switch-text">Крытая площадка</span>
          <span className="court-form__switch-track" aria-hidden="true">
            <span className="court-form__switch-thumb" />
          </span>
        </button>

        <OptionGroup
          id={`${uid}-condition`}
          label="Состояние"
          options={CONDITION_OPTIONS}
          value={condition}
          onChange={setCondition}
        />

        <div className="court-form__field">
          <label className="form-label" htmlFor={`${uid}-address`}>
            Адрес
          </label>
          <input id={`${uid}-address`} type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="court-form__field">
          <label className="form-label" htmlFor={`${uid}-description`}>
            Описание
          </label>
          <textarea
            id={`${uid}-description`}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Нет описания"
          />
        </div>

        {actionError != null && (
          <p className="court-form__message" role="alert">
            {actionError}
          </p>
        )}

        <div className="court-form__actions">
          <button type="submit" className="btn btn-primary" disabled={saving || busy}>
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </form>

      <div className="admin-court__actions">
        <div className="court-form__field">
          <label className="form-label" htmlFor={`${uid}-reason`}>
            Причина действий (необязательно, попадает в журнал)
          </label>
          <input
            id={`${uid}-reason`}
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Например: реклама в описании"
          />
        </div>

        <div className="admin-court__action-buttons">
          {court.is_hidden ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => runAction(() => restoreAdminCourt(courtId, trimmedReason), 'Площадка восстановлена')}
            >
              Восстановить
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => runAction(() => hideAdminCourt(courtId, trimmedReason), 'Площадка скрыта')}
            >
              <EyeSlash size={18} aria-hidden="true" />
              Скрыть с карты
            </button>
          )}
          {court.description != null && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() =>
                runAction(() => unpublishAdminDescription(courtId, trimmedReason), 'Описание убрано')
              }
            >
              <TextAa size={18} aria-hidden="true" />
              Убрать описание
            </button>
          )}
          {court.photo_url != null && court.is_photo_published && (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => runAction(() => unpublishAdminPhoto(courtId, trimmedReason), 'Фото убрано')}
            >
              <Image size={18} aria-hidden="true" />
              Убрать фото
            </button>
          )}
        </div>
        {!court.is_photo_published && court.photo_url != null && (
          <p className="admin-court__note">Фото снято с публикации, файл закрыт по старой ссылке.</p>
        )}
      </div>

      <div className="admin-court__history">
        <button
          type="button"
          className="btn btn-ghost admin-court__history-toggle"
          onClick={() => setHistoryOpen((open) => !open)}
        >
          <ClockClockwise size={18} aria-hidden="true" />
          История действий
        </button>

        {historyOpen && (
          <ul className="admin-history">
            {history != null && history.length === 0 && <li className="admin-history__empty">Действий ещё не было.</li>}
            {history?.map((entry) => (
              <li key={entry.id} className="admin-history__item">
                <div className="admin-history__row">
                  <span className={`admin-history__result admin-history__result--${entry.result}`}>
                    {HISTORY_ACTION_LABELS[entry.action] ?? entry.action}
                  </span>
                  <span className="admin-history__time">
                    {entry.created_at != null ? dateFormatter.format(new Date(entry.created_at)) : ''}
                  </span>
                </div>
                <p className="admin-history__details">
                  Администратор: {entry.admin} · {entry.result === 'done' ? 'Выполнено' : 'Не применено'}
                </p>
                {entry.reason != null && <p className="admin-history__reason">Причина: {entry.reason}</p>}
                {entry.result === 'stale' && (
                  <p className="admin-history__reason admin-history__reason--warning">
                    Предложение устарело: значение изменилось с момента отправки, правка не применена.
                  </p>
                )}
                {entry.action === 'edit' && entry.details != null && (
                  <p className="admin-history__details">
                    {Object.keys((entry.details.after as Record<string, unknown>) ?? {}).map((field) => (
                      <span key={field}>
                        {PRIVATE_HISTORY_FIELDS[field] ? `${PRIVATE_HISTORY_FIELDS[field]} · ` : ''}
                        {formatHistoryValue(field, (entry.details?.before as Record<string, unknown>)?.[field])} →{' '}
                        {formatHistoryValue(field, (entry.details?.after as Record<string, unknown>)?.[field])}
                      </span>
                    ))}
                  </p>
                )}
                {entry.action === 'approve' && entry.details != null && entry.result === 'done' && (
                  <p className="admin-history__details">
                    {formatCourtValue(String(entry.details.field), entry.details.before)} →{' '}
                    {formatCourtValue(String(entry.details.field), entry.details.after)}
                  </p>
                )}
                {entry.report_id != null && (
                  <button
                    type="button"
                    className="btn btn-ghost admin-history__report"
                    onClick={() => onOpenReport(entry.report_id as number)}
                  >
                    Обращение #{entry.report_id}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default AdminCourtPage
