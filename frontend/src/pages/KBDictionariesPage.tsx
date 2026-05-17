import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookMarked, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import api from '@/api/client'
import { canManageDictionaries } from '@/lib/rbac'
import { useAuthStore } from '@/store/auth'
import type { KBDirection, KBTopic } from '@/types'

export function KBDictionariesPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const canManage = canManageDictionaries(user?.role)

  const [expandedDirections, setExpandedDirections] = useState<Set<string>>(new Set())
  const [newDirectionName, setNewDirectionName] = useState('')
  const [newDirectionDesc, setNewDirectionDesc] = useState('')
  const [newTopicName, setNewTopicName] = useState<Record<string, string>>({})
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const directions = useQuery({
    queryKey: ['kb-directions-all'],
    queryFn: () => api.get<KBDirection[]>('/kb/directions').then((r) => r.data),
  })

  const topics = useQuery({
    queryKey: ['kb-topics-all'],
    queryFn: () => api.get<KBTopic[]>('/kb/topics').then((r) => r.data),
  })

  const createDirection = useMutation({
    mutationFn: () =>
      api.post('/kb/directions', {
        name: newDirectionName.trim(),
        description: newDirectionDesc.trim() || null,
      }),
    onSuccess: () => {
      setNewDirectionName('')
      setNewDirectionDesc('')
      queryClient.invalidateQueries({ queryKey: ['kb-directions-all'] })
      queryClient.invalidateQueries({ queryKey: ['kb-directions'] })
    },
  })

  const deleteDirection = useMutation({
    mutationFn: (id: string) => api.delete(`/kb/directions/${id}`),
    onSuccess: () => {
      setDeletingId(null)
      queryClient.invalidateQueries({ queryKey: ['kb-directions-all'] })
      queryClient.invalidateQueries({ queryKey: ['kb-directions'] })
      queryClient.invalidateQueries({ queryKey: ['kb-topics-all'] })
    },
  })

  const createTopic = useMutation({
    mutationFn: ({ directionId, name }: { directionId: string; name: string }) =>
      api.post('/kb/topics', { name, direction_id: directionId }),
    onSuccess: (_data, variables) => {
      setNewTopicName((prev) => ({ ...prev, [variables.directionId]: '' }))
      queryClient.invalidateQueries({ queryKey: ['kb-topics-all'] })
      queryClient.invalidateQueries({ queryKey: ['kb-topics'] })
    },
  })

  const deleteTopic = useMutation({
    mutationFn: (id: string) => api.delete(`/kb/topics/${id}`),
    onSuccess: () => {
      setDeletingId(null)
      queryClient.invalidateQueries({ queryKey: ['kb-topics-all'] })
      queryClient.invalidateQueries({ queryKey: ['kb-topics'] })
    },
  })

  const toggleDirection = (id: string) => {
    setExpandedDirections((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const topicsByDirection = (directionId: string) =>
    topics.data?.filter((t) => t.direction_id === directionId) ?? []

  return (
    <div className="page-container">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="icon-tile">
            <BookMarked size={20} />
          </div>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)',
              fontWeight: 800, letterSpacing: '-0.03em',
            }}>
              Справочники
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Направления и тематики базы знаний
            </p>
          </div>
        </div>
      </header>

      {/* New direction form */}
      {canManage && (
        <div className="card card-pad" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}>
            <Plus size={16} color="var(--color-brand-text)" />
            Новое направление
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <input
              value={newDirectionName}
              onChange={(e) => setNewDirectionName(e.target.value)}
              placeholder="Название направления"
              className="field"
              style={{ flex: 1, minWidth: 180 }}
            />
            <input
              value={newDirectionDesc}
              onChange={(e) => setNewDirectionDesc(e.target.value)}
              placeholder="Описание (необязательно)"
              className="field"
              style={{ flex: 1, minWidth: 180 }}
            />
            <button
              onClick={() => createDirection.mutate()}
              disabled={!newDirectionName.trim() || createDirection.isPending}
              className="btn btn-primary"
            >
              Добавить
            </button>
          </div>
        </div>
      )}

      {/* Directions list */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {directions.isLoading ? (
          <div className="empty-state">
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>Загрузка...</div>
          </div>
        ) : !directions.data?.length ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <BookMarked size={24} color="var(--color-text-tertiary)" />
            </div>
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>Направления не найдены</div>
          </div>
        ) : (
          <ul style={{ listStyle: 'none' }}>
            {directions.data.map((direction, idx) => {
              const isExpanded = expandedDirections.has(direction.id)
              const dirTopics = topicsByDirection(direction.id)
              const isLast = idx === (directions.data?.length ?? 0) - 1
              return (
                <li key={direction.id} style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border)' }}>
                  {/* Direction row */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    padding: 'var(--space-3) var(--space-5)',
                    transition: 'background var(--duration-fast)',
                  }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    <button
                      onClick={() => toggleDirection(direction.id)}
                      className="btn btn-ghost btn-icon"
                      style={{ width: 28, height: 28, color: 'var(--color-text-tertiary)' }}
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)' }}>
                        {direction.name}
                      </div>
                      {direction.description && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                          {direction.description}
                        </div>
                      )}
                    </div>
                    <span className="pill pill-neutral">{dirTopics.length} тем</span>
                    {canManage && (
                      <button
                        onClick={() => setDeletingId(direction.id)}
                        className="btn btn-ghost btn-icon"
                        title="Удалить направление"
                        style={{ color: 'var(--color-text-tertiary)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-error-text)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {/* Topics panel */}
                  {isExpanded && (
                    <div style={{
                      borderTop: '1px solid var(--color-border)',
                      background: 'var(--color-surface-2)',
                      padding: 'var(--space-3) var(--space-5)',
                    }}>
                      <ul style={{ listStyle: 'none', marginBottom: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                        {dirTopics.length === 0 && (
                          <li style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Тематик нет</li>
                        )}
                        {dirTopics.map((topic) => (
                          <li key={topic.id} style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)',
                            fontSize: 'var(--text-sm)',
                          }}>
                            <span style={{ flex: 1, color: 'var(--color-text-secondary)' }}>{topic.name}</span>
                            {canManage && (
                              <button
                                onClick={() => setDeletingId(topic.id)}
                                className="btn btn-ghost btn-icon"
                                title="Удалить тематику"
                                style={{ width: 24, height: 24, color: 'var(--color-text-tertiary)' }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-error-text)'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-tertiary)'}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                      {canManage && (
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <input
                            value={newTopicName[direction.id] ?? ''}
                            onChange={(e) =>
                              setNewTopicName((prev) => ({ ...prev, [direction.id]: e.target.value }))
                            }
                            placeholder="Название тематики"
                            className="field"
                            style={{ flex: 1 }}
                          />
                          <button
                            onClick={() =>
                              createTopic.mutate({
                                directionId: direction.id,
                                name: newTopicName[direction.id] ?? '',
                              })
                            }
                            disabled={!newTopicName[direction.id]?.trim() || createTopic.isPending}
                            className="btn btn-secondary"
                          >
                            <Plus size={14} />
                            Добавить тему
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deletingId && (
        <div className="modal-backdrop">
          <div className="modal-panel">
            <div className="modal-header">
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Подтвердите удаление</h2>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                Это действие необратимо. Связанные статьи потеряют привязку к направлению или тематике.
              </p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeletingId(null)} className="btn btn-secondary">
                Отмена
              </button>
              <button
                onClick={() => {
                  const isDirection = directions.data?.some((d) => d.id === deletingId)
                  if (isDirection) deleteDirection.mutate(deletingId)
                  else deleteTopic.mutate(deletingId)
                }}
                disabled={deleteDirection.isPending || deleteTopic.isPending}
                className="btn btn-danger"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
