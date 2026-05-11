import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Users } from 'lucide-react'
import api from '@/api/client'
import type { Role, User } from '@/types'

const roleLabels: Record<Role, string> = {
  operator: 'Оператор',
  supervisor: 'Супервизор',
  admin: 'Администратор',
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ email: '', username: '', full_name: '', password: '', role: 'operator' as Role })

  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users').then((response) => response.data),
  })

  const createUser = useMutation({
    mutationFn: () => api.post('/users', form),
    onSuccess: () => {
      setForm({ email: '', username: '', full_name: '', password: '', role: 'operator' })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    createUser.mutate()
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <div className="icon-tile">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Пользователи</h1>
            <p className="text-sm text-ink-500">Создание учетных записей и назначение ролей</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="panel-pad mb-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
          <UserPlus size={16} className="text-brand-700" />
          Новый пользователь
        </div>
        <div className="grid gap-3 lg:grid-cols-5">
          <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" className="field" required />
          <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="Логин" className="field" required />
          <input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} placeholder="ФИО" className="field" required />
          <input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Пароль" type="password" className="field" required />
          <div className="flex gap-2">
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })} className="field min-w-0 flex-1">
              <option value="operator">Оператор</option>
              <option value="supervisor">Супервизор</option>
              <option value="admin">Администратор</option>
            </select>
            <button className="btn-primary" disabled={createUser.isPending}>Создать</button>
          </div>
        </div>
      </form>

      <section className="panel overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-50 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-5 py-3 font-semibold">ФИО</th>
              <th className="px-5 py-3 font-semibold">Логин</th>
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold">Роль</th>
              <th className="px-5 py-3 font-semibold">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {users.data?.map((user) => (
              <tr key={user.id} className="hover:bg-surface-50">
                <td className="px-5 py-4 text-sm font-medium text-ink-900">{user.full_name}</td>
                <td className="px-5 py-4 text-sm text-ink-500">{user.username}</td>
                <td className="px-5 py-4 text-sm text-ink-500">{user.email}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">{roleLabels[user.role]}</span>
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${user.is_active ? 'bg-green-50 text-green-700' : 'bg-surface-100 text-ink-500'}`}>
                    {user.is_active ? 'Активен' : 'Отключен'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
