// src/pages/LoginPage.tsx
import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, BookOpen } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'

const features = [
  { icon: '🔍', label: 'Быстрый поиск', desc: 'Ctrl+K по всей базе знаний' },
  { icon: '📋', label: 'Журнал аудита', desc: 'Все действия прозрачны' },
  { icon: '🔐', label: 'RBAC роли', desc: 'Гибкое управление доступом' },
]

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, isLoading } = useAuthStore()
  const { theme, toggle } = useThemeStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(username, password)
      navigate('/kb')
    } catch {
      setError('Неверный логин или пароль')
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      background: 'var(--color-bg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          radial-gradient(ellipse at 20% 20%, var(--brand-muted, rgba(29,104,240,0.06)) 0%, transparent 60%),
          radial-gradient(ellipse at 80% 80%, rgba(29,104,240,0.04) 0%, transparent 60%)
        `,
      }} />

      {/* Theme toggle */}
      <button
        onClick={toggle}
        aria-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
        style={{
          position: 'fixed', top: 20, right: 20,
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-full)',
          padding: '8px 12px',
          cursor: 'pointer',
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-secondary)',
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: 'var(--shadow-sm)',
          zIndex: 10,
        }}
      >
        {theme === 'dark' ? '☀️ Светлая' : '🌙 Тёмная'}
      </button>

      {/* Left panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'clamp(40px, 6vw, 80px)',
        maxWidth: 640,
      }} className="login-left-panel">
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48
        }}>
          <div style={{
            width: 44, height: 44, background: 'var(--color-brand)',
            borderRadius: 'var(--radius-xl)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-md)',
          }}>
            <BookOpen size={22} color="white" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: 'var(--text-lg)', letterSpacing: '-0.02em' }}>
              BaseKnow
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
              База знаний контакт-центра
            </div>
          </div>
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2rem, 4vw, 3rem)',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1.1,
          marginBottom: 20,
          color: 'var(--color-text-primary)',
        }}>
          Быстрый доступ<br />к знаниям
        </h1>

        <p style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)',
          lineHeight: 1.7, maxWidth: 440, marginBottom: 48 }}>
          Единое пространство для операторов, супервизоров и администраторов.
          Вся документация, процедуры и инструкции — под рукой.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {features.map(f => (
            <div key={f.label} style={{
              display: 'flex', alignItems: 'center', gap: 16,
              padding: '16px 20px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xs)',
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }} aria-hidden="true">{f.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{f.label}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: '100%',
        maxWidth: 440,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'clamp(32px, 5vw, 64px) clamp(24px, 4vw, 56px)',
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
      }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)',
          fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 8 }}>
          Вход в систему
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)',
          marginBottom: 32 }}>
          Используйте корпоративные учётные данные
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="field-group">
            <label className="field-label" htmlFor="login-username">Логин</label>
            <input
              id="login-username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="field"
              autoFocus
              required
              autoComplete="username"
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor="login-password">Пароль</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="field"
              required
              autoComplete="current-password"
              aria-describedby={error ? 'login-error' : undefined}
            />
          </div>

          {error && (
            <div
              id="login-error"
              className="alert alert-error"
              role="alert"
              aria-live="polite"
            >
              <AlertCircle size={15} aria-hidden="true" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{ width: '100%', height: 44, fontSize: 'var(--text-base)', marginTop: 4 }}
          >
            {isLoading ? (
              <span
                aria-label="Загрузка..."
                style={{
                  display: 'inline-block',
                  width: 18, height: 18,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }}
              />
            ) : (
              <>Войти <ArrowRight size={16} aria-hidden="true" /></>
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .login-left-panel { display: none; }
        }
      `}</style>
    </div>
  )
}
