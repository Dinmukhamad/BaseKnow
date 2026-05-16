import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ClipboardList, Search } from 'lucide-react'
import api from '@/api/client'
import { useDebounce } from '@/lib/useDebounce'
import type { AuditLog, PaginatedResponse } from '@/types'

export function AuditPage() {
  const [queryInput, setQueryInput] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)

  const query = useDebounce(queryInput, 400)

  const logs = useQuery({
    queryKey: ['audit-logs', query, action, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: '20' })
      if (query) params.set('query', query)
      if (action) params.set('action', action)
      return api.get<PaginatedResponse<AuditLog>>(`/audit/logs?${params}`).then((r) => r.data)
    },
    placeholderData: (prev) => prev,
  })

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <div className="icon-tile"><ClipboardList size={20} /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Журнал аудита</h1>
            <p className="text-sm text-ink-500">Действия пользователей, изменения записей и события доступа</p>
          </div>
        </div>
      </header>

      <section className="panel-pad mb-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />
            <input
              value={queryInput}
              onChange={(e) => { setQueryInput(e.target.value); setPage(1) }}
              placeholder="Поиск по описанию или entity id"
              className="field w-full pl-9"
            />
          </div>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }} className="field">
            <option value="">Все действия</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="kb_article_open">KB open</option>
          </select>
        </div>
      </section>

      <section className={`panel overflow-hidden transition-opacity ${logs.isFetching ? 'opacity-70' : 'opacity-100'}`}>
        <table className="w-full">
          <thead className="bg-surface-50 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-5 py-3 font-semibold">Дата</th>
              <th className="px-5 py-3 font-semibold">Действие</th>
              <th className="px-5 py-3 font-semibold">Сущность</th>
              <th className="px-5 py-3 font-semibold">Пользователь</th>
              <th className="px-5 py-3 font-semibold">IP</th>
              <th className="px-5 py-3 font-semibold">Изменения</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {logs.data?.items.map((log) => (
              <tr key={log.id} className="hover:bg-surface-50">
                <td className="whitespace-nowrap px-5 py-4 text-xs text-ink-500">{format(new Date(log.created_at), 'dd.MM.yyyy HH:mm')}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-surface-100 px-2.5 py-1 text-xs font-medium text-ink-700">{log.action}</span>
                </td>
                <td className="px-5 py-4 text-xs text-ink-500">{log.entity_type || '-'}{log.entity_id ? ` /${log.entity_id.slice(0, 8)}` : ''}</td>
                <td className="px-5 py-4 text-xs text-ink-500">{log.user_id?.slice(0, 8) || '-'}</td>
                <td className="px-5 py-4 text-xs text-ink-500">{log.ip_address || '-'}</td>
                <td className="max-w-md px-5 py-4 text-xs text-ink-500">{log.changed_fields?.join(', ') || log.description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.isLoading && !logs.data?.items.length && (
          <div className="py-20 text-center text-sm text-ink-500">Логи не найдены</div>
        )}
      </section>

      {logs.data && logs.data.pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: logs.data.pages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)}
              className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium ${p === page ? 'bg-brand-600 text-white' : 'border border-surface-200 bg-white text-ink-500'}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
