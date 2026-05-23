import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api, { setAccessToken } from '@/api/client'
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
          // We only ever see the access token in the body — stored in memory, not localStorage.
          const { data } = await api.post<TokenResponse>('/auth/login', { username, password })
          setAccessToken(data.access_token)
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
          setAccessToken(null)
          set({ user: null, isAuthenticated: false })
        }
      },

      // Called on app startup: attempts a silent token refresh using the HttpOnly
      // cookie. If the cookie is valid we get a fresh access token into memory.
      // If not (cookie expired / absent), the user is sent to the login page.
      fetchMe: async () => {
        try {
          // Try to silently refresh first to restore the in-memory access token.
          const { data: refreshData } = await api.post<TokenResponse>('/auth/refresh', {})
          setAccessToken(refreshData.access_token)
          const { data: user } = await api.get<User>('/auth/me')
          set({ user, isAuthenticated: true })
        } catch {
          setAccessToken(null)
          set({ user: null, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'contact-center-auth',
      // Only persist the user object for instant first render — NOT any token.
      // The actual auth state is re-validated on every app start via fetchMe().
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
)
