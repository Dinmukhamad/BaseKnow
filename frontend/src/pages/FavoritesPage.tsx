// src/pages/FavoritesPage.tsx
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Heart, Trash2, ExternalLink, BookMarked } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useFavoritesStore } from '@/store/favorites'
import { useToast } from '@/components/Toast'
import api from '@/api/client'
import type { KBArticle } from '@/types'

export function FavoritesPage() {
  const { items, remove, clear } = useFavoritesStore()
  const { success } = useToast()

  return (
    <div className="page-container">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="icon-tile" style={{ color: 'var(--color-error-icon)',
            background: 'var(--color-error-bg)' }}>
            <Heart size={20} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)',
              fontWeight: 800, letterSpacing: '-0.03em' }}>
              Избранное
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Сохранённые статьи
            </p>
          </div>
        </div>
        {items.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span className="pill pill-neutral">{items.length} статей</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { if (confirm('Очистить всё избранное?')) { clear(); success('Избранное очищено') } }}
            >
              <Trash2 size={13} />
              Очистить всё
            </button>
          </div>
        )}
      </header>

      {items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{
            background: 'var(--color-error-bg)', color: 'var(--color-error-icon)'
          }}>
            <Heart size={24} />
          </div>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>
            Избранное пусто
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
            Нажмите ❤ на любой статье, чтобы добавить её сюда
          </div>
          <Link to="/kb" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
            <BookMarked size={16} />
            Перейти к базе знаний
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {items.map(item => (
            <div
              key={item.id}
              className="card card-pad"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  to={`/kb/${item.id}`}
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: 'var(--text-base)',
                    color: 'var(--color-text-primary)',
                    display: 'block',
                    marginBottom: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'color var(--duration-fast)',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-brand-text)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'}
                >
                  {item.title}
                </Link>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  Сохранено {format(new Date(item.savedAt), 'd MMM yyyy', { locale: ru })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                <Link
                  to={`/kb/${item.id}`}
                  className="btn btn-secondary btn-sm"
                  aria-label={`Открыть статью ${item.title}`}
                >
                  <ExternalLink size={13} />
                  Открыть
                </Link>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => { remove(item.id); success('Удалено из избранного') }}
                  aria-label={`Удалить из избранного: ${item.title}`}
                  style={{ color: 'var(--color-error-text)' }}
                >
                  <Heart size={13} fill="currentColor" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
