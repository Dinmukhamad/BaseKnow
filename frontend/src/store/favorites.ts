// src/store/favorites.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FavoriteItem {
  id: string
  title: string
  savedAt: string
}

interface FavoritesState {
  items: FavoriteItem[]
  toggle: (id: string, title: string) => void
  isFavorite: (id: string) => boolean
  remove: (id: string) => void
  clear: () => void
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],

      toggle: (id, title) => {
        const { items } = get()
        const exists = items.some(i => i.id === id)
        if (exists) {
          set({ items: items.filter(i => i.id !== id) })
        } else {
          set({ items: [{ id, title, savedAt: new Date().toISOString() }, ...items] })
        }
      },

      isFavorite: (id) => get().items.some(i => i.id === id),

      remove: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),

      clear: () => set({ items: [] }),
    }),
    { name: 'bk-favorites' }
  )
)
