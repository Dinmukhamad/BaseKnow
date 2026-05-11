import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import api from '@/api/client'
import type { Role, User } from '@/types'

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
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <Users className="text-brand-600" size={22} />
        <h1 className="text-xl font-semibold text-surface-900">Пользователи</h1>
      </div>
      <form onSubmit={handleSubmit} className="mb-4 grid gap-3 rounded-lg border border-surface-200 bg-white p-4 md:grid-cols-5">
        <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" className="rounded-lg border border-surface-200 px-3 py-2 text-sm" required />
        <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="Логин" className="rounded-lg border border-surface-200 px-3 py-2 text-sm" required />
        <input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} placeholder="ФИО" className="rounded-lg border border-surface-200 px-3 py-2 text-sm" required />
        <input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Пароль" type="password" className="rounded-lg border border-surface-200 px-3 py-2 text-sm" required />
        <div className="flex gap-2">
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })} className="min-w-0 flex-1 rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm">
            <option value="operator">Operator</option>
            <option value="supervisor">Supervisor</option>
            <option value="admin">Admin</option>
          </select>
          <button className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600" disabled={createUser.isPending}>Создать</button>
        </div>
      </form>
      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white">
        <table className="w-full">
          <thead className="border-b border-surface-100 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">ФИО</th>
              <th className="px-4 py-3 font-medium">Логин</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Роль</th>
              <th className="px-4 py-3 font-medium">Статус</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.map((user) => (
              <tr key={user.id} className="border-b border-surface-100 last:border-0">
                <td className="px-4 py-3 text-sm font-medium">{user.full_name}</td>
                <td className="px-4 py-3 text-sm">{user.username}</td>
                <td className="px-4 py-3 text-sm">{user.email}</td>
                <td className="px-4 py-3 text-sm">{user.role}</td>
                <td className="px-4 py-3 text-sm">{user.is_active ? 'Активен' : 'Отключен'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
