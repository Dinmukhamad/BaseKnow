import MDEditor from '@uiw/react-md-editor'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Save, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '@/api/client'
import type { KBArticle, KBDirection, KBTopic } from '@/types'

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
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-surface-900">
          <ArrowLeft size={16} />
          Назад
        </button>
        <h1 className="text-xl font-semibold text-surface-900">{isEditing ? 'Редактирование статьи' : 'Новая статья'}</h1>
        <button
          onClick={handleSave}
          disabled={saveArticle.isPending}
          className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
        >
          <Save size={15} />
          Сохранить
        </button>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <div className="rounded-lg border border-surface-200 bg-white p-5">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Заголовок</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-surface-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="rounded-lg border border-surface-200 bg-white p-5" data-color-mode="light">
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Содержание</label>
            <MDEditor value={content} onChange={(value) => setContent(value || '')} height={520} preview="edit" />
          </div>
        </section>
        <aside className="space-y-4">
          <div className="rounded-lg border border-surface-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-surface-900">Параметры</h3>
            <label className="mb-4 flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={isActual} onChange={(event) => setIsActual(event.target.checked)} className="h-4 w-4 rounded border-surface-200 text-brand-500" />
              Актуальная статья
            </label>
            <label className="mb-4 block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Направление</span>
              <select value={directionId} onChange={(event) => { setDirectionId(event.target.value); setTopicId('') }} className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm">
                <option value="">Не выбрано</option>
                {directions.data?.map((direction) => <option key={direction.id} value={direction.id}>{direction.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">Тематика</span>
              <select value={topicId} onChange={(event) => setTopicId(event.target.value)} disabled={!directionId} className="w-full rounded-lg border border-surface-200 bg-white px-3 py-2 text-sm disabled:opacity-50">
                <option value="">Не выбрано</option>
                {topics.data?.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
              </select>
            </label>
          </div>
          <div className="rounded-lg border border-surface-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-semibold text-surface-900">Ссылки</h3>
            <div className="mb-3 flex gap-2">
              <input value={link} onChange={(event) => setLink(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-surface-200 px-3 py-2 text-sm" placeholder="https://..." />
              <button onClick={addLink} className="rounded-lg bg-brand-50 p-2 text-brand-700 hover:bg-brand-100" title="Добавить ссылку">
                <Plus size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {links.map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-lg bg-surface-50 px-2.5 py-1.5 text-xs text-slate-600">
                  <span className="min-w-0 flex-1 truncate">{item}</span>
                  <button onClick={() => setLinks((current) => current.filter((value) => value !== item))} title="Удалить ссылку">
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          {isEditing && (
            <div className="rounded-lg border border-surface-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-surface-900">Вложения</h3>
              <input
                type="file"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
                className="mb-3 block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-surface-100 file:px-3 file:py-2 file:text-sm file:text-slate-700"
              />
              <button
                onClick={() => uploadAttachment.mutate()}
                disabled={!file || uploadAttachment.isPending}
                className="w-full rounded-lg bg-surface-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Загрузить
              </button>
              {article.data?.attachments.length ? (
                <div className="mt-3 space-y-1">
                  {article.data.attachments.map((attachment) => (
                    <div key={attachment.id} className="truncate text-xs text-slate-600">{attachment.original_filename}</div>
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
