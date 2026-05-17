// src/lib/history.ts
const HISTORY_KEY = 'kb_view_history'
const MAX_HISTORY = 10

export interface HistoryItem {
  id: string
  title: string
  viewedAt: string
}

export function getHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]')
  } catch {
    return []
  }
}

export function addToHistory(id: string, title: string): void {
  const h = getHistory().filter(item => item.id !== id)
  h.unshift({ id, title, viewedAt: new Date().toISOString() })
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY)))
  } catch { /* quota exceeded */ }
}

export function clearHistory(): void {
  try { localStorage.removeItem(HISTORY_KEY) } catch { /* ignore */ }
}
