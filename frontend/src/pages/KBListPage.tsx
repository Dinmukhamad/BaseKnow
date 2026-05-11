import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle2, Plus, Search, TriangleAlert } from 'lucide-react'
import { format } from 'date-fns'
import api from '@/api/client'
import { canManageKB } from '@/lib/rbac'
import { useAuthStore } from '@/store/auth'
import type { KBArticleListItem, KBDirection, KBTopic, PaginatedResponse } from '@/types'

export function KBListPage() {
  const [query, setQuery] = useState('')
  const [directionId, setDirectionId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [isActual, setIsActual] = useState('')
  const [page, setPage] = useState(1)
  const { user } = useAuthStore()

  const directions = useQuery({
    queryKey: ['kb-directions'],
    queryFn: () => api.get<KBDirection[]>('/kb/directions?is_active=true').then((response) => response.data),
  })
  const topics = useQuery({
    queryKey: ['kb-topics', directionId],
    queryFn: () => api.get<KBTopic[]>(`/kb/topics?is_active=true${directionId ? `&direction_id=${directionId}` : ''}`).then((response) => response.data),
  })
  const articles = useQuery({
    queryKey: ['kb-articles', query, directionId, topicId, isActual, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: '20' })
      if (query) params.set('query', query)
      if (directionId) params.set('direction_id', directionId)
      if (topicId) params.set('topic_id', topicId)
      if (isActual) params.set('is_actual', isActual)
      return api.get<PaginatedResponse<KBArticleListItem>>(`/kb/articles?${params}`).then((response) => response.data)
    },
  })

  const resetPage = () => setPage(1)

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="text-brand-600" size={22} />
          <h1 className="text-xl font-semibold text-surface-900">База знаний</h1>
          {articles.data && <span className="rounded-full bg-surface-100 px-2.5 py-0.5 text-sm text-slate-500">{articles.data.total}</span>}
        </div>
        {canManageKB(user?.role) && (
          <Link to="/kb/new" className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            <Plus size={16} />
            Новая статья
          </Link>
        )}
      </div>

      <div className="mb-4 space-y-3 rounded-lg border border-surface-200 bg-white p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              resetPage()
            }}
            placeholder="Поиск по статьям"
            className="w-full rounded-lg border border-surface-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={directionId}
            onChange={(event) => {
              setDirectionId(event.target.value)
              setTopicId('')
              resetPage()
            }}
            className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">Все направления</option>
            {directions.data?.map((direction) => <option key={direction.id} value={direction.id}>{direction.name}</option>)}
          </select>
          <select
            value={topicId}
            onChange={(event) => {
              setTopicId(event.target.value)
              resetPage()
            }}
            disabled={!directionId}
            className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">Все тематики</option>
            {topics.data?.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
          </select>
          <select value={isActual} onChange={(event) => setIsActual(event.target.value)} className="rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm">
            <option value="">Все статусы</option>
            <option value="true">Актуальные</option>
            <option value="false">Устаревшие</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-200 bg-white">
        {articles.isLoading ? (
          <div className="py-16 text-center text-sm text-slate-500">Загрузка...</div>
        ) : !articles.data?.items.length ? (
          <div className="py-16 text-center text-sm text-slate-500">Статьи не найдены</div>
        ) : (
          <table className="w-full">
            <thead className="border-b border-surface-100 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Заголовок</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 font-medium">Обновлено</th>
              </tr>
            </thead>
            <tbody>
              {articles.data.items.map((article) => (
                <tr key={article.id} className="border-b border-surface-100 last:border-0 hover:bg-surface-50">
                  <td className="px-4 py-3">
                    <Link to={`/kb/${article.id}`} className="text-sm font-medium text-surface-900 hover:text-brand-700">{article.title}</Link>
                  </td>
                  <td className="px-4 py-3">
                    {article.is_actual ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                        <CheckCircle2 size={11} />
                        Актуально
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                        <TriangleAlert size={11} />
                        Устарело
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{format(new Date(article.updated_at), 'dd.MM.yyyy HH:mm')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {articles.data && articles.data.pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: articles.data.pages }, (_, index) => index + 1).map((item) => (
            <button
              key={item}
              onClick={() => setPage(item)}
              className={`h-8 w-8 rounded-lg text-sm ${item === page ? 'bg-brand-500 text-white' : 'border border-surface-200 bg-white text-slate-600'}`}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
