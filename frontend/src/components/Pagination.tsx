// src/components/Pagination.tsx
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page: number
  pages: number
  total?: number
  onPage: (p: number) => void
}

function getPages(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = []
  const left  = Math.max(1, current - 2)
  const right = Math.min(total, current + 2)
  if (left > 1)     { pages.push(1); if (left > 2) pages.push('...') }
  for (let i = left; i <= right; i++) pages.push(i)
  if (right < total){ if (right < total - 1) pages.push('...'); pages.push(total) }
  return pages
}

export function Pagination({ page, pages, total, onPage }: Props) {
  if (pages <= 1) return null
  const items = getPages(page, pages)

  return (
    <nav className="pagination" aria-label="Навигация по страницам">
      <button
        className="page-btn btn-icon"
        onClick={() => onPage(page - 1)}
        disabled={page === 1}
        aria-label="Предыдущая страница"
      >
        <ChevronLeft size={16} />
      </button>

      {items.map((item, idx) =>
        item === '...'
          ? <span key={`ellipsis-${idx}`} className="page-ellipsis" aria-hidden="true">…</span>
          : (
            <button
              key={item}
              className={`page-btn${item === page ? ' active' : ''}`}
              onClick={() => onPage(item)}
              aria-label={`Страница ${item}`}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </button>
          )
      )}

      <button
        className="page-btn btn-icon"
        onClick={() => onPage(page + 1)}
        disabled={page === pages}
        aria-label="Следующая страница"
      >
        <ChevronRight size={16} />
      </button>

      {total !== undefined && (
        <span style={{ marginLeft: 'var(--space-3)', fontSize: 'var(--text-xs)',
          color: 'var(--color-text-tertiary)' }}>
          {total} записей
        </span>
      )}
    </nav>
  )
}
