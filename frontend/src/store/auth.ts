import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/api/client'
import type { TokenResponse, User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (username, password) => {
        set({ isLoading: true })
        try {
          // The server sets the refresh token as a HttpOnly cookie on this response.
          // We only ever see the access token in the body.
          const { data } = await api.post<TokenResponse>('/auth/login', { username, password })
          localStorage.setItem('access_token', data.access_token)
          const { data: user } = await api.get<User>('/auth/me')
          set({ user, isAuthenticated: true, isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        try {
          // No body — server reads the refresh cookie and revokes it.
          await api.post('/auth/logout')
        } finally {
          localStorage.removeItem('access_token')
          set({ user: null, isAuthenticated: false })
        }
      },

      // Background refresh — doesn't block initial render since persisted user is already loaded
      fetchMe: async () => {
        if (!localStorage.getItem('access_token')) return
        try {
          const { data } = await api.get<User>('/auth/me')
          set({ user: data, isAuthenticated: true })
        } catch {
          // Token expired — interceptor handles refresh; if that fails, redirect to login
          set({ user: null, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'contact-center-auth',
      // Persist user + auth state → app renders instantly from localStorage
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
)
