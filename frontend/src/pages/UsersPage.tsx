import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit2, Search, Shield, Trash2, UserMinus, UserPlus, Users, X } from 'lucide-react'
import api from '@/api/client'
import { useAuthStore } from '@/store/auth'
import { useDebounce } from '@/lib/useDebounce'
import { useToast } from '@/components/Toast'
import type { PaginatedResponse, Role, User } from '@/types'

const roleLabels: Record<Role, string> = { operator: 'Оператор', supervisor: 'Супервизор', admin: 'Администратор' }
const roleColors: Record<Role, string> = { operator: 'bg-surface-100 text-ink-600', supervisor: 'bg-blue-50 text-blue-700', admin: 'bg-brand-50 text-brand-700' }
const emptyCreate = { email: '', username: '', full_name: '', password: '', role: 'operator' as Role }
type EditForm = { email: string; full_name: string; role: Role; is_active: boolean; password: string }

export function UsersPage() {
  const queryClient = useQueryClient()
  const { user: me } = useAuthStore()
  const { success, error } = useToast()
  const [searchInput, setSearchInput] = useState('')
  const search = useDebounce(searchInput, 400)
  const [page, setPage] = useState(1)
  const [createForm, setCreateForm] = useState(emptyCreate)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ email: '', full_name: '', role: 'operator', is_active: true, password: '' })
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [deleteMode, setDeleteMode] = useState<'deactivate' | 'delete'>('deactivate')

  const users = useQuery({
    queryKey: ['users', search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: '20' })
      if (search) params.set('query', search)
      return api.get<PaginatedResponse<User>>(`/users?${params}`).then(r => r.data)
    },
    placeholderData: prev => prev,
  })

  const createUser = useMutation({
    mutationFn: () => api.post('/users', createForm),
    onSuccess: () => { setCreateForm(emptyCreate); success('Пользователь создан'); queryClient.invalidateQueries({ queryKey: ['users'] }) },
    onError: (e: any) => error(e?.response?.data?.detail || 'Ошибка создания'),
  })

  const updateUser = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = { email: editForm.email, full_name: editForm.full_name, role: editForm.role, is_active: editForm.is_active }
      if (editForm.password) payload.password = editForm.password
      return api.patch(`/users/${editingUser!.id}`, payload)
    },
    onSuccess: () => { setEditingUser(null); success('Изменения сохранены'); queryClient.invalidateQueries({ queryKey: ['users'] }) },
    onError: (e: any) => error(e?.response?.data?.detail || 'Ошибка'),
  })

  const handleDelete = useMutation({
    mutationFn: () => deleteMode === 'deactivate'
      ? api.patch(`/users/${deletingUser!.id}`, { is_active: false })
      : api.delete(`/users/${deletingUser!.id}`),
    onSuccess: () => {
      setDeletingUser(null)
      success(deleteMode === 'deactivate' ? 'Пользователь деактивирован' : 'Пользователь удалён')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (e: any) => error(e?.response?.data?.detail || 'Ошибка'),
  })

  const openEdit = (u: User) => { setEditingUser(u); setEditForm({ email: u.email, full_name: u.full_name, role: u.role, is_active: u.is_active, password: '' }) }

  const items = users.data?.items ?? []

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <div className="icon-tile"><Users size={20} /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Пользователи</h1>
            <p className="text-sm text-ink-500">Управление учётными записями и ролями</p>
          </div>
        </div>
        {users.data && <span className="rounded-full border border-surface-200 bg-white px-3 py-1.5 text-sm text-ink-500">{users.data.total} пользователей</span>}
      </header>

      {/* Create form */}
      <div className="panel-pad mb-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900"><UserPlus size={16} className="text-brand-700" />Новый пользователь</div>
        <div className="grid gap-3 lg:grid-cols-5">
          <input value={createForm.email} onChange={e => setCreateForm({ ...createForm, email: e.target.value })} placeholder="Email" className="field" />
          <input value={createForm.username} onChange={e => setCreateForm({ ...createForm, username: e.target.value })} placeholder="Логин" className="field" />
          <input value={createForm.full_name} onChange={e => setCreateForm({ ...createForm, full_name: e.target.value })} placeholder="ФИО" className="field" />
          <input value={createForm.password} onChange={e => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Пароль" type="password" className="field" />
          <div className="flex gap-2">
            <select value={createForm.role} onChange={e => setCreateForm({ ...createForm, role: e.target.value as Role })} className="field min-w-0 flex-1">
              <option value="operator">Оператор</option>
              <option value="supervisor">Супервизор</option>
              <option value="admin">Администратор</option>
            </select>
            <button onClick={() => createUser.mutate()} disabled={createUser.isPending || !createForm.email || !createForm.username || !createForm.password} className="btn-primary">Создать</button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="panel-pad mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={searchInput} onChange={e => { setSearchInput(e.target.value); setPage(1) }} placeholder="Поиск по имени, email или логину" className="field w-full pl-9" />
        </div>
      </div>

      {/* Table */}
      <section className={`panel overflow-hidden transition-opacity ${users.isFetching ? 'opacity-70' : ''}`}>
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
            {items.map(u => (
              <tr key={u.id} className={`hover:bg-surface-50 ${!u.is_active ? 'opacity-50' : ''}`}>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">{u.full_name.slice(0, 1).toUpperCase()}</div>
                    <div><div className="text-sm font-medium text-ink-900">{u.full_name}</div><div className="text-xs text-ink-500">{u.email}</div></div>
                  </div>
                </td>
                <td className="px-5 py-4 font-mono text-sm text-ink-500">{u.username}</td>
                <td className="px-5 py-4"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${roleColors[u.role]}`}><Shield size={10} />{roleLabels[u.role]}</span></td>
                <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${u.is_active ? 'bg-green-50 text-green-700' : 'bg-surface-100 text-ink-500'}`}>{u.is_active ? 'Активен' : 'Отключён'}</span></td>
                <td className="px-5 py-4 text-xs text-ink-500">{u.last_login_at ? new Date(u.last_login_at).toLocaleString('ru') : '—'}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(u)} className="rounded p-1.5 text-ink-400 hover:bg-surface-100 hover:text-ink-700" title="Редактировать"><Edit2 size={15} /></button>
                    {u.id !== me?.id && (
                      <button onClick={() => { setDeletingUser(u); setDeleteMode('deactivate') }} className="rounded p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600" title="Удалить/деактивировать"><Trash2 size={15} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.isLoading && !items.length && <div className="py-20 text-center text-sm text-ink-500">Пользователи не найдены</div>}
      </section>

      {/* Pagination */}
      {users.data && users.data.pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: users.data.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium ${p === page ? 'bg-brand-600 text-white' : 'border border-surface-200 bg-white text-ink-500'}`}>{p}</button>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="panel-pad w-full max-w-md rounded-xl bg-white">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink-900">Редактировать пользователя</h2>
              <button onClick={() => setEditingUser(null)} className="rounded p-1 text-ink-400 hover:text-ink-700"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div><label className="mb-1 block text-xs font-medium text-ink-600">Email</label><input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className="field w-full" /></div>
              <div><label className="mb-1 block text-xs font-medium text-ink-600">ФИО</label><input value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} className="field w-full" /></div>
              <div><label className="mb-1 block text-xs font-medium text-ink-600">Роль</label>
                <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value as Role })} className="field w-full">
                  <option value="operator">Оператор</option>
                  <option value="supervisor">Супервизор</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              <div><label className="mb-1 block text-xs font-medium text-ink-600">Новый пароль (оставьте пустым)</label><input value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} type="password" placeholder="••••••••" className="field w-full" /></div>
              <label className="flex items-center gap-2 text-sm text-ink-700"><input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm({ ...editForm, is_active: e.target.checked })} className="h-4 w-4" />Активный аккаунт</label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setEditingUser(null)} className="btn-secondary">Отмена</button>
              <button onClick={() => updateUser.mutate()} disabled={updateUser.isPending} className="btn-primary">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete/deactivate modal */}
      {deletingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="panel-pad w-full max-w-sm rounded-xl bg-white">
            <h2 className="mb-2 text-base font-semibold text-ink-900">Что сделать с пользователем?</h2>
            <p className="mb-4 text-sm text-ink-500"><span className="font-medium text-ink-700">{deletingUser.full_name}</span></p>
            <div className="mb-5 space-y-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-surface-200 p-3 hover:bg-surface-50">
                <input type="radio" name="mode" checked={deleteMode === 'deactivate'} onChange={() => setDeleteMode('deactivate')} className="mt-0.5" />
                <div><div className="flex items-center gap-1.5 text-sm font-medium text-ink-900"><UserMinus size={14} />Деактивировать</div><div className="text-xs text-ink-500">Пользователь не сможет войти, данные сохранятся</div></div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-red-100 p-3 hover:bg-red-50">
                <input type="radio" name="mode" checked={deleteMode === 'delete'} onChange={() => setDeleteMode('delete')} className="mt-0.5" />
                <div><div className="flex items-center gap-1.5 text-sm font-medium text-red-700"><Trash2 size={14} />Удалить полностью</div><div className="text-xs text-ink-500">Необратимое удаление аккаунта</div></div>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingUser(null)} className="btn-secondary">Отмена</button>
              <button onClick={() => handleDelete.mutate()} disabled={handleDelete.isPending}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${deleteMode === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}>
                {deleteMode === 'deactivate' ? 'Деактивировать' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
