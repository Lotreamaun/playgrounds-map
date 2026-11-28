import { useCallback, useEffect, useState } from 'react'
import { SignOut } from '@phosphor-icons/react'
import { fetchAdminSession, logoutAdmin } from '../../services/adminApi'
import type { AdminSession } from '../../types/admin'
import AdminLoginPage from './AdminLoginPage'
import AdminCourtsPage from './AdminCourtsPage'
import AdminCourtPage from './AdminCourtPage'
import AdminReportsPage from './AdminReportsPage'
import AdminReportPage from './AdminReportPage'

export type AdminPage =
  | { view: 'courts' }
  | { view: 'court'; courtId: number }
  | { view: 'reports' }
  | { view: 'report'; reportId: number }

function parsePage(): AdminPage {
  const params = new URLSearchParams(window.location.search)
  const court = params.get('court')
  if (court != null && court !== '' && Number.isInteger(Number(court))) {
    return { view: 'court', courtId: Number(court) }
  }
  const report = params.get('report')
  if (report != null && report !== '' && Number.isInteger(Number(report))) {
    return { view: 'report', reportId: Number(report) }
  }
  if (params.get('view') === 'reports') return { view: 'reports' }
  return { view: 'courts' }
}

function pageUrl(page: AdminPage): string {
  switch (page.view) {
    case 'court':
      return `/admin?court=${page.courtId}`
    case 'report':
      return `/admin?report=${page.reportId}`
    case 'reports':
      return '/admin?view=reports'
    default:
      return '/admin'
  }
}

/**
 * Закрытая админка. Открытие по ссылке «Управлять» без сессии показывает
 * вход, а после успешного входа открывает нужную запись (адрес возврата
 * остаётся локальным путём приложения).
 */
function AdminApp() {
  const [logoutError, setLogoutError] = useState(false)
  const [session, setSession] = useState<AdminSession | null | 'loading'>('loading')
  const [page, setPage] = useState<AdminPage>(() => parsePage())

  useEffect(() => {
    fetchAdminSession()
      .then((current) => setSession(current))
      .catch(() => setSession(null))
  }, [])

  // Кнопка «назад» возвращает к предыдущей записи админки.
  useEffect(() => {
    const onPopState = () => setPage(parsePage())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const go = useCallback((next: AdminPage, replace = false) => {
    const url = pageUrl(next)
    if (replace) window.history.replaceState(window.history.state, '', url)
    else window.history.pushState(window.history.state, '', url)
    setPage(next)
  }, [])

  const handleLogin = useCallback(
    (authorized: AdminSession) => {
      setSession(authorized)
      // Открываем запись, на которую указывала ссылка (court= / report=).
      const target = parsePage()
      setPage(target)
      window.history.replaceState(window.history.state, '', pageUrl(target))
    },
    [],
  )

  const handleLogout = useCallback(async () => {
    setLogoutError(false)
    try {
      await logoutAdmin()
      setSession(null)
    } catch {
      setLogoutError(true)
    }
  }, [])

  if (session === 'loading') {
    return <div className="admin admin--loading">Админка загружается…</div>
  }

  if (session == null) {
    return (
      <div className="admin">
        <AdminLoginPage
          returnTo={`${window.location.pathname}${window.location.search}`}
          onSuccess={handleLogin}
        />
      </div>
    )
  }

  const nav =
    page.view === 'court' || page.view === 'report' ? null : (
      <nav className="admin__nav">
        <button
          type="button"
          className={`btn btn-ghost${page.view === 'courts' ? ' admin__nav--active' : ''}`}
          onClick={() => go({ view: 'courts' })}
        >
          Площадки
        </button>
        <button
          type="button"
          className={`btn btn-ghost${page.view === 'reports' ? ' admin__nav--active' : ''}`}
          onClick={() => go({ view: 'reports' })}
        >
          Обращения
        </button>
      </nav>
    )

  return (
    <div className="admin">
      <header className="admin__header">
        <h1 className="admin__title">CourtMap — админка</h1>
        {nav}
        <button type="button" className="btn btn-ghost admin__logout" onClick={handleLogout}>
          <SignOut size={18} aria-hidden="true" />
          Выйти
        </button>
      </header>

      {logoutError && <p role="alert">Не удалось выйти. Попробуйте ещё раз.</p>}
      {page.view === 'courts' && <AdminCourtsPage onOpenCourt={(id) => go({ view: 'court', courtId: id })} />}
      {page.view === 'court' && (
        <AdminCourtPage
          key={page.courtId}
          courtId={page.courtId}
          onBack={() => go({ view: 'courts' })}
          onOpenReport={(id) => go({ view: 'report', reportId: id })}
        />
      )}
      {page.view === 'reports' && <AdminReportsPage onOpenReport={(id) => go({ view: 'report', reportId: id })} />}
      {page.view === 'report' && (
        <AdminReportPage
          key={page.reportId}
          reportId={page.reportId}
          onBack={() => go({ view: 'reports' })}
          onOpenCourt={(id) => go({ view: 'court', courtId: id })}
        />
      )}
    </div>
  )
}

export default AdminApp
