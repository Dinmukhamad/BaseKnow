// src/pages/KBArticlePage.tsx
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  ArrowLeft, CheckCircle2, Download, Edit2, ExternalLink,
  Heart, Paperclip, Trash2, TriangleAlert, Clock
} from 'lucide-react'
import { lazy, Suspense, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import rehypeSanitize from 'rehype-sanitize'
import api from '@/api/client'
import { canManageKB } from '@/lib/rbac'
import { addToHistory } from '@/lib/history'
import { safeUrl } from '@/lib/safeUrl'
import { useAuthStore } from '@/store/auth'
import { useFavoritesStore } from '@/store/favorites'
import { useToast } from '@/components/Toast'
import {
  ReadingProgress, BackToTop, TableOfContents, readingTime
} from '@/components/ArticleExtras'
import { ArticleSkeletonPage } from '@/components/Skeleton'
import type { KBArticle } from '@/types'

const MDMarkdown = lazy(() =>
  import('@uiw/react-md-editor').then(m => ({ default: m.default.Markdown }))
)

export function KBArticlePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { toggle: toggleFav, isFavorite } = useFavoritesStore()
  const { success, error: toastError } = useToast()

  const article = useQuery({
    queryKey: ['kb-article', id],
    queryFn: () => api.get<KBArticle>(`/kb/articles/${id}`).then(r => r.data),
    enabled: Boolean(id),
    staleTime: 60_000,
  })

  // Track view history
  useEffect(() => {
    if (article.data) addToHistory(article.data.id, article.data.title)
  }, [article.data?.id])

  // Add copy buttons to all code blocks after markdown renders
  useEffect(() => {
    if (!article.data) return
    const timer = setTimeout(() => {
      document.querySelectorAll<HTMLElement>('.article-body pre').forEach(pre => {
        if (pre.querySelector('.code-copy-btn')) return
        const code = (pre.querySelector('code') as HTMLElement | null)?.innerText ?? ''
        const btn = document.createElement('button')
        btn.className = 'code-copy-btn'
        btn.textContent = 'Копировать'
        btn.onclick = () => {
          navigator.clipboard.writeText(code).then(() => {
            btn.textContent = 'Скопировано!'
            btn.classList.add('copied')
            setTimeout(() => {
              btn.textContent = 'Копировать'
              btn.classList.remove('copied')
            }, 2000)
          })
        }
        pre.style.position = 'relative'
        pre.appendChild(btn)
      })
    }, 500)
    return () => clearTimeout(timer)
  }, [article.data])

  const deleteArticle = useMutation({
    mutationFn: () => api.delete(`/kb/articles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] })
      success('Статья удалена')
      navigate('/kb')
    },
    onError: () => toastError('Ошибка при удалении'),
  })

  const deleteAttachment = useMutation({
    mutationFn: (attachmentId: string) =>
      api.delete(`/kb/articles/${id}/attachments/${attachmentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-article', id] })
      success('Вложение удалено')
    },
  })

  if (article.isLoading) return <ArticleSkeletonPage />

  if (!article.data) return (
    <div className="page-container">
      <div className="empty-state">
        <div style={{ fontSize: 'var(--text-4xl)' }}>📄</div>
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>Статья не найдена</div>
        <Link to="/kb" className="btn btn-secondary" style={{ marginTop: 'var(--space-4)' }}>
          <ArrowLeft size={16} />
          Вернуться к списку
        </Link>
      </div>
    </div>
  )

  const { data: a } = article
  const minutes = readingTime(a.content)
  const isFav = isFavorite(a.id)

  return (
    <>
      <ReadingProgress />

      <div className="page-container" style={{ maxWidth: 1100 }}>
        {/* Breadcrumb */}
        <nav className="breadcrumbs" aria-label="Путь навигации">
          <Link to="/kb">База знаний</Link>
          <span className="separator" aria-hidden="true">/</span>
          <span className="current">{a.title}</span>
        </nav>

        {/* Top actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 'var(--space-5)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
          <Link to="/kb" className="btn btn-secondary">
            <ArrowLeft size={16} aria-hidden="true" />
            К списку
          </Link>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              className="btn btn-ghost"
              onClick={() => toggleFav(a.id, a.title)}
              aria-label={isFav ? 'Убрать из избранного' : 'Добавить в избранное'}
              style={{ color: isFav ? 'var(--color-error-icon)' : undefined }}
            >
              <Heart size={16} fill={isFav ? 'currentColor' : 'none'} aria-hidden="true" />
              {isFav ? 'В избранном' : 'В избранное'}
            </button>
            {canManageKB(user?.role) && (
              <>
                <Link to={`/kb/${id}/edit`} className="btn btn-secondary">
                  <Edit2 size={15} aria-hidden="true" />
                  Редактировать
                </Link>
                <button
                  onClick={() => { if (confirm('Удалить статью безвозвратно?')) deleteArticle.mutate() }}
                  className="btn btn-danger"
                  aria-label="Удалить статью"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Article + sidebar layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: 'var(--space-8)',
          alignItems: 'start' }}>
          {/* Main article */}
          <article className="card" style={{ overflow: 'hidden' }}>
            {/* Article header */}
            <header style={{ padding: 'var(--space-6) var(--space-8)',
              borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)',
                marginBottom: 'var(--space-4)' }}>
                {a.is_actual
                  ? <span className="pill pill-success"><CheckCircle2 size={11} />Актуально</span>
                  : <span className="pill pill-warning"><TriangleAlert size={11} />Устарело</span>
                }
                <span className="pill pill-neutral">
                  <Clock size={11} />
                  {minutes} мин. чтения
                </span>
                <span className="pill pill-neutral">
                  Обновлено {format(new Date(a.updated_at), 'd MMM yyyy', { locale: ru })}
                </span>
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)',
                fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                {a.title}
              </h1>
            </header>

            {/* Article body */}
            <div className="article-body" style={{ padding: 'var(--space-8)' }}
              id="article-body" data-color-mode="auto">
              <Suspense fallback={
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
                  Загрузка содержания...
                </div>
              }>
                <MDMarkdown
                  source={a.content}
                  // Explicit sanitization. Defends against `dangerouslySetInnerHTML`-style
                  // smuggling via raw HTML or unsafe URL schemes if a future change
                  // adds `rehypePlugins={[rehypeRaw]}` somewhere.
                  rehypePlugins={[[rehypeSanitize]]}
                />
              </Suspense>
            </div>

            {/* Attachments & links footer */}
            {(a.attachments.length > 0 || a.links.length > 0) && (
              <footer style={{
                display: 'grid',
                gridTemplateColumns: a.attachments.length && a.links.length ? '1fr 1fr' : '1fr',
                gap: 'var(--space-5)',
                borderTop: '1px solid var(--color-border)',
                background: 'var(--color-surface-2)',
                padding: 'var(--space-5) var(--space-8)',
              }}>
                {a.attachments.length > 0 && (
                  <div>
                    <div className="section-label">Вложения</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {a.attachments.map(att => (
                        <div
                          key={att.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)',
                            fontSize: 'var(--text-sm)' }}
                        >
                          <Paperclip size={13} color="var(--color-text-tertiary)" aria-hidden="true" />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' }}>
                            {att.original_filename}
                          </span>
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
                            flexShrink: 0 }}>
                            {(att.file_size / 1024).toFixed(1)} KB
                          </span>
                          {canManageKB(user?.role) && (
                            <button
                              onClick={() => deleteAttachment.mutate(att.id)}
                              className="btn btn-ghost btn-icon"
                              aria-label={`Удалить вложение ${att.original_filename}`}
                              style={{ width: 24, height: 24, color: 'var(--color-error-text)' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {a.links.length > 0 && (
                  <div>
                    <div className="section-label">Ссылки</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {a.links.map(link => {
                        const href = safeUrl(link)
                        if (!href) return null
                        return (
                        <a
                          key={link}
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)',
                            fontSize: 'var(--text-sm)', color: 'var(--color-text-link)',
                            transition: 'background var(--duration-fast)' }}
                        >
                          <ExternalLink size={13} aria-hidden="true" />
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' }}>
                            {link}
                          </span>
                        </a>
                        )
                      })}
                    </div>
                  </div>
                )}
              </footer>
            )}
          </article>

          {/* TOC sidebar */}
          <aside style={{ position: 'sticky', top: 'var(--space-6)' }}
            aria-label="Оглавление">
            <TableOfContents contentSelector="#article-body" />
          </aside>
        </div>
      </div>

      <BackToTop />
    </>
  )
}
