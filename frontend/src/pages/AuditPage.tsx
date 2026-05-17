import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ClipboardList, Download, Search, X } from 'lucide-react'
import api from '@/api/client'
import { useDebounce } from '@/lib/useDebounce'
import { Pagination } from '@/components/Pagination'
import type { AuditLog, PaginatedResponse } from '@/types'

const actionPillClass: Record<string, string> = {
  login: 'pill pill-success',
  logout: 'pill pill-neutral',
  create: 'pill pill-brand',
  update: 'pill pill-info',
  delete: 'pill pill-error',
  file_upload: 'pill pill-warning',
  search: 'pill pill-neutral',
  kb_article_open: 'pill pill-neutral',
}

export function AuditPage() {
  const [queryInput, setQueryInput] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
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

  const handleExport = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (query) params.set('query', query)
      if (action) params.set('action', action)
      const res = await api.get(`/audit/logs/export?${params}`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_log_${format(new Date(), 'yyyy-MM-dd')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="icon-tile"><ClipboardList size={20} /></div>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)',
              fontWeight: 800, letterSpacing: '-0.03em',
            }}>
              Журнал аудита
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Действия пользователей, изменения записей и события доступа
            </p>
          </div>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn btn-secondary">
          <Download size={15} />
          {exporting ? 'Экспорт...' : 'Скачать CSV'}
        </button>
      </header>

      {/* Filters */}
      <div className="card card-pad" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <span className="field-icon-slot left" aria-hidden="true">
              <Search size={15} />
            </span>
            <input
              value={queryInput}
              onChange={(e) => { setQueryInput(e.target.value); setPage(1) }}
              placeholder="Поиск по описанию или entity id"
              className="field field-icon-left"
              style={{ width: '100%' }}
            />
            {queryInput && (
              <button
                onClick={() => { setQueryInput(''); setPage(1) }}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label className="field-label" htmlFor="audit-action">Действие</label>
            <select
              id="audit-action"
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1) }}
              className="field"
              style={{ minWidth: 180 }}
            >
              <option value="">Все действия</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="kb_article_open">KB open</option>
              <option value="file_upload">File upload</option>
              <option value="search">Search</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        className="card"
        style={{ overflow: 'hidden', opacity: logs.isFetching ? 0.7 : 1, transition: 'opacity var(--duration-normal)' }}
      >
        <table className="data-table" role="table" aria-label="Журнал аудита">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Действие</th>
              <th>Сущность</th>
              <th>Пользователь</th>
              <th>IP</th>
              <th>Изменения</th>
            </tr>
          </thead>
          <tbody>
            {logs.data?.items.map((log) => (
              <tr key={log.id}>
                <td style={{ whiteSpace: 'nowrap', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm')}
                </td>
                <td>
                  <span className={actionPillClass[log.action] ?? 'pill pill-neutral'}>
                    {log.action}
                  </span>
                </td>
                <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  {log.entity_type || '-'}
                  {log.entity_id ? ` /${log.entity_id.slice(0, 8)}` : ''}
                </td>
                <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  {log.user_id?.slice(0, 8) || '-'}
                </td>
                <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  {log.ip_address || '-'}
                </td>
                <td style={{
                  maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
                }}>
                  {log.changed_fields?.join(', ') || log.description || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!logs.isLoading && !logs.data?.items.length && (
          <div className="empty-state">
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Логи не найдены</div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {logs.data && (
        <Pagination
          page={page}
          pages={logs.data.pages}
          total={logs.data.total}
          onPage={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        />
      )}
    </div>
  )
}
