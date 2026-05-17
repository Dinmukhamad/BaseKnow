// src/pages/KBListPage.tsx
import { useState, useEffect, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  BookOpen, CheckCircle2, Clock, FileText, Plus,
  Search, SlidersHorizontal, Trash2, TriangleAlert,
  Heart, X, Filter
} from 'lucide-react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import api from '@/api/client'
import { useDebounce } from '@/lib/useDebounce'
import { addToHistory, getHistory } from '@/lib/history'
import { canManageKB } from '@/lib/rbac'
import { useAuthStore } from '@/store/auth'
import { useToast } from '@/components/Toast'
import { Pagination } from '@/components/Pagination'
import { ArticleCardSkeleton } from '@/components/Skeleton'
import { useFavoritesStore } from '@/store/favorites'
import type { KBArticleListItem, KBDirection, KBTopic, PaginatedResponse } from '@/types'

export function KBListPage() {
  const [queryInput, setQueryInput] = useState('')
  const [directionId, setDirectionId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [isActual, setIsActual] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [history, setHistory] = useState(getHistory)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const { user } = useAuthStore()
  const { success, error } = useToast()
  const { toggle: toggleFav, isFavorite } = useFavoritesStore()
  const queryClient = useQueryClient()
  const canManage = canManageKB(user?.role)
  const query = useDebounce(queryInput, 400)

  // Scroll-reveal observer
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { rootMargin: '0px 0px -40px 0px', threshold: 0.05 }
    )
    containerRef.current?.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [history])

  const directions = useQuery({
    queryKey: ['kb-directions'],
    queryFn: () => api.get<KBDirection[]>('/kb/directions?is_active=true').then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const topics = useQuery({
    queryKey: ['kb-topics', directionId],
    queryFn: () => api.get<KBTopic[]>(
      `/kb/topics?is_active=true${directionId ? `&direction_id=${directionId}` : ''}`
    ).then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const articles = useQuery({
    queryKey: ['kb-articles', query, directionId, topicId, isActual, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), page_size: '25' })
      if (query)       params.set('query', query)
      if (directionId) params.set('direction_id', directionId)
      if (topicId)     params.set('topic_id', topicId)
      if (isActual)    params.set('is_actual', isActual)
      return api.get<PaginatedResponse<KBArticleListItem>>(`/kb/articles?${params}`).then(r => r.data)
    },
    placeholderData: prev => prev,
  })

  const bulkDelete = useMutation({
    mutationFn: () => api.post('/kb/articles/bulk-delete', { ids: [...selected] }),
    onSuccess: () => {
      success(`Удалено ${selected.size} статей`)
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] })
    },
    onError: () => error('Ошибка при удалении'),
  })

  const bulkOutdated = useMutation({
    mutationFn: () => api.post('/kb/articles/bulk-outdated', { ids: [...selected] }),
    onSuccess: (res: any) => {
      success(`Отмечено устаревшими: ${res.data.updated}`)
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] })
    },
    onError: () => error('Ошибка'),
  })

  const toggleAll = () => {
    if (selected.size === articles.data?.items.length) setSelected(new Set())
    else setSelected(new Set(articles.data?.items.map(a => a.id) ?? []))
  }
  const toggleOne = (id: string) => setSelected(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })
  const resetPage = () => setPage(1)

  const hasFilters = directionId || topicId || isActual
  const clearFilters = () => { setDirectionId(''); setTopicId(''); setIsActual(''); resetPage() }

  return (
    <div className="page-container" ref={containerRef}>
      {/* ── Page header ── */}
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="icon-tile"><BookOpen size={20} aria-hidden="true" /></div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)',
              fontWeight: 800, letterSpacing: '-0.03em' }}>
              База знаний
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Инструкции, процедуры и справочные материалы
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {articles.data && (
            <span className="pill pill-neutral">
              {articles.data.total} статей
            </span>
          )}
          {canManage && (
            <Link to="/kb/new" className="btn btn-primary">
              <Plus size={16} aria-hidden="true" />
              Новая статья
            </Link>
          )}
        </div>
      </header>

      {/* ── Recent history ── */}
      {history.length > 0 && (
        <div className="card card-pad reveal" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            marginBottom: 'var(--space-3)' }}>
            <Clock size={12} color="var(--color-text-tertiary)" aria-hidden="true" />
            <span className="section-label" style={{ margin: 0 }}>Недавно просмотренные</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
            {history.slice(0, 5).map(h => (
              <Link
                key={h.id}
                to={`/kb/${h.id}`}
                style={{
                  padding: '4px 12px',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-secondary)',
                  transition: 'all var(--duration-fast)',
                  maxWidth: 200,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border-focus)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--color-brand-text)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)'
                }}
              >
                {h.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Search + Filters ── */}
      <div className="card card-pad reveal" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          {/* Search input */}
          <div className="field-group" style={{ flex: 1, minWidth: 240, flexDirection: 'row' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span className="field-icon-slot left" aria-hidden="true">
                <Search size={15} />
              </span>
              <input
                value={queryInput}
                onChange={e => { setQueryInput(e.target.value); resetPage() }}
                placeholder="Поиск по заголовку и содержанию..."
                className="field field-icon-left"
                style={{ width: '100%' }}
                aria-label="Поиск по статьям"
              />
              {queryInput && (
                <button
                  onClick={() => { setQueryInput(''); resetPage() }}
                  aria-label="Очистить поиск"
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-tertiary)', display: 'flex' }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Filter toggle */}
          <button
            className={`btn btn-secondary${filtersOpen || hasFilters ? '' : ''}`}
            onClick={() => setFiltersOpen(p => !p)}
            aria-expanded={filtersOpen}
            style={hasFilters ? { borderColor: 'var(--color-brand)', color: 'var(--color-brand-text)' } : {}}
          >
            <Filter size={15} aria-hidden="true" />
            Фильтры
            {hasFilters && (
              <span style={{
                width: 6, height: 6, background: 'var(--color-brand)',
                borderRadius: '50%', marginLeft: 2
              }} aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Expanded filters */}
        {filtersOpen && (
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)',
            flexWrap: 'wrap', paddingTop: 'var(--space-3)',
            borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className="field-label" htmlFor="filter-direction">Направление</label>
              <select
                id="filter-direction"
                value={directionId}
                onChange={e => { setDirectionId(e.target.value); setTopicId(''); resetPage() }}
                className="field"
                style={{ minWidth: 160 }}
              >
                <option value="">Все направления</option>
                {directions.data?.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className="field-label" htmlFor="filter-topic">Тематика</label>
              <select
                id="filter-topic"
                value={topicId}
                onChange={e => { setTopicId(e.target.value); resetPage() }}
                className="field"
                disabled={!directionId}
                style={{ minWidth: 160 }}
              >
                <option value="">Все тематики</option>
                {topics.data?.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label className="field-label" htmlFor="filter-actual">Статус</label>
              <select
                id="filter-actual"
                value={isActual}
                onChange={e => { setIsActual(e.target.value); resetPage() }}
                className="field"
                style={{ minWidth: 140 }}
              >
                <option value="">Все статусы</option>
                <option value="true">Актуальные</option>
                <option value="false">Устаревшие</option>
              </select>
            </div>
            {hasFilters && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                  <X size={13} />
                  Сбросить
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bulk actions ── */}
      {canManage && selected.size > 0 && (
        <div className="bulk-bar">
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600,
            color: 'var(--color-brand-text)' }}>
            Выбрано: {selected.size}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => bulkOutdated.mutate()}
            disabled={bulkOutdated.isPending}
          >
            <TriangleAlert size={13} aria-hidden="true" />
            Отметить устаревшими
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => { if (confirm(`Удалить ${selected.size} статей?`)) bulkDelete.mutate() }}
            disabled={bulkDelete.isPending}
          >
            <Trash2 size={13} aria-hidden="true" />
            Удалить выбранные
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setSelected(new Set())}
            style={{ marginLeft: 'auto' }}
          >
            Снять выделение
          </button>
        </div>
      )}

      {/* ── Articles table ── */}
      <div className={`card${articles.isFetching ? '' : ''}`}
        style={{ overflow: 'hidden', opacity: articles.isFetching ? 0.65 : 1,
          transition: 'opacity var(--duration-normal)' }}>
        {articles.isLoading ? (
          <>
            {[...Array(8)].map((_, i) => <ArticleCardSkeleton key={i} />)}
          </>
        ) : !articles.data?.items.length ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileText size={24} color="var(--color-text-tertiary)" />
            </div>
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
              {query ? `Ничего не найдено для «${query}»` : 'Статьи не найдены'}
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
              {query ? 'Попробуйте другой поисковый запрос' : 'Создайте первую статью'}
            </div>
            {canManage && !query && (
              <Link to="/kb/new" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
                <Plus size={16} />
                Создать статью
              </Link>
            )}
          </div>
        ) : (
          <table className="data-table" role="table" aria-label="Список статей">
            <thead>
              <tr>
                {canManage && (
                  <th style={{ width: 44 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === articles.data.items.length && selected.size > 0}
                      onChange={toggleAll}
                      aria-label="Выбрать все статьи"
                      style={{ width: 16, height: 16, cursor: 'pointer' }}
                    />
                  </th>
                )}
                <th>Статья</th>
                <th style={{ width: 120 }}>Статус</th>
                <th style={{ width: 160 }}>Обновлено</th>
                <th style={{ width: 44 }}></th>
              </tr>
            </thead>
            <tbody>
              {articles.data.items.map(article => (
                <tr key={article.id}>
                  {canManage && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(article.id)}
                        onChange={() => toggleOne(article.id)}
                        aria-label={`Выбрать: ${article.title}`}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                    </td>
                  )}
                  <td>
                    <Link
                      to={`/kb/${article.id}`}
                      style={{ fontWeight: 600, color: 'var(--color-text-primary)',
                        fontSize: 'var(--text-sm)', display: 'block',
                        transition: 'color var(--duration-fast)' }}
                      onClick={() => {
                        addToHistory(article.id, article.title)
                        setHistory(getHistory())
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-brand-text)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'}
                    >
                      {article.title}
                    </Link>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                      #{article.id.slice(0, 8)}
                    </div>
                  </td>
                  <td>
                    {article.is_actual
                      ? <span className="pill pill-success"><CheckCircle2 size={11} aria-hidden="true" />Актуально</span>
                      : <span className="pill pill-warning"><TriangleAlert size={11} aria-hidden="true" />Устарело</span>
                    }
                  </td>
                  <td style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
                    whiteSpace: 'nowrap' }}>
                    {format(new Date(article.updated_at), 'd MMM yyyy, HH:mm', { locale: ru })}
                  </td>
                  <td>
                    <button
                      onClick={() => toggleFav(article.id, article.title)}
                      className="btn btn-ghost btn-icon"
                      aria-label={isFavorite(article.id) ? 'Убрать из избранного' : 'Добавить в избранное'}
                      style={{ color: isFavorite(article.id) ? 'var(--color-error-icon)' : undefined }}
                    >
                      <Heart
                        size={15}
                        fill={isFavorite(article.id) ? 'currentColor' : 'none'}
                        aria-hidden="true"
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Pagination ── */}
      {articles.data && (
        <Pagination
          page={page}
          pages={articles.data.pages}
          total={articles.data.total}
          onPage={p => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        />
      )}
    </div>
  )
}
