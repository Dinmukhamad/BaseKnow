import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import type { Role } from '@/types'

interface ProtectedRouteProps {
  roles?: Role[]
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && (!user || !roles.includes(user.role))) return <Navigate to="/kb" replace />
  return <Outlet />
}
