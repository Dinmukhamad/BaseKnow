import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navigate, RouterProvider, createHashRouter } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuditPage } from '@/pages/AuditPage'
import { KBArticlePage } from '@/pages/KBArticlePage'
import { KBEditorPage } from '@/pages/KBEditorPage'
import { KBListPage } from '@/pages/KBListPage'
import { LoginPage } from '@/pages/LoginPage'
import { StatsPage } from '@/pages/StatsPage'
import { KBDictionariesPage } from '@/pages/KBDictionariesPage'
import { UsersPage } from '@/pages/UsersPage'
import { useAuthStore } from '@/store/auth'
import './index.css'

const queryClient = new QueryClient()

useAuthStore.getState().fetchMe()

const router = createHashRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <Navigate to="/kb" replace /> },
          { path: '/kb', element: <KBListPage /> },
          { path: '/kb/new', element: <ProtectedRoute roles={['admin', 'supervisor']} />, children: [{ index: true, element: <KBEditorPage /> }] },
          { path: '/kb/:id', element: <KBArticlePage /> },
          { path: '/kb/:id/edit', element: <ProtectedRoute roles={['admin', 'supervisor']} />, children: [{ index: true, element: <KBEditorPage /> }] },
          { path: '/kb/dictionaries', element: <ProtectedRoute roles={['admin', 'supervisor']} />, children: [{ index: true, element: <KBDictionariesPage /> }] },
          { path: '/audit', element: <ProtectedRoute roles={['admin', 'supervisor']} />, children: [{ index: true, element: <AuditPage /> }] },
          { path: '/users', element: <ProtectedRoute roles={['admin']} />, children: [{ index: true, element: <UsersPage /> }] },
          { path: '/stats', element: <ProtectedRoute roles={['admin', 'supervisor']} />, children: [{ index: true, element: <StatsPage /> }] },
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
