import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigate, RouterProvider, createHashRouter } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/pages/LoginPage'
import { useAuthStore } from '@/store/auth'
import './index.css'

const AuditPage = lazy(() => import('@/pages/AuditPage').then(m => ({ default: m.AuditPage })))
const KBArticlePage = lazy(() => import('@/pages/KBArticlePage').then(m => ({ default: m.KBArticlePage })))
const KBEditorPage = lazy(() => import('@/pages/KBEditorPage').then(m => ({ default: m.KBEditorPage })))
const KBListPage = lazy(() => import('@/pages/KBListPage').then(m => ({ default: m.KBListPage })))
const KBDictionariesPage = lazy(() => import('@/pages/KBDictionariesPage').then(m => ({ default: m.KBDictionariesPage })))
const StatsPage = lazy(() => import('@/pages/StatsPage').then(m => ({ default: m.StatsPage })))
const UsersPage = lazy(() => import('@/pages/UsersPage').then(m => ({ default: m.UsersPage })))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // данные свежие 30 сек — не перезапрашиваем при переходах
      gcTime: 5 * 60_000,       // кэш живёт 5 минут
      retry: 1,                 // одна повторная попытка вместо трёх
      refetchOnWindowFocus: false,
    },
  },
})

useAuthStore.getState().fetchMe()

const Fallback = () => (
  <div className="flex h-full items-center justify-center py-20 text-sm text-ink-500">Загрузка...</div>
)

const router = createHashRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/kb" replace /> },
          { path: '/kb', element: <Suspense fallback={<Fallback />}><KBListPage /></Suspense> },
          { path: '/kb/new', element: <ProtectedRoute roles={['admin', 'supervisor']} />, children: [{ index: true, element: <Suspense fallback={<Fallback />}><KBEditorPage /></Suspense> }] },
          { path: '/kb/:id', element: <Suspense fallback={<Fallback />}><KBArticlePage /></Suspense> },
          { path: '/kb/:id/edit', element: <ProtectedRoute roles={['admin', 'supervisor']} />, children: [{ index: true, element: <Suspense fallback={<Fallback />}><KBEditorPage /></Suspense> }] },
          { path: '/kb/dictionaries', element: <ProtectedRoute roles={['admin', 'supervisor']} />, children: [{ index: true, element: <Suspense fallback={<Fallback />}><KBDictionariesPage /></Suspense> }] },
          { path: '/audit', element: <ProtectedRoute roles={['admin', 'supervisor']} />, children: [{ index: true, element: <Suspense fallback={<Fallback />}><AuditPage /></Suspense> }] },
          { path: '/users', element: <ProtectedRoute roles={['admin']} />, children: [{ index: true, element: <Suspense fallback={<Fallback />}><UsersPage /></Suspense> }] },
          { path: '/stats', element: <ProtectedRoute roles={['admin', 'supervisor']} />, children: [{ index: true, element: <Suspense fallback={<Fallback />}><StatsPage /></Suspense> }] },
          { path: '*', element: <Navigate to="/kb" replace /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)
