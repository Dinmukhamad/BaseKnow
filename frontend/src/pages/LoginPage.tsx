import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, Headphones, LockKeyhole, UserRound } from 'lucide-react'
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
    <div className="min-h-screen bg-surface-50 px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_420px]">
        <section className="hidden lg:block">
          <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-surface-200 bg-white px-4 py-2 text-sm text-ink-500 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-accent-green" />
            Внутренняя система контакт-центра
          </div>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-ink-900">
            Быстрый доступ к знаниям, ролям и журналу действий
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-ink-500">
            Светлый рабочий интерфейс для операторов, супервизоров и администраторов. Минимум шума, максимум полезной информации на экране.
          </p>
          <div className="mt-8 grid max-w-2xl grid-cols-3 gap-3">
            {['JWT авторизация', 'RBAC роли', 'База знаний'].map((item) => (
              <div key={item} className="rounded-lg border border-surface-200 bg-white p-4 text-sm font-medium text-ink-700 shadow-sm">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="icon-tile">
              <Headphones size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-ink-900">Вход в систему</h2>
              <p className="text-sm text-ink-500">Используйте рабочую учетную запись</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">Логин</span>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" size={16} />
                <input value={username} onChange={(event) => setUsername(event.target.value)} className="field w-full pl-9" autoFocus required />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink-700">Пароль</span>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" size={16} />
                <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field w-full pl-9" required />
              </div>
            </label>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <ArrowRight size={16} />}
              Войти
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}
