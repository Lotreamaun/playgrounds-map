import { useEffect, useRef, useState } from 'react'
import { Eye, EyeSlash, House, Image } from '@phosphor-icons/react'
import type { AdminCourt } from '../../types/admin'
import { fetchAdminCourts } from '../../services/adminApi'
import { translateCondition, translateSurface } from '../../utils/labels'

interface AdminCourtsPageProps {
  onOpenCourt: (id: number) => void
}

/** Закрытый список площадок: опубликованные и скрытые, поиск по названию/адресу. */
function AdminCourtsPage({ onOpenCourt }: AdminCourtsPageProps) {
  const [query, setQuery] = useState('')
  // Результат привязан к запросу: пока ответ не пришёл — показываем загрузку.
  const [result, setResult] = useState<{ query: string; courts: AdminCourt[]; error: boolean } | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const requestId = ++requestIdRef.current
    const timer = window.setTimeout(() => {
      fetchAdminCourts(query)
        .then((items) => {
          if (requestId !== requestIdRef.current) return
          setResult({ query, courts: items, error: false })
        })
        .catch((err) => {
          console.error('Failed to fetch admin courts:', err)
          if (requestId !== requestIdRef.current) return
          setResult({ query, courts: [], error: true })
        })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [query])

  const loading = result == null || result.query !== query
  const failed = result?.query === query && result.error

  return (
    <section className="admin-page">
      <input
        type="search"
        className="admin-search"
        placeholder="Поиск по названию, адресу или описанию"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Поиск площадок"
      />

      {loading && <p className="admin-page__state">Загружаем площадки…</p>}
      {failed && <p className="admin-page__state admin-page__state--error">Не удалось загрузить площадки.</p>}

      {result?.query === query && !result.error && (
        <ul className="admin-list">
          {result.courts.length === 0 && (
            <li className="admin-list__empty">Ничего не найдено. Попробуйте изменить запрос.</li>
          )}
          {result.courts.map((court) => (
            <li key={court.id}>
              <button type="button" className="admin-list__row" onClick={() => onOpenCourt(court.id as number)}>
                <span className="admin-list__row-main">
                  <span className="admin-list__row-title">
                    {court.name ?? `Площадка #${court.id}`}
                    {court.is_hidden && <span className="admin-chip admin-chip--muted">Скрыта</span>}
                  </span>
                  <span className="admin-list__row-sub">
                    #{court.id}
                    {court.address != null && court.address !== '' ? ` · ${court.address}` : ''}
                  </span>
                  <span className="admin-list__row-meta">
                    {translateSurface(court.surface)} · {translateCondition(court.condition)}
                  </span>
                </span>
                <span className="admin-list__row-icons">
                  {court.is_covered === true && <House size={16} aria-label="Крытая" />}
                  {court.photo_url != null && (
                    <span className="admin-list__row-icon">
                      <Image size={16} aria-label="Фото" />
                      {!court.is_photo_published && <EyeSlash size={12} aria-label="Фото снято с публикации" />}
                    </span>
                  )}
                  {court.is_hidden ? <EyeSlash size={16} aria-label="Скрыта" /> : <Eye size={16} aria-label="Опубликовано" />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default AdminCourtsPage
