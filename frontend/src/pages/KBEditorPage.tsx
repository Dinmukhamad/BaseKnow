import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Paperclip, Plus, Save, Trash2, X } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/api/client'
import type { KBArticle, KBDirection, KBTopic } from '@/types'

const MDEditor = lazy(() => import('@uiw/react-md-editor'))

export function KBEditorPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = Boolean(id)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [directionId, setDirectionId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [isActual, setIsActual] = useState(true)
  const [link, setLink] = useState('')
  const [links, setLinks] = useState<string[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  const article = useQuery({
    queryKey: ['kb-article', id],
    queryFn: () => api.get<KBArticle>(`/kb/articles/${id}`).then((response) => response.data),
    enabled: isEditing,
  })

  const directions = useQuery({
    queryKey: ['kb-directions'],
    queryFn: () => api.get<KBDirection[]>('/kb/directions?is_active=true').then((response) => response.data),
  })

  const topics = useQuery({
    queryKey: ['kb-topics', directionId],
    queryFn: () => api.get<KBTopic[]>(`/kb/topics?is_active=true${directionId ? `&direction_id=${directionId}` : ''}`).then((response) => response.data),
  })

  useEffect(() => {
    if (article.data) {
      setTitle(article.data.title)
      setContent(article.data.content)
      setDirectionId(article.data.direction_id || '')
      setTopicId(article.data.topic_id || '')
      setIsActual(article.data.is_actual)
      setLinks(article.data.links || [])
    }
  }, [article.data])

  const saveArticle = useMutation({
    mutationFn: (payload: Record<string, unknown>) => (isEditing ? api.patch(`/kb/articles/${id}`, payload) : api.post('/kb/articles', payload)),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] })
      navigate(`/kb/${isEditing ? id : response.data.id}`)
    },
    onError: () => setError('Не удалось сохранить статью'),
  })

  const deleteAttachment = useMutation({
    mutationFn: (attachmentId: string) => api.delete(`/kb/articles/${id}/attachments/${attachmentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['kb-article', id] }),
  })

  const uploadAttachment = useMutation({
    mutationFn: async () => {
      if (!file || !id) return
      const data = new FormData()
      data.append('file', file)
      return api.post(`/kb/articles/${id}/attachments`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      setFile(null)
      queryClient.invalidateQueries({ queryKey: ['kb-article', id] })
    },
  })

  const handleSave = () => {
    setError('')
    if (!title.trim() || !content.trim()) {
      setError('Заполните заголовок и содержание')
      return
    }
    saveArticle.mutate({
      title,
      content,
      direction_id: directionId || null,
      topic_id: topicId || null,
      is_actual: isActual,
      links,
    })
  }

  const addLink = () => {
    if (!link.trim()) return
    setLinks((current) => [...current, link.trim()])
    setLink('')
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary">
            <ArrowLeft size={16} />
            Назад
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">{isEditing ? 'Редактирование статьи' : 'Новая статья'}</h1>
            <p className="text-sm text-ink-500">Markdown, вложения, ссылки и признаки актуальности</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saveArticle.isPending} className="btn-primary">
          <Save size={16} />
          Сохранить
        </button>
      </header>

      {error && <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <section className="space-y-4">
          <div className="panel-pad">
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Заголовок</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="field w-full" placeholder="Короткий понятный заголовок" />
          </div>
          <div className="panel-pad" data-color-mode="light">
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Содержание</label>
            <Suspense fallback={
                <div style={{height: 560, background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)'}}>
                  Загрузка редактора...
                </div>
              }>
                <MDEditor value={content} onChange={(value) => setContent(value || '')} height={560} preview="edit" />
              </Suspense>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="panel-pad">
            <h3 className="mb-4 text-sm font-semibold text-ink-900">Параметры</h3>
            <label className="mb-4 flex items-center justify-between rounded-lg bg-surface-50 px-3 py-2 text-sm text-ink-700">
              <span>Актуальная статья</span>
              <input type="checkbox" checked={isActual} onChange={(event) => setIsActual(event.target.checked)} className="h-4 w-4 rounded border-surface-300 text-brand-600" />
            </label>
            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">Направление</span>
              <select value={directionId} onChange={(event) => { setDirectionId(event.target.value); setTopicId('') }} className="field w-full">
                <option value="">Не выбрано</option>
                {directions.data?.map((direction) => (
                  <option key={direction.id} value={direction.id}>{direction.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-500">Тематика</span>
              <select value={topicId} onChange={(event) => setTopicId(event.target.value)} disabled={!directionId} className="field w-full disabled:opacity-50">
                <option value="">Не выбрано</option>
                {topics.data?.map((topic) => (
                  <option key={topic.id} value={topic.id}>{topic.name}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="panel-pad">
            <h3 className="mb-3 text-sm font-semibold text-ink-900">Ссылки</h3>
            <div className="mb-3 flex gap-2">
              <input value={link} onChange={(event) => setLink(event.target.value)} className="field min-w-0 flex-1" placeholder="https://..." />
              <button onClick={addLink} className="btn-secondary px-3" title="Добавить ссылку">
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {links.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg bg-surface-50 px-3 py-2 text-xs text-ink-700">
                  <span className="min-w-0 flex-1 truncate">{item}</span>
                  <button onClick={() => setLinks((current) => current.filter((value) => value !== item))} title="Удалить ссылку" className="text-ink-500 hover:text-accent-rose">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {isEditing && (
            <div className="panel-pad">
              <h3 className="mb-3 text-sm font-semibold text-ink-900">Вложения</h3>
              <input
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="mb-3 block w-full text-xs text-ink-500 file:mr-3 file:rounded-lg file:border-0 file:bg-surface-100 file:px-3 file:py-2 file:text-sm file:text-ink-700"
              />
              <button onClick={() => uploadAttachment.mutate()} disabled={!file || uploadAttachment.isPending} className="btn-secondary w-full">
                <Paperclip size={15} />
                Загрузить файл
              </button>
              {article.data?.attachments.length ? (
                <div className="mt-3 space-y-1">
                  {article.data.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-2 rounded bg-surface-50 px-2 py-1 text-xs text-ink-500">
                      <span className="min-w-0 flex-1 truncate">{attachment.original_filename}</span>
                      <button onClick={() => deleteAttachment.mutate(attachment.id)} className="shrink-0 text-ink-400 hover:text-red-600" title="Удалить">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
