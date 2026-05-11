import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, LogIn, Phone } from 'lucide-react'
import { useAuthStore } from '@/store/auth'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await login(username, password)
      navigate('/kb')
    } catch {
      setError('Неверный логин или пароль')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-sm">
            <Phone size={26} />
          </div>
          <h1 className="text-2xl font-semibold text-surface-900">Contact Center</h1>
          <p className="mt-1 text-sm text-slate-500">Внутренняя система</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-lg border border-surface-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-medium text-surface-900">Вход</h2>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Логин</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-surface-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
              required
            />
          </label>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-surface-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </label>
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
          >
            {isLoading ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <LogIn size={16} />}
            Войти
          </button>
        </form>
      </div>
    </div>
  )
}
