import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { loginAdmin } from '../../services/adminApi'
import type { AdminSession } from '../../types/admin'

interface AdminLoginPageProps {
  /** Локальный адрес возврата: страница админки, с которой пришли по ссылке. */
  returnTo: string
  onSuccess: (session: AdminSession) => void
}

/** Вход администратора: сервер проверяет пароль, ссылки полномочий не несут. */
function AdminLoginPage({ returnTo, onSuccess }: AdminLoginPageProps) {
  const uid = useId()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage(null)
    setSubmitting(true)
    try {
      const session = await loginAdmin(username.trim(), password, returnTo)
      onSuccess(session)
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 429) {
        setMessage('Слишком много попыток входа. Подождите немного и попробуйте снова.')
      } else if (status === 401) {
        setMessage('Неверное имя пользователя или пароль.')
      } else {
        setMessage(err instanceof Error ? err.message : 'Не удалось войти. Попробуйте ещё раз.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-login">
      <form className="admin-login__card" onSubmit={handleSubmit}>
        <h1 className="admin-login__title">CourtMap — админка</h1>
        <p className="admin-login__hint">Вход для администратора площадок</p>

        <div className="court-form__field">
          <label className="form-label" htmlFor={`${uid}-username`}>
            Имя пользователя
          </label>
          <input
            id={`${uid}-username`}
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="court-form__field">
          <label className="form-label" htmlFor={`${uid}-password`}>
            Пароль
          </label>
          <input
            id={`${uid}-password`}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {message != null && (
          <p className="court-form__message" role="alert">
            {message}
          </p>
        )}

        <button type="submit" className="btn btn-primary admin-login__submit" disabled={submitting}>
          {submitting ? 'Вход…' : 'Войти'}
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}

export default AdminLoginPage
