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
    mutationFn: () => api.post('/kb/directions', { name: newDirectionName.trim(), description: newDirectionDesc.trim() || null }),
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
    <div className="page-shell">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <div className="icon-tile">
            <BookMarked size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Справочники</h1>
            <p className="text-sm text-ink-500">Направления и тематики базы знаний</p>
          </div>
        </div>
      </header>

      {canManage && (
        <section className="panel-pad mb-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Plus size={16} className="text-brand-700" />
            Новое направление
          </div>
          <div className="flex gap-3">
            <input
              value={newDirectionName}
              onChange={(e) => setNewDirectionName(e.target.value)}
              placeholder="Название направления"
              className="field flex-1"
            />
            <input
              value={newDirectionDesc}
              onChange={(e) => setNewDirectionDesc(e.target.value)}
              placeholder="Описание (необязательно)"
              className="field flex-1"
            />
            <button
              onClick={() => createDirection.mutate()}
              disabled={!newDirectionName.trim() || createDirection.isPending}
              className="btn-primary"
            >
              Добавить
            </button>
          </div>
        </section>
      )}

      <section className="panel overflow-hidden">
        {directions.isLoading ? (
          <div className="flex items-center justify-center py-20 text-sm text-ink-500">Загрузка...</div>
        ) : !directions.data?.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <BookMarked className="mb-3 text-slate-300" size={40} />
            <div className="text-sm font-medium text-ink-700">Направления не найдены</div>
          </div>
        ) : (
          <ul className="divide-y divide-surface-100">
            {directions.data.map((direction) => {
              const isExpanded = expandedDirections.has(direction.id)
              const dirTopics = topicsByDirection(direction.id)
              return (
                <li key={direction.id}>
                  <div className="flex items-center gap-3 px-5 py-3 hover:bg-surface-50">
                    <button onClick={() => toggleDirection(direction.id)} className="text-ink-400 hover:text-ink-700">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <div className="flex-1">
                      <div className="font-medium text-ink-900">{direction.name}</div>
                      {direction.description && (
                        <div className="text-xs text-ink-500">{direction.description}</div>
                      )}
                    </div>
                    <span className="text-xs text-ink-400">{dirTopics.length} тем</span>
                    {canManage && (
                      <button
                        onClick={() => setDeletingId(direction.id)}
                        className="rounded p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600"
                        title="Удалить направление"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="border-t border-surface-100 bg-surface-50 px-5 py-3">
                      <ul className="mb-3 space-y-1">
                        {dirTopics.length === 0 && (
                          <li className="text-xs text-ink-400">Тематик нет</li>
                        )}
                        {dirTopics.map((topic) => (
                          <li key={topic.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm border border-surface-100">
                            <span className="flex-1 text-ink-700">{topic.name}</span>
                            {canManage && (
                              <button
                                onClick={() => setDeletingId(topic.id)}
                                className="rounded p-1 text-ink-400 hover:bg-red-50 hover:text-red-600"
                                title="Удалить тематику"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                      {canManage && (
                        <div className="flex gap-2">
                          <input
                            value={newTopicName[direction.id] ?? ''}
                            onChange={(e) => setNewTopicName((prev) => ({ ...prev, [direction.id]: e.target.value }))}
                            placeholder="Название тематики"
                            className="field flex-1 text-sm"
                          />
                          <button
                            onClick={() => createTopic.mutate({ directionId: direction.id, name: newTopicName[direction.id] ?? '' })}
                            disabled={!newTopicName[direction.id]?.trim() || createTopic.isPending}
                            className="btn-secondary text-sm"
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
      </section>

      {deletingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="panel-pad w-full max-w-sm rounded-xl bg-white">
            <h2 className="mb-2 text-base font-semibold text-ink-900">Подтвердите удаление</h2>
            <p className="mb-5 text-sm text-ink-500">
              Это действие необратимо. Связанные статьи потеряют привязку к направлению или тематике.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletingId(null)} className="btn-secondary">
                Отмена
              </button>
              <button
                onClick={() => {
                  const isDirection = directions.data?.some((d) => d.id === deletingId)
                  if (isDirection) deleteDirection.mutate(deletingId)
                  else deleteTopic.mutate(deletingId)
                }}
                disabled={deleteDirection.isPending || deleteTopic.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
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
