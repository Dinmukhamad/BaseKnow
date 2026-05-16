import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Save, User } from 'lucide-react'
import api from '@/api/client'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/Toast'

export function ProfilePage() {
  const { user, fetchMe } = useAuthStore()
  const { success, error } = useToast()
  const [form, setForm] = useState({ full_name: user?.full_name || '', email: user?.email || '' })
  const [pwdForm, setPwdForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwdError, setPwdError] = useState('')

  const updateProfile = useMutation({
    mutationFn: () => api.patch('/profile', { full_name: form.full_name, email: form.email }),
    onSuccess: () => { success('Профиль обновлён'); fetchMe() },
    onError: (e: any) => error(e?.response?.data?.detail || 'Ошибка сохранения'),
  })

  const updatePassword = useMutation({
    mutationFn: () => api.patch('/profile', { current_password: pwdForm.current_password, new_password: pwdForm.new_password }),
    onSuccess: () => { success('Пароль изменён'); setPwdForm({ current_password: '', new_password: '', confirm: '' }); setPwdError('') },
    onError: (e: any) => setPwdError(e?.response?.data?.detail || 'Ошибка'),
  })

  const handlePassword = () => {
    if (pwdForm.new_password !== pwdForm.confirm) { setPwdError('Пароли не совпадают'); return }
    if (pwdForm.new_password.length < 8) { setPwdError('Минимум 8 символов'); return }
    setPwdError('')
    updatePassword.mutate()
  }

  const roleLabels: Record<string, string> = { operator: 'Оператор', supervisor: 'Супервизор', admin: 'Администратор' }

  return (
    <div className="page-shell max-w-2xl">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <div className="icon-tile"><User size={20} /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Мой профиль</h1>
            <p className="text-sm text-ink-500">Личные данные и настройки безопасности</p>
          </div>
        </div>
      </header>

      {/* Info card */}
      <div className="panel-pad mb-4 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
          {user?.full_name?.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div className="text-base font-semibold text-ink-900">{user?.full_name}</div>
          <div className="text-sm text-ink-500">{user?.email}</div>
          <span className="mt-1 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            {roleLabels[user?.role || ''] || user?.role}
          </span>
        </div>
      </div>

      {/* Edit profile */}
      <div className="panel-pad mb-4">
        <h2 className="mb-4 text-sm font-semibold text-ink-900">Основные данные</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-600">ФИО</label>
            <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="field w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-600">Email</label>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" className="field w-full" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending} className="btn-primary">
            <Save size={15} />
            Сохранить
          </button>
        </div>
      </div>

      {/* Change password */}
      <div className="panel-pad">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <KeyRound size={15} className="text-ink-400" />
          Изменить пароль
        </h2>
        {pwdError && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{pwdError}</div>}
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-600">Текущий пароль</label>
            <input value={pwdForm.current_password} onChange={e => setPwdForm({ ...pwdForm, current_password: e.target.value })} type="password" className="field w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-600">Новый пароль</label>
            <input value={pwdForm.new_password} onChange={e => setPwdForm({ ...pwdForm, new_password: e.target.value })} type="password" className="field w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-600">Повторите новый пароль</label>
            <input value={pwdForm.confirm} onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })} type="password" className="field w-full" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={handlePassword} disabled={updatePassword.isPending || !pwdForm.current_password || !pwdForm.new_password} className="btn-primary">
            Изменить пароль
          </button>
        </div>
      </div>
    </div>
  )
}
