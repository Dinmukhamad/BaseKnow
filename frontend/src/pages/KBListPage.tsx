import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle2, Clock, FileText, Plus, Search, SlidersHorizontal, Trash2, TriangleAlert } from 'lucide-react'
import { format } from 'date-fns'
import api from '@/api/client'
import { useDebounce } from '@/lib/useDebounce'
import { canManageKB } from '@/lib/rbac'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/Toast'
import type { KBArticleListItem, KBDirection, KBTopic, PaginatedResponse } from '@/types'

const HISTORY_KEY = 'kb_view_history'
const MAX_HISTORY = 5

function getHistory(): { id: string; title: string; viewedAt: string }[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}
export function addToHistory(id: string, title: string) {
  const history = getHistory().filter(h => h.id !== id)
  history.unshift({ id, title, viewedAt: new Date().toISOString() })
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
}

export function KBListPage() {
  const [queryInput, setQueryInput] = useState('')
  const [directionId, setDirectionId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [isActual, setIsActual] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [history, setHistory] = useState(getHistory())
  const { user } = useAuthStore()
  const { success, error } = useToast()
  const queryClient = useQueryClient()
  const canManage = canManageKB(user?.role)

  const query = useDebounce(queryInput, 400)

  useEffect(() => { setHistory(getHistory()) }, [])

  const directions = useQuery({
    queryKey: ['kb-directions'],
    queryFn: () => api.get<KBDirection[]>('/kb/directions?is_active=true').then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const topics = useQuery({
    queryKey: ['kb-topics', directionId],
    queryFn: () => api.get<KBTopic[]>(`/kb/topics?is_active=true${directionId ? `&direction_id=${directionId}` : ''}`).then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const articles = useQuery({
    queryKey: ['kb-articles', query, directionId, topicId, isActual, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: '20' })
      if (query) params.set('query', query)
      if (directionId) params.set('direction_id', directionId)
      if (topicId) params.set('topic_id', topicId)
      if (isActual) params.set('is_actual', isActual)
      return api.get<PaginatedResponse<KBArticleListItem>>(`/kb/articles?${params}`).then(r => r.data)
    },
    placeholderData: prev => prev,
  })

  const bulkDelete = useMutation({
    mutationFn: () => api.post('/kb/articles/bulk-delete', { ids: [...selected] }),
    onSuccess: () => { success(`Удалено ${selected.size} статей`); setSelected(new Set()); queryClient.invalidateQueries({ queryKey: ['kb-articles'] }) },
    onError: () => error('Ошибка при удалении'),
  })

  const bulkOutdated = useMutation({
    mutationFn: () => api.post('/kb/articles/bulk-outdated', { ids: [...selected] }),
    onSuccess: (res: any) => { success(`Отмечено устаревшими: ${res.data.updated}`); setSelected(new Set()); queryClient.invalidateQueries({ queryKey: ['kb-articles'] }) },
    onError: () => error('Ошибка'),
  })

  const toggleAll = () => {
    if (selected.size === articles.data?.items.length) setSelected(new Set())
    else setSelected(new Set(articles.data?.items.map(a => a.id) || []))
  }
  const toggleOne = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const resetPage = () => setPage(1)

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <div className="icon-tile"><BookOpen size={20} /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">База знаний</h1>
            <p className="text-sm text-ink-500">Поиск инструкций, процедур и справочных материалов</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {articles.data && <span className="rounded-full border border-surface-200 bg-white px-3 py-1.5 text-sm text-ink-500">{articles.data.total} статей</span>}
          {canManage && <Link to="/kb/new" className="btn-primary"><Plus size={16} />Новая статья</Link>}
        </div>
      </header>

      {/* Recent history */}
      {history.length > 0 && (
        <div className="panel-pad mb-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <Clock size={12} />
            Недавно просмотренные
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map(h => (
              <Link key={h.id} to={`/kb/${h.id}`}
                className="rounded-lg border border-surface-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-brand-300 hover:text-brand-700 transition">
                {h.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <section className="panel-pad mb-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" size={16} />
            <input value={queryInput} onChange={e => { setQueryInput(e.target.value); resetPage() }} placeholder="Найти статью по заголовку или содержанию" className="field w-full pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="btn-secondary pointer-events-none px-3 text-ink-500"><SlidersHorizontal size={15} />Фильтры</div>
            <select value={directionId} onChange={e => { setDirectionId(e.target.value); setTopicId(''); resetPage() }} className="field">
              <option value="">Все направления</option>
              {directions.data?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={topicId} onChange={e => { setTopicId(e.target.value); resetPage() }} disabled={!directionId} className="field disabled:opacity-50">
              <option value="">Все тематики</option>
              {topics.data?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={isActual} onChange={e => { setIsActual(e.target.value); resetPage() }} className="field">
              <option value="">Все статусы</option>
              <option value="true">Актуальные</option>
              <option value="false">Устаревшие</option>
            </select>
          </div>
        </div>
      </section>

      {/* Bulk actions bar */}
      {canManage && selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5">
          <span className="text-sm font-medium text-brand-700">Выбрано: {selected.size}</span>
          <button onClick={() => bulkOutdated.mutate()} disabled={bulkOutdated.isPending} className="btn-secondary text-xs">
            <TriangleAlert size={13} />
            Отметить устаревшими
          </button>
          <button onClick={() => { if (confirm(`Удалить ${selected.size} статей?`)) bulkDelete.mutate() }} disabled={bulkDelete.isPending} className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
            <Trash2 size={13} className="inline mr-1" />
            Удалить выбранные
          </button>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-ink-500 hover:text-ink-700">Снять выделение</button>
        </div>
      )}

      <section className={`panel overflow-hidden transition-opacity ${articles.isFetching ? 'opacity-70' : ''}`}>
        {articles.isLoading ? (
          <div className="flex items-center justify-center py-20 text-sm text-ink-500">Загрузка статей...</div>
        ) : !articles.data?.items.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="mb-3 text-slate-300" size={40} />
            <div className="text-sm font-medium text-ink-700">Статьи не найдены</div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                {canManage && (
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={selected.size === articles.data.items.length && selected.size > 0} onChange={toggleAll} className="h-4 w-4" />
                  </th>
                )}
                <th className="px-5 py-3 font-semibold">Статья</th>
                <th className="px-5 py-3 font-semibold">Статус</th>
                <th className="px-5 py-3 font-semibold">Обновлено</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {articles.data.items.map(article => (
                <tr key={article.id} className="transition hover:bg-surface-50">
                  {canManage && (
                    <td className="px-4 py-4">
                      <input type="checkbox" checked={selected.has(article.id)} onChange={() => toggleOne(article.id)} className="h-4 w-4" />
                    </td>
                  )}
                  <td className="px-5 py-4">
                    <Link to={`/kb/${article.id}`} className="font-medium text-ink-900 hover:text-brand-700" onClick={() => { setHistory(h => { addToHistory(article.id, article.title); return getHistory() }) }}>
                      {article.title}
                    </Link>
                    <div className="mt-1 text-xs text-ink-500">ID {article.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-5 py-4">
                    {article.is_actual
                      ? <span className="status-pill bg-green-50 text-green-700"><CheckCircle2 size={12} />Актуально</span>
                      : <span className="status-pill bg-amber-50 text-amber-700"><TriangleAlert size={12} />Устарело</span>}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-ink-500">{format(new Date(article.updated_at), 'dd.MM.yyyy HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {articles.data && articles.data.pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: articles.data.pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)} className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition ${p === page ? 'bg-brand-600 text-white' : 'border border-surface-200 bg-white text-ink-500 hover:bg-surface-50'}`}>{p}</button>
          ))}
        </div>
      )}
    </div>
  )
}
