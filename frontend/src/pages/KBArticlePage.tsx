import MDEditor from '@uiw/react-md-editor'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ArrowLeft, CheckCircle2, Edit2, ExternalLink, Paperclip, Trash2, TriangleAlert } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '@/api/client'
import { canManageKB } from '@/lib/rbac'
import { useAuthStore } from '@/store/auth'
import type { KBArticle } from '@/types'

export function KBArticlePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()

  const article = useQuery({
    queryKey: ['kb-article', id],
    queryFn: () => api.get<KBArticle>(`/kb/articles/${id}`).then((response) => response.data),
    enabled: Boolean(id),
  })

  const deleteArticle = useMutation({
    mutationFn: () => api.delete(`/kb/articles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] })
      navigate('/kb')
    },
  })

  if (article.isLoading) return <div className="p-6 text-sm text-slate-500">Загрузка...</div>
  if (!article.data) return <div className="p-6 text-sm text-slate-500">Статья не найдена</div>

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link to="/kb" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-surface-900">
        <ArrowLeft size={16} />
        К списку
      </Link>
      <article className="overflow-hidden rounded-lg border border-surface-200 bg-white">
        <header className="border-b border-surface-100 px-8 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3">
                {article.data.is_actual ? (
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
              </div>
              <h1 className="text-2xl font-semibold text-surface-900">{article.data.title}</h1>
              <p className="mt-2 text-sm text-slate-500">Обновлено {format(new Date(article.data.updated_at), 'dd.MM.yyyy HH:mm')}</p>
            </div>
            {canManageKB(user?.role) && (
              <div className="flex gap-2">
                <Link to={`/kb/${id}/edit`} className="flex items-center gap-2 rounded-lg border border-surface-200 px-3 py-2 text-sm hover:bg-surface-50">
                  <Edit2 size={14} />
                  Редактировать
                </Link>
                <button
                  onClick={() => {
                    if (confirm('Удалить статью?')) deleteArticle.mutate()
                  }}
                  className="rounded-lg border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50"
                  title="Удалить"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        </header>
        <div className="px-8 py-6" data-color-mode="light">
          <MDEditor.Markdown source={article.data.content} />
        </div>
        {(article.data.attachments.length > 0 || article.data.links.length > 0) && (
          <footer className="space-y-4 border-t border-surface-100 bg-surface-50 px-8 py-5">
            {article.data.attachments.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Вложения</h3>
                {article.data.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 text-sm text-slate-600">
                    <Paperclip size={14} />
                    {attachment.original_filename}
                    <span className="text-xs text-slate-400">({(attachment.file_size / 1024).toFixed(1)} KB)</span>
                  </div>
                ))}
              </div>
            )}
            {article.data.links.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Ссылки</h3>
                {article.data.links.map((link) => (
                  <a key={link} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-brand-700 hover:underline">
                    <ExternalLink size={14} />
                    {link}
                  </a>
                ))}
              </div>
            )}
          </footer>
        )}
      </article>
    </div>
  )
}
