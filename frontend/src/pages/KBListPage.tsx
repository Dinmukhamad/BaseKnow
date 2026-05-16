import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle2, FileText, Plus, Search, SlidersHorizontal, TriangleAlert } from 'lucide-react'
import { format } from 'date-fns'
import api from '@/api/client'
import { useDebounce } from '@/lib/useDebounce'
import { canManageKB } from '@/lib/rbac'
import { useAuthStore } from '@/store/auth'
import type { KBArticleListItem, KBDirection, KBTopic, PaginatedResponse } from '@/types'

export function KBListPage() {
  const [queryInput, setQueryInput] = useState('')
  const [directionId, setDirectionId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [isActual, setIsActual] = useState('')
  const [page, setPage] = useState(1)
  const { user } = useAuthStore()

  // Debounce search — fires API only after user stops typing 400ms
  const query = useDebounce(queryInput, 400)

  const directions = useQuery({
    queryKey: ['kb-directions'],
    queryFn: () => api.get<KBDirection[]>('/kb/directions?is_active=true').then((r) => r.data),
    staleTime: 5 * 60_000, // directions rarely change
  })

  const topics = useQuery({
    queryKey: ['kb-topics', directionId],
    queryFn: () => api.get<KBTopic[]>(`/kb/topics?is_active=true${directionId ? `&direction_id=${directionId}` : ''}`).then((r) => r.data),
    staleTime: 5 * 60_000,
    enabled: true, // load all topics upfront for fast filter switching
  })

  const articles = useQuery({
    queryKey: ['kb-articles', query, directionId, topicId, isActual, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: '20' })
      if (query) params.set('query', query)
      if (directionId) params.set('direction_id', directionId)
      if (topicId) params.set('topic_id', topicId)
      if (isActual) params.set('is_actual', isActual)
      return api.get<PaginatedResponse<KBArticleListItem>>(`/kb/articles?${params}`).then((r) => r.data)
    },
    placeholderData: (prev) => prev, // keep previous data visible while loading next page
  })

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
          {articles.data && (
            <span className="rounded-full border border-surface-200 bg-white px-3 py-1.5 text-sm text-ink-500">
              {articles.data.total} статей
            </span>
          )}
          {canManageKB(user?.role) && (
            <Link to="/kb/new" className="btn-primary">
              <Plus size={16} />
              Новая статья
            </Link>
          )}
        </div>
      </header>

      <section className="panel-pad mb-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" size={16} />
            <input
              value={queryInput}
              onChange={(e) => { setQueryInput(e.target.value); resetPage() }}
              placeholder="Найти статью по заголовку или содержанию"
              className="field w-full pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="btn-secondary pointer-events-none px-3 text-ink-500">
              <SlidersHorizontal size={15} />
              Фильтры
            </div>
            <select value={directionId} onChange={(e) => { setDirectionId(e.target.value); setTopicId(''); resetPage() }} className="field">
              <option value="">Все направления</option>
              {directions.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={topicId} onChange={(e) => { setTopicId(e.target.value); resetPage() }} disabled={!directionId} className="field disabled:opacity-50">
              <option value="">Все тематики</option>
              {topics.data?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={isActual} onChange={(e) => { setIsActual(e.target.value); resetPage() }} className="field">
              <option value="">Все статусы</option>
              <option value="true">Актуальные</option>
              <option value="false">Устаревшие</option>
            </select>
          </div>
        </div>
      </section>

      <section className={`panel overflow-hidden transition-opacity ${articles.isFetching ? 'opacity-70' : 'opacity-100'}`}>
        {articles.isLoading ? (
          <div className="flex items-center justify-center py-20 text-sm text-ink-500">Загрузка статей...</div>
        ) : !articles.data?.items.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="mb-3 text-slate-300" size={40} />
            <div className="text-sm font-medium text-ink-700">Статьи не найдены</div>
            <div className="mt-1 text-sm text-ink-500">Попробуйте изменить запрос или фильтры</div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-surface-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Статья</th>
                <th className="px-5 py-3 font-semibold">Статус</th>
                <th className="px-5 py-3 font-semibold">Обновлено</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {articles.data.items.map((article) => (
                <tr key={article.id} className="transition hover:bg-surface-50">
                  <td className="px-5 py-4">
                    <Link to={`/kb/${article.id}`} className="font-medium text-ink-900 hover:text-brand-700">
                      {article.title}
                    </Link>
                    <div className="mt-1 text-xs text-ink-500">ID {article.id.slice(0, 8)}</div>
                  </td>
                  <td className="px-5 py-4">
                    {article.is_actual ? (
                      <span className="status-pill bg-green-50 text-green-700"><CheckCircle2 size={12} />Актуально</span>
                    ) : (
                      <span className="status-pill bg-amber-50 text-amber-700"><TriangleAlert size={12} />Устарело</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-ink-500">
                    {format(new Date(article.updated_at), 'dd.MM.yyyy HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {articles.data && articles.data.pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: articles.data.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`h-9 min-w-9 rounded-lg px-3 text-sm font-medium transition ${p === page ? 'bg-brand-600 text-white' : 'border border-surface-200 bg-white text-ink-500 hover:bg-surface-50'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
