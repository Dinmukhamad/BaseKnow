// src/store/theme.ts
import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem('bk-theme') as Theme | null
    if (stored === 'light' || stored === 'dark') return stored
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch { /* SSR or permissions */ }
  return 'light'
}

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t)
  try { localStorage.setItem('bk-theme', t) } catch { /* ignore */ }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getInitialTheme(),

  setTheme: (t) => {
    applyTheme(t)
    set({ theme: t })
  },

  toggle: () => {
    const next = get().theme === 'light' ? 'dark' : 'light'
    applyTheme(next)
    set({ theme: next })
  },
}))
