// src/components/SearchModal.tsx
import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileText, Search, Clock, X, ArrowRight, Keyboard } from 'lucide-react'
import api from '@/api/client'
import { useDebounce } from '@/lib/useDebounce'
import { addToHistory } from '@/lib/history'
import type { KBArticleListItem, PaginatedResponse } from '@/types'

const SEARCH_HISTORY_KEY = 'bk-search-history'
const MAX_HISTORY = 8

function getSearchHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]') } catch { return [] }
}
function addSearchHistory(q: string) {
  const h = getSearchHistory().filter(s => s !== q)
  h.unshift(q)
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY)))
}
function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY)
}

interface Props {
  open: boolean
  onClose: () => void
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  const needle = query.toLowerCase()
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === needle
          ? <mark key={i} className="highlight">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

export function SearchModal({ open, onClose }: Props) {
  const [q, setQ] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [history, setHistory] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const debouncedQ = useDebounce(q, 300)

  const results = useQuery({
    queryKey: ['search-modal', debouncedQ],
    queryFn: () =>
      api.get<PaginatedResponse<KBArticleListItem>>(
        `/kb/articles?query=${encodeURIComponent(debouncedQ)}&page_size=8`
      ).then(r => r.data.items),
    enabled: debouncedQ.trim().length >= 2,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (open) {
      setHistory(getSearchHistory())
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQ('')
      setActiveIndex(0)
    }
  }, [open])

  const items = results.data ?? []

  const goToArticle = useCallback((id: string, title: string) => {
    if (q.trim()) addSearchHistory(q.trim())
    addToHistory(id, title)
    navigate(`/kb/${id}`)
    onClose()
  }, [q, navigate, onClose])

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    const count = items.length
    if (!count) return
    if (e.key === 'ArrowDown')  { e.preventDefault(); setActiveIndex(i => (i + 1) % count) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setActiveIndex(i => (i - 1 + count) % count) }
    if (e.key === 'Enter') {
      const item = items[activeIndex]
      if (item) goToArticle(item.id, item.title)
    }
  }, [items, activeIndex, goToArticle])

  useEffect(() => {
    setActiveIndex(0)
  }, [debouncedQ])

  if (!open) return null

  const showHistory = q.trim().length < 2
  const showResults = debouncedQ.trim().length >= 2

  return (
    <div
      className="modal-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Поиск по базе знаний"
    >
      <div className="search-modal" role="search">
        {/* Input */}
        <div className="search-input-wrap">
          <Search size={18} color="var(--color-text-tertiary)" aria-hidden="true" />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Поиск по базе знаний..."
            aria-label="Поисковый запрос"
            autoComplete="off"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="Очистить" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-tertiary)', display: 'flex'
            }}>
              <X size={16} />
            </button>
          )}
          <button onClick={onClose} aria-label="Закрыть поиск" style={{
            background: 'none', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)', padding: '2px 6px',
            cursor: 'pointer', color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)'
          }}>
            Esc
          </button>
        </div>

        {/* Results */}
        <div className="search-results">
          {showHistory && history.length > 0 && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-2) var(--space-4)',
                fontSize: 'var(--text-xs)', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: 'var(--color-text-tertiary)'
              }}>
                <span>История поиска</span>
                <button onClick={() => { clearSearchHistory(); setHistory([]) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>
                  Очистить
                </button>
              </div>
              {history.map(h => (
                <button
                  key={h}
                  className="search-result-item"
                  onClick={() => setQ(h)}
                  style={{ width: '100%', textAlign: 'left', border: 'none',
                  background: 'none', cursor: 'pointer' }}
                >
                  <Clock size={14} color="var(--color-text-tertiary)" />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                    {h}
                  </span>
                </button>
              ))}
            </>
          )}

          {showResults && results.isLoading && (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center',
              fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
              Поиск...
            </div>
          )}

          {showResults && !results.isLoading && items.length === 0 && (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center',
              fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
              Ничего не найдено для «{debouncedQ}»
            </div>
          )}

          {showResults && items.map((item, idx) => (
            <button
              key={item.id}
              className={`search-result-item${idx === activeIndex ? ' active' : ''}`}
              onClick={() => goToArticle(item.id, item.title)}
              style={{ width: '100%', textAlign: 'left', border: 'none',
              background: 'none', cursor: 'pointer' }}
            >
              <FileText size={14} color="var(--color-text-tertiary)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ fontSize: 'var(--text-sm)', fontWeight: 500,
                  color: 'var(--color-text-primary)' }}
                >
                  <HighlightedText text={item.title} query={debouncedQ} />
                </div>
                {!item.is_actual && (
                  <span className="pill pill-warning" style={{ marginTop: 4, display: 'inline-flex' }}>
                    Устарело
                  </span>
                )}
              </div>
              <ArrowRight size={14} color="var(--color-text-tertiary)" />
            </button>
          ))}
        </div>

        {/* Footer shortcuts */}
        <div className="search-footer">
          <Keyboard size={12} aria-hidden="true" />
          <span><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> навигация</span>
          <span><kbd className="kbd">Enter</kbd> открыть</span>
          <span><kbd className="kbd">Esc</kbd> закрыть</span>
        </div>
      </div>
    </div>
  )
}
