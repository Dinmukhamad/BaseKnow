import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowLeft, CheckCircle2, Download, Edit2, ExternalLink, Paperclip, Trash2, TriangleAlert } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '@/api/client'
import { canManageKB } from '@/lib/rbac'
import { useAuthStore } from '@/store/auth'
import type { KBArticle } from '@/types'

// Lazy load the heavy markdown renderer only when article content is ready
const MDMarkdown = lazy(() =>
  import('@uiw/react-md-editor').then((m) => ({ default: m.default.Markdown }))
)

export function KBArticlePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const article = useQuery({
    queryKey: ['kb-article', id],
    queryFn: () => api.get<KBArticle>(`/kb/articles/${id}`).then((r) => r.data),
    enabled: Boolean(id),
    staleTime: 60_000, // article content doesn't change often
  })

  const deleteArticle = useMutation({
    mutationFn: () => api.delete(`/kb/articles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] })
      navigate('/kb')
    },
  })

  const deleteAttachment = useMutation({
    mutationFn: (attachmentId: string) => api.delete(`/kb/articles/${id}/attachments/${attachmentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kb-article', id] }),
  })

  if (article.isLoading) return <div className="page-shell text-sm text-ink-500">Загрузка статьи...</div>
  if (!article.data) return <div className="page-shell text-sm text-ink-500">Статья не найдена</div>

  return (
    <div className="page-shell max-w-5xl">
      <div className="mb-5 flex items-center justify-between">
        <Link to="/kb" className="btn-secondary">
          <ArrowLeft size={16} />
          К списку
        </Link>
        {canManageKB(user?.role) && (
          <div className="flex gap-2">
            <Link to={`/kb/${id}/edit`} className="btn-secondary">
              <Edit2 size={15} />
              Редактировать
            </Link>
            <button
              onClick={() => { if (confirm('Удалить статью?')) deleteArticle.mutate() }}
              className="btn-secondary text-accent-rose hover:border-red-200 hover:bg-red-50"
              title="Удалить"
            >
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </div>

      <article className="panel overflow-hidden">
        <header className="border-b border-surface-200 bg-white px-7 py-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {article.data.is_actual ? (
              <span className="status-pill bg-green-50 text-green-700">
                <CheckCircle2 size={12} />
                Актуально
              </span>
            ) : (
              <span className="status-pill bg-amber-50 text-amber-700">
                <TriangleAlert size={12} />
                Устарело
              </span>
            )}
            <span className="rounded-full bg-surface-100 px-2.5 py-1 text-xs text-ink-500">
              Обновлено {format(new Date(article.data.updated_at), 'dd.MM.yyyy HH:mm')}
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-900">{article.data.title}</h1>
        </header>

        <div className="px-7 py-6" data-color-mode="light">
          <Suspense fallback={<div className="text-sm text-ink-500">Загрузка содержания...</div>}>
            <MDMarkdown source={article.data.content} />
          </Suspense>
        </div>

        {(article.data.attachments.length > 0 || article.data.links.length > 0) && (
          <footer className="grid gap-5 border-t border-surface-200 bg-surface-50 px-7 py-5 md:grid-cols-2">
            {article.data.attachments.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Вложения</h3>
                <div className="space-y-2">
                  {article.data.attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-ink-700 ring-1 ring-surface-200">
                      <Paperclip size={14} className="text-ink-500" />
                      <span className="min-w-0 flex-1 truncate">{att.original_filename}</span>
                      <span className="text-xs text-ink-500">{(att.file_size / 1024).toFixed(1)} KB</span>
                      {canManageKB(user?.role) && (
                        <button onClick={() => deleteAttachment.mutate(att.id)} className="ml-1 rounded p-1 text-ink-400 hover:bg-red-50 hover:text-red-600" title="Удалить">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {article.data.links.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Ссылки</h3>
                <div className="space-y-2">
                  {article.data.links.map((link) => (
                    <a key={link} href={link} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-brand-700 ring-1 ring-surface-200 hover:bg-brand-50">
                      <ExternalLink size={14} />
                      <span className="min-w-0 truncate">{link}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </footer>
        )}
      </article>
    </div>
  )
}
