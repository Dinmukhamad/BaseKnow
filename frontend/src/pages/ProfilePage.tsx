import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
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

  const roleLabels: Record<string, string> = {
    operator: 'Оператор',
    supervisor: 'Супервизор',
    admin: 'Администратор',
  }

  const updateProfile = useMutation({
    mutationFn: () => api.patch('/profile', { full_name: form.full_name, email: form.email }),
    onSuccess: () => { success('Профиль обновлён'); fetchMe() },
    onError: (e: any) => error(e?.response?.data?.detail || 'Ошибка сохранения'),
  })

  const updatePassword = useMutation({
    mutationFn: () =>
      api.patch('/profile', {
        current_password: pwdForm.current_password,
        new_password: pwdForm.new_password,
      }),
    onSuccess: () => {
      success('Пароль изменён')
      setPwdForm({ current_password: '', new_password: '', confirm: '' })
      setPwdError('')
    },
    onError: (e: any) => setPwdError(e?.response?.data?.detail || 'Ошибка'),
  })

  const handlePassword = () => {
    if (pwdForm.new_password !== pwdForm.confirm) { setPwdError('Пароли не совпадают'); return }
    if (pwdForm.new_password.length < 8) { setPwdError('Минимум 8 символов'); return }
    setPwdError('')
    updatePassword.mutate()
  }

  return (
    <div className="page-container" style={{ maxWidth: 680 }}>
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="icon-tile"><User size={20} /></div>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)',
              fontWeight: 800, letterSpacing: '-0.03em',
            }}>
              Мой профиль
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Личные данные и настройки безопасности
            </p>
          </div>
        </div>
      </header>

      {/* User info card */}
      <div className="card card-pad" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <div style={{
          width: 56, height: 56, flexShrink: 0, borderRadius: '50%',
          background: 'var(--color-brand-muted)', color: 'var(--color-brand-text)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800,
        }}>
          {user?.full_name?.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            {user?.full_name}
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            {user?.email}
          </div>
          <span className="pill pill-brand" style={{ marginTop: 'var(--space-2)', display: 'inline-flex' }}>
            {roleLabels[user?.role || ''] || user?.role}
          </span>
        </div>
      </div>

      {/* Edit profile */}
      <div className="card card-pad" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="section-label">Основные данные</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <label className="field-label" htmlFor="profile-fullname">ФИО</label>
            <input
              id="profile-fullname"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="field"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              type="email"
              className="field"
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
          <button
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
            className="btn btn-primary"
          >
            <Save size={15} />
            Сохранить
          </button>
        </div>
      </div>

      {/* Change password */}
      <div className="card card-pad">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          <KeyRound size={15} color="var(--color-text-tertiary)" />
          <div className="section-label" style={{ margin: 0 }}>Изменить пароль</div>
        </div>

        {pwdError && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--space-3)' }}>
            {pwdError}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div>
            <label className="field-label" htmlFor="pwd-current">Текущий пароль</label>
            <input
              id="pwd-current"
              value={pwdForm.current_password}
              onChange={(e) => setPwdForm({ ...pwdForm, current_password: e.target.value })}
              type="password"
              className="field"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="pwd-new">Новый пароль</label>
            <input
              id="pwd-new"
              value={pwdForm.new_password}
              onChange={(e) => setPwdForm({ ...pwdForm, new_password: e.target.value })}
              type="password"
              className="field"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="pwd-confirm">Повторите новый пароль</label>
            <input
              id="pwd-confirm"
              value={pwdForm.confirm}
              onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
              type="password"
              className="field"
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
          <button
            onClick={handlePassword}
            disabled={updatePassword.isPending || !pwdForm.current_password || !pwdForm.new_password}
            className="btn btn-primary"
          >
            Изменить пароль
          </button>
        </div>
      </div>
    </div>
  )
}
