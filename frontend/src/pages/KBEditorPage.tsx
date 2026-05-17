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
  const [errorMsg, setErrorMsg] = useState('')

  const article = useQuery({
    queryKey: ['kb-article', id],
    queryFn: () => api.get<KBArticle>(`/kb/articles/${id}`).then((r) => r.data),
    enabled: isEditing,
  })

  const directions = useQuery({
    queryKey: ['kb-directions'],
    queryFn: () => api.get<KBDirection[]>('/kb/directions?is_active=true').then((r) => r.data),
  })

  const topics = useQuery({
    queryKey: ['kb-topics', directionId],
    queryFn: () =>
      api
        .get<KBTopic[]>(`/kb/topics?is_active=true${directionId ? `&direction_id=${directionId}` : ''}`)
        .then((r) => r.data),
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
    mutationFn: (payload: Record<string, unknown>) =>
      isEditing ? api.patch(`/kb/articles/${id}`, payload) : api.post('/kb/articles', payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] })
      navigate(`/kb/${isEditing ? id : response.data.id}`)
    },
    onError: () => setErrorMsg('Не удалось сохранить статью'),
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
      return api.post(`/kb/articles/${id}/attachments`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      setFile(null)
      queryClient.invalidateQueries({ queryKey: ['kb-article', id] })
    },
  })

  const handleSave = () => {
    setErrorMsg('')
    if (!title.trim() || !content.trim()) {
      setErrorMsg('Заполните заголовок и содержание')
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
    setLinks((cur) => [...cur, link.trim()])
    setLink('')
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button onClick={() => navigate(-1)} className="btn btn-secondary">
            <ArrowLeft size={16} />
            Назад
          </button>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)',
              fontWeight: 800, letterSpacing: '-0.03em',
            }}>
              {isEditing ? 'Редактирование статьи' : 'Новая статья'}
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Markdown, вложения, ссылки и признаки актуальности
            </p>
          </div>
        </div>
        <button onClick={handleSave} disabled={saveArticle.isPending} className="btn btn-primary">
          <Save size={16} />
          Сохранить
        </button>
      </header>

      {errorMsg && (
        <div className="alert alert-error" style={{ marginBottom: 'var(--space-4)' }}>
          {errorMsg}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 320px',
        gap: 'var(--space-4)',
        alignItems: 'start',
      }}>
        {/* ── Main editor column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card card-pad">
            <label className="field-label" htmlFor="article-title">Заголовок</label>
            <input
              id="article-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="field"
              placeholder="Короткий понятный заголовок"
            />
          </div>

          <div className="card card-pad" data-color-mode="light">
            <label className="field-label">Содержание</label>
            <Suspense fallback={
              <div style={{
                height: 560, background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-md)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)',
              }}>
                Загрузка редактора...
              </div>
            }>
              <MDEditor value={content} onChange={(v) => setContent(v || '')} height={560} preview="edit" />
            </Suspense>
          </div>
        </div>

        {/* ── Sidebar column ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Parameters */}
          <div className="card card-pad">
            <div className="section-label">Параметры</div>

            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              marginBottom: 'var(--space-3)',
            }}>
              <span>Актуальная статья</span>
              <input
                type="checkbox"
                checked={isActual}
                onChange={(e) => setIsActual(e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-brand)' }}
              />
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', marginBottom: 'var(--space-3)' }}>
              <label className="field-label" htmlFor="editor-direction">Направление</label>
              <select
                id="editor-direction"
                value={directionId}
                onChange={(e) => { setDirectionId(e.target.value); setTopicId('') }}
                className="field"
              >
                <option value="">Не выбрано</option>
                {directions.data?.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label className="field-label" htmlFor="editor-topic">Тематика</label>
              <select
                id="editor-topic"
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                disabled={!directionId}
                className="field"
              >
                <option value="">Не выбрано</option>
                {topics.data?.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Links */}
          <div className="card card-pad">
            <div className="section-label">Ссылки</div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addLink()}
                className="field"
                placeholder="https://..."
                style={{ flex: 1, minWidth: 0 }}
              />
              <button onClick={addLink} className="btn btn-secondary btn-icon" title="Добавить ссылку">
                <Plus size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {links.map((item) => (
                <div key={item} style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                  background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)',
                  fontSize: 'var(--text-xs)',
                }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>
                    {item}
                  </span>
                  <button
                    onClick={() => setLinks((cur) => cur.filter((v) => v !== item))}
                    title="Удалить ссылку"
                    className="btn btn-ghost btn-icon"
                    style={{ width: 24, height: 24, color: 'var(--color-error-text)' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Attachments (edit mode only) */}
          {isEditing && (
            <div className="card card-pad">
              <div className="section-label">Вложения</div>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{
                  display: 'block', width: '100%', marginBottom: 'var(--space-3)',
                  fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
                }}
              />
              <button
                onClick={() => uploadAttachment.mutate()}
                disabled={!file || uploadAttachment.isPending}
                className="btn btn-secondary"
                style={{ width: '100%' }}
              >
                <Paperclip size={15} />
                Загрузить файл
              </button>

              {article.data?.attachments.length ? (
                <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  {article.data.attachments.map((att) => (
                    <div key={att.id} style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                      background: 'var(--color-surface-2)', border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)', padding: '6px var(--space-3)',
                      fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)',
                    }}>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.original_filename}
                      </span>
                      <button
                        onClick={() => deleteAttachment.mutate(att.id)}
                        className="btn btn-ghost btn-icon"
                        style={{ width: 24, height: 24, color: 'var(--color-error-text)' }}
                        title="Удалить"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
