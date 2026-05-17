// src/main.tsx
import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigate, RouterProvider, createHashRouter } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ToastProvider } from '@/components/Toast'
import { LoginPage } from '@/pages/LoginPage'
import { useAuthStore } from '@/store/auth'

import '@/styles/global.css'

const KBArticlePage      = lazy(() => import('@/pages/KBArticlePage').then(m => ({ default: m.KBArticlePage })))
const KBEditorPage       = lazy(() => import('@/pages/KBEditorPage').then(m => ({ default: m.KBEditorPage })))
const KBListPage         = lazy(() => import('@/pages/KBListPage').then(m => ({ default: m.KBListPage })))
const KBDictionariesPage = lazy(() => import('@/pages/KBDictionariesPage').then(m => ({ default: m.KBDictionariesPage })))
const ProfilePage        = lazy(() => import('@/pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const StatsPage          = lazy(() => import('@/pages/StatsPage').then(m => ({ default: m.StatsPage })))
const UsersPage          = lazy(() => import('@/pages/UsersPage').then(m => ({ default: m.UsersPage })))
const AuditPage          = lazy(() => import('@/pages/AuditPage').then(m => ({ default: m.AuditPage })))
const FavoritesPage      = lazy(() => import('@/pages/FavoritesPage').then(m => ({ default: m.FavoritesPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Prefetch user on startup (non-blocking)
useAuthStore.getState().fetchMe()

function Fallback() {
  return (
    <div style={{
      display: 'flex',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '5rem 0',
      fontSize: 'var(--text-sm)',
      color: 'var(--color-text-tertiary)',
      fontFamily: 'var(--font-ui)',
    }}>
      Загрузка...
    </div>
  )
}

const router = createHashRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <Layout />,
      children: [
        { index: true, element: <Navigate to="/kb" replace /> },

        // KB routes
        { path: '/kb', element: <Suspense fallback={<Fallback />}><KBListPage /></Suspense> },
        {
          path: '/kb/new',
          element: <ProtectedRoute roles={['admin', 'supervisor']} />,
          children: [{ index: true, element: <Suspense fallback={<Fallback />}><KBEditorPage /></Suspense> }],
        },
        { path: '/kb/:id', element: <Suspense fallback={<Fallback />}><KBArticlePage /></Suspense> },
        {
          path: '/kb/:id/edit',
          element: <ProtectedRoute roles={['admin', 'supervisor']} />,
          children: [{ index: true, element: <Suspense fallback={<Fallback />}><KBEditorPage /></Suspense> }],
        },
        {
          path: '/kb/dictionaries',
          element: <ProtectedRoute roles={['admin', 'supervisor']} />,
          children: [{ index: true, element: <Suspense fallback={<Fallback />}><KBDictionariesPage /></Suspense> }],
        },

        // Other pages
        { path: '/favorites', element: <Suspense fallback={<Fallback />}><FavoritesPage /></Suspense> },
        { path: '/profile',   element: <Suspense fallback={<Fallback />}><ProfilePage /></Suspense> },
        {
          path: '/audit',
          element: <ProtectedRoute roles={['admin', 'supervisor']} />,
          children: [{ index: true, element: <Suspense fallback={<Fallback />}><AuditPage /></Suspense> }],
        },
        {
          path: '/users',
          element: <ProtectedRoute roles={['admin']} />,
          children: [{ index: true, element: <Suspense fallback={<Fallback />}><UsersPage /></Suspense> }],
        },
        {
          path: '/stats',
          element: <ProtectedRoute roles={['admin', 'supervisor']} />,
          children: [{ index: true, element: <Suspense fallback={<Fallback />}><StatsPage /></Suspense> }],
        },

        { path: '*', element: <Navigate to="/kb" replace /> },
      ],
    }],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
