import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit2, Shield, Trash2, UserPlus, Users, X } from 'lucide-react'
import api from '@/api/client'
import { useAuthStore } from '@/store/auth'
import type { Role, User } from '@/types'

const roleLabels: Record<Role, string> = {
  operator: 'Оператор',
  supervisor: 'Супервизор',
  admin: 'Администратор',
}

const roleColors: Record<Role, string> = {
  operator: 'bg-surface-100 text-ink-600',
  supervisor: 'bg-blue-50 text-blue-700',
  admin: 'bg-brand-50 text-brand-700',
}

const emptyForm = { email: '', username: '', full_name: '', password: '', role: 'operator' as Role }

type EditForm = { email: string; full_name: string; role: Role; is_active: boolean; password: string }

export function UsersPage() {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const [createForm, setCreateForm] = useState(emptyForm)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ email: '', full_name: '', role: 'operator', is_active: true, password: '' })
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [createError, setCreateError] = useState('')
  const [editError, setEditError] = useState('')

  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users').then((r) => r.data),
  })

  const createUser = useMutation({
    mutationFn: () => api.post('/users', createForm),
    onSuccess: () => {
      setCreateForm(emptyForm)
      setCreateError('')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: any) => setCreateError(err?.response?.data?.detail || 'Ошибка создания'),
  })

  const updateUser = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        email: editForm.email,
        full_name: editForm.full_name,
        role: editForm.role,
        is_active: editForm.is_active,
      }
      if (editForm.password) payload.password = editForm.password
      return api.patch(`/users/${editingUser!.id}`, payload)
    },
    onSuccess: () => {
      setEditingUser(null)
      setEditError('')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (err: any) => setEditError(err?.response?.data?.detail || 'Ошибка сохранения'),
  })

  const deleteUser = useMutation({
    mutationFn: () => api.delete(`/users/${deletingUser!.id}`),
    onSuccess: () => {
      setDeletingUser(null)
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const openEdit = (user: User) => {
    setEditingUser(user)
    setEditForm({ email: user.email, full_name: user.full_name, role: user.role, is_active: user.is_active, password: '' })
    setEditError('')
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <div className="icon-tile"><Users size={20} /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Пользователи</h1>
            <p className="text-sm text-ink-500">Создание учётных записей и назначение ролей</p>
          </div>
        </div>
        {users.data && (
          <span className="rounded-full border border-surface-200 bg-white px-3 py-1.5 text-sm text-ink-500">
            {users.data.length} пользователей
          </span>
        )}
      </header>

      {/* Create form */}
      <div className="panel-pad mb-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <UserPlus size={16} className="text-brand-700" />
          Новый пользователь
        </div>
        {createError && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{createError}</div>}
        <div className="grid gap-3 lg:grid-cols-5">
          <input value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="Email" className="field" />
          <input value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} placeholder="Логин" className="field" />
          <input value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} placeholder="ФИО" className="field" />
          <input value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Пароль" type="password" className="field" />
          <div className="flex gap-2">
            <select value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as Role })} className="field min-w-0 flex-1">
              <option value="operator">Оператор</option>
              <option value="supervisor">Супервизор</option>
              <option value="admin">Администратор</option>
            </select>
            <button
              onClick={() => createUser.mutate()}
              disabled={createUser.isPending || !createForm.email || !createForm.username || !createForm.password}
              className="btn-primary"
            >
              Создать
            </button>
          </div>
        </div>
      </div>

      {/* Users table */}
      <section className="panel overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-50 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Пользователь</th>
              <th className="px-5 py-3 font-semibold">Логин</th>
              <th className="px-5 py-3 font-semibold">Роль</th>
              <th className="px-5 py-3 font-semibold">Статус</th>
              <th className="px-5 py-3 font-semibold">Последний вход</th>
              <th className="px-5 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {users.data?.map((user) => (
              <tr key={user.id} className="hover:bg-surface-50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                      {user.full_name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-ink-900">{user.full_name}</div>
                      <div className="text-xs text-ink-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-sm text-ink-500">{user.username}</td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${roleColors[user.role]}`}>
                    <Shield size={10} />
                    {roleLabels[user.role]}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.is_active ? 'bg-green-50 text-green-700' : 'bg-surface-100 text-ink-500'}`}>
                    {user.is_active ? 'Активен' : 'Отключён'}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-ink-500">
                  {user.last_login_at ? new Date(user.last_login_at).toLocaleString('ru') : '—'}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(user)} className="rounded p-1.5 text-ink-400 hover:bg-surface-100 hover:text-ink-700" title="Редактировать">
                      <Edit2 size={15} />
                    </button>
                    {user.id !== currentUser?.id && (
                      <button onClick={() => setDeletingUser(user)} className="rounded p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600" title="Удалить">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.isLoading && !users.data?.length && (
          <div className="py-20 text-center text-sm text-ink-500">Пользователи не найдены</div>
        )}
      </section>

      {/* Edit modal */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="panel-pad w-full max-w-md rounded-xl bg-white">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-900">Редактировать пользователя</h2>
              <button onClick={() => setEditingUser(null)} className="rounded p-1 text-ink-400 hover:text-ink-700"><X size={18} /></button>
            </div>
            {editError && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{editError}</div>}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-600">Email</label>
                <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="field w-full" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-600">ФИО</label>
                <input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="field w-full" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-600">Роль</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })} className="field w-full">
                  <option value="operator">Оператор</option>
                  <option value="supervisor">Супервизор</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-600">Новый пароль (оставьте пустым чтобы не менять)</label>
                <input value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} type="password" placeholder="••••••••" className="field w-full" />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-700">
                <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} className="h-4 w-4" />
                Активный аккаунт
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setEditingUser(null)} className="btn-secondary">Отмена</button>
              <button onClick={() => updateUser.mutate()} disabled={updateUser.isPending} className="btn-primary">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deletingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="panel-pad w-full max-w-sm rounded-xl bg-white">
            <h2 className="mb-2 text-base font-semibold text-ink-900">Удалить пользователя?</h2>
            <p className="mb-5 text-sm text-ink-500">
              <span className="font-medium text-ink-700">{deletingUser.full_name}</span> ({deletingUser.username}) будет удалён безвозвратно.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingUser(null)} className="btn-secondary">Отмена</button>
              <button onClick={() => deleteUser.mutate()} disabled={deleteUser.isPending} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
