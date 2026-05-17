import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit2, Search, Shield, Trash2, UserMinus, UserPlus, Users, X } from 'lucide-react'
import api from '@/api/client'
import { useAuthStore } from '@/store/auth'
import { useDebounce } from '@/lib/useDebounce'
import { useToast } from '@/components/Toast'
import { Pagination } from '@/components/Pagination'
import type { PaginatedResponse, Role, User } from '@/types'

const roleLabels: Record<Role, string> = {
  operator: 'Оператор',
  supervisor: 'Супервизор',
  admin: 'Администратор',
}

const rolePillClass: Record<Role, string> = {
  operator: 'pill pill-neutral',
  supervisor: 'pill pill-info',
  admin: 'pill pill-brand',
}

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
  const [editForm, setEditForm] = useState<EditForm>({
    email: '', full_name: '', role: 'operator', is_active: true, password: '',
  })
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [deleteMode, setDeleteMode] = useState<'deactivate' | 'delete'>('deactivate')

  const users = useQuery({
    queryKey: ['users', search, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: '20' })
      if (search) params.set('query', search)
      return api.get<PaginatedResponse<User>>(`/users?${params}`).then((r) => r.data)
    },
    placeholderData: (prev) => prev,
  })

  const createUser = useMutation({
    mutationFn: () => api.post('/users', createForm),
    onSuccess: () => {
      setCreateForm(emptyCreate)
      success('Пользователь создан')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (e: any) => error(e?.response?.data?.detail || 'Ошибка создания'),
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
      success('Изменения сохранены')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (e: any) => error(e?.response?.data?.detail || 'Ошибка'),
  })

  const handleDelete = useMutation({
    mutationFn: () =>
      deleteMode === 'deactivate'
        ? api.patch(`/users/${deletingUser!.id}`, { is_active: false })
        : api.delete(`/users/${deletingUser!.id}`),
    onSuccess: () => {
      setDeletingUser(null)
      success(deleteMode === 'deactivate' ? 'Пользователь деактивирован' : 'Пользователь удалён')
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
    onError: (e: any) => error(e?.response?.data?.detail || 'Ошибка'),
  })

  const openEdit = (u: User) => {
    setEditingUser(u)
    setEditForm({ email: u.email, full_name: u.full_name, role: u.role, is_active: u.is_active, password: '' })
  }

  const items = users.data?.items ?? []

  return (
    <div className="page-container">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="icon-tile"><Users size={20} /></div>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)',
              fontWeight: 800, letterSpacing: '-0.03em',
            }}>
              Пользователи
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Управление учётными записями и ролями
            </p>
          </div>
        </div>
        {users.data && (
          <span className="pill pill-neutral">{users.data.total} пользователей</span>
        )}
      </header>

      {/* Create form */}
      <div className="card card-pad" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}>
          <UserPlus size={16} color="var(--color-brand-text)" />
          Новый пользователь
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 'var(--space-3)' }}>
          <input
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            placeholder="Email"
            className="field"
          />
          <input
            value={createForm.username}
            onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
            placeholder="Логин"
            className="field"
          />
          <input
            value={createForm.full_name}
            onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
            placeholder="ФИО"
            className="field"
          />
          <input
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            placeholder="Пароль"
            type="password"
            className="field"
          />
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as Role })}
              className="field"
              style={{ flex: 1, minWidth: 0 }}
            >
              <option value="operator">Оператор</option>
              <option value="supervisor">Супервизор</option>
              <option value="admin">Администратор</option>
            </select>
            <button
              onClick={() => createUser.mutate()}
              disabled={
                createUser.isPending || !createForm.email || !createForm.username || !createForm.password
              }
              className="btn btn-primary"
            >
              Создать
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="card card-pad" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="field-group" style={{ flexDirection: 'row' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <span className="field-icon-slot left" aria-hidden="true">
              <Search size={15} />
            </span>
            <input
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); setPage(1) }}
              placeholder="Поиск по имени, email или логину"
              className="field field-icon-left"
              style={{ width: '100%' }}
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(''); setPage(1) }}
                aria-label="Очистить поиск"
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-tertiary)', display: 'flex',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className="card"
        style={{ overflow: 'hidden', opacity: users.isFetching ? 0.7 : 1, transition: 'opacity var(--duration-normal)' }}
      >
        <table className="data-table" role="table" aria-label="Список пользователей">
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Логин</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Последний вход</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                      width: 32, height: 32, flexShrink: 0, borderRadius: '50%',
                      background: 'var(--color-brand-muted)', color: 'var(--color-brand-text)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', fontWeight: 700,
                    }}>
                      {u.full_name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {u.full_name}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        {u.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                  {u.username}
                </td>
                <td>
                  <span className={rolePillClass[u.role]}>
                    <Shield size={10} aria-hidden="true" />
                    {roleLabels[u.role]}
                  </span>
                </td>
                <td>
                  <span className={u.is_active ? 'pill pill-success' : 'pill pill-neutral'}>
                    {u.is_active ? 'Активен' : 'Отключён'}
                  </span>
                </td>
                <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                  {u.last_login_at ? new Date(u.last_login_at).toLocaleString('ru') : '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-1)' }}>
                    <button
                      onClick={() => openEdit(u)}
                      className="btn btn-ghost btn-icon"
                      title="Редактировать"
                    >
                      <Edit2 size={15} />
                    </button>
                    {u.id !== me?.id && (
                      <button
                        onClick={() => { setDeletingUser(u); setDeleteMode('deactivate') }}
                        className="btn btn-ghost btn-icon"
                        title="Деактивировать / удалить"
                        style={{ color: 'var(--color-error-text)' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.isLoading && !items.length && (
          <div className="empty-state">
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Пользователи не найдены</div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {users.data && (
        <Pagination
          page={page}
          pages={users.data.pages}
          total={users.data.total}
          onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        />
      )}

      {/* Edit modal */}
      {editingUser && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <div className="modal-header">
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>
                Редактировать: {editingUser.full_name}
              </h2>
              <button onClick={() => setEditingUser(null)} className="btn btn-ghost btn-icon">
                <X size={16} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <label className="field-label" htmlFor="edit-fullname">ФИО</label>
                <input
                  id="edit-fullname"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="field"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="edit-email">Email</label>
                <input
                  id="edit-email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  type="email"
                  className="field"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="edit-role">Роль</label>
                <select
                  id="edit-role"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                  className="field"
                >
                  <option value="operator">Оператор</option>
                  <option value="supervisor">Супервизор</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)', cursor: 'pointer',
              }}>
                <span>Активен</span>
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-brand)' }}
                />
              </label>
              <div>
                <label className="field-label" htmlFor="edit-password">Новый пароль (необязательно)</label>
                <input
                  id="edit-password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  type="password"
                  className="field"
                  placeholder="Оставьте пустым, чтобы не менять"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setEditingUser(null)} className="btn btn-secondary">
                Отмена
              </button>
              <button
                onClick={() => updateUser.mutate()}
                disabled={updateUser.isPending}
                className="btn btn-primary"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete/deactivate modal */}
      {deletingUser && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <div className="modal-header">
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>
                Действие с пользователем
              </h2>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                {deletingUser.full_name} · {deletingUser.email}
              </p>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-3)', background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--text-sm)',
              }}>
                <input
                  type="radio"
                  name="deleteMode"
                  value="deactivate"
                  checked={deleteMode === 'deactivate'}
                  onChange={() => setDeleteMode('deactivate')}
                  style={{ accentColor: 'var(--color-brand)' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Деактивировать</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Пользователь не сможет войти, данные сохранятся</div>
                </div>
              </label>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-3)', background: 'var(--color-error-bg)',
                border: '1px solid var(--color-error-border)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: 'var(--text-sm)',
              }}>
                <input
                  type="radio"
                  name="deleteMode"
                  value="delete"
                  checked={deleteMode === 'delete'}
                  onChange={() => setDeleteMode('delete')}
                  style={{ accentColor: 'var(--color-error-icon)' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-error-text)' }}>Удалить навсегда</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error-text)', opacity: 0.8 }}>Данные будут удалены безвозвратно</div>
                </div>
              </label>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeletingUser(null)} className="btn btn-secondary">
                Отмена
              </button>
              <button
                onClick={() => handleDelete.mutate()}
                disabled={handleDelete.isPending}
                className={deleteMode === 'delete' ? 'btn btn-danger' : 'btn btn-secondary'}
              >
                {deleteMode === 'deactivate' ? <UserMinus size={15} /> : <Trash2 size={15} />}
                {deleteMode === 'deactivate' ? 'Деактивировать' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
