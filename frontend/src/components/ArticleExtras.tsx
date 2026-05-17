// src/components/ArticleExtras.tsx
import { useEffect, useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'

/* ─── READING PROGRESS BAR ─────────────────────────── */
export function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = document.querySelector('.main-content') as HTMLElement | null
    if (!el) return

    const update = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const max = scrollHeight - clientHeight
      if (max <= 0) { setProgress(0); return }
      setProgress(Math.min(100, (scrollTop / max) * 100))
    }

    el.addEventListener('scroll', update, { passive: true })
    update()
    return () => el.removeEventListener('scroll', update)
  }, [])

  return (
    <div className="reading-progress" aria-hidden="true">
      <div className="reading-progress-bar" style={{ width: `${progress}%` }} />
    </div>
  )
}

/* ─── BACK TO TOP ──────────────────────────────────── */
export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = document.querySelector('.main-content') as HTMLElement | null
    if (!el) return
    const check = () => setVisible(el.scrollTop > 400)
    el.addEventListener('scroll', check, { passive: true })
    return () => el.removeEventListener('scroll', check)
  }, [])

  const scrollTop = () => {
    const el = document.querySelector('.main-content')
    el?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!visible) return null

  return (
    <button
      onClick={scrollTop}
      aria-label="Вернуться наверх"
      style={{
        position: 'fixed',
        bottom: 'var(--space-8)',
        right: 'var(--space-8)',
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-brand)',
        color: 'white',
        border: 'none',
        borderRadius: 'var(--radius-full)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 50,
        transition: 'opacity var(--duration-normal), transform var(--duration-normal)',
        animation: 'toast-in 0.2s var(--ease-out)',
      }}
    >
      <ArrowUp size={18} />
    </button>
  )
}

/* ─── TABLE OF CONTENTS ────────────────────────────── */
interface TocItem {
  id: string
  text: string
  level: number
}

interface TocProps {
  contentSelector: string
}

export function TableOfContents({ contentSelector }: TocProps) {
  const [items, setItems] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const container = document.querySelector(contentSelector)
    if (!container) return

    const headings = container.querySelectorAll<HTMLElement>('h2, h3, h4')
    if (!headings.length) return

    const tocItems: TocItem[] = []
    headings.forEach((h, idx) => {
      if (!h.id) h.id = `heading-${idx}`
      tocItems.push({
        id: h.id,
        text: h.textContent ?? '',
        level: parseInt(h.tagName[1]),
      })
    })
    setItems(tocItems)

    // IntersectionObserver for active heading
    if (observerRef.current) observerRef.current.disconnect()

    observerRef.current = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) {
          // Pick the topmost visible heading
          const sorted = visible.sort((a, b) => {
            return a.boundingClientRect.top - b.boundingClientRect.top
          })
          setActiveId(sorted[0].target.id)
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )

    headings.forEach(h => observerRef.current?.observe(h))
    return () => observerRef.current?.disconnect()
  }, [contentSelector])

  if (items.length < 2) return null

  return (
    <nav className="toc" aria-label="Оглавление">
      <div className="toc-title">Оглавление</div>
      <ul className="toc-list">
        {items.map(item => (
          <li
            key={item.id}
            className={`toc-item level-${item.level}${activeId === item.id ? ' active' : ''}`}
          >
            <a
              href={`#${item.id}`}
              onClick={e => {
                e.preventDefault()
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/* ─── READING TIME ─────────────────────────────────── */
export function readingTime(content: string): number {
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}
