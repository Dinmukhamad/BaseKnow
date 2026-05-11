import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ClipboardList, Search } from 'lucide-react'
import api from '@/api/client'
import type { AuditLog, PaginatedResponse } from '@/types'

export function AuditPage() {
  const [query, setQuery] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const logs = useQuery({
    queryKey: ['audit-logs', query, action, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: '20' })
      if (query) params.set('query', query)
      if (action) params.set('action', action)
      return api.get<PaginatedResponse<AuditLog>>(`/audit/logs?${params}`).then((response) => response.data)
    },
  })

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <ClipboardList className="text-brand-600" size={22} />
        <h1 className="text-xl font-semibold text-surface-900">Журнал аудита</h1>
      </div>
      <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-surface-200 bg-white p-4">
        <div className="relative min-w-72 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Поиск по описанию или entity id"
            className="w-full rounded-lg border border-surface-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select value={action} onChange={(event) => setAction(event.target.value)} className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm">
          <option value="">Все действия</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="kb_article_open">KB open</option>
        </select>
      </div>
      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white">
        <table className="w-full">
          <thead className="border-b border-surface-100 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Дата</th>
              <th className="px-4 py-3 font-medium">Действие</th>
              <th className="px-4 py-3 font-medium">Сущность</th>
              <th className="px-4 py-3 font-medium">Пользователь</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Изменения</th>
            </tr>
          </thead>
          <tbody>
            {logs.data?.items.map((log) => (
              <tr key={log.id} className="border-b border-surface-100 last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{format(new Date(log.created_at), 'dd.MM.yyyy HH:mm')}</td>
                <td className="px-4 py-3 text-sm">{log.action}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{log.entity_type || '-'} {log.entity_id ? `/${log.entity_id.slice(0, 8)}` : ''}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{log.user_id?.slice(0, 8) || '-'}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{log.ip_address || '-'}</td>
                <td className="px-4 py-3 text-xs text-slate-600">{log.changed_fields?.join(', ') || log.description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.isLoading && !logs.data?.items.length && <div className="py-16 text-center text-sm text-slate-500">Логи не найдены</div>}
      </div>
      {logs.data && logs.data.pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: logs.data.pages }, (_, index) => index + 1).map((item) => (
            <button key={item} onClick={() => setPage(item)} className={`h-8 w-8 rounded-lg text-sm ${item === page ? 'bg-brand-500 text-white' : 'border border-surface-200 bg-white text-slate-600'}`}>
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
