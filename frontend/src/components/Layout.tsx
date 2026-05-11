import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { BarChart2, BookOpen, ClipboardList, LogOut, Phone, Shield, Users } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/store/auth'
import type { Role } from '@/types'

const navItems: Array<{ to: string; label: string; icon: ReactNode; roles: Role[] }> = [
  { to: '/kb', label: 'База знаний', icon: <BookOpen size={18} />, roles: ['operator', 'supervisor', 'admin'] },
  { to: '/audit', label: 'Аудит', icon: <ClipboardList size={18} />, roles: ['supervisor', 'admin'] },
  { to: '/users', label: 'Пользователи', icon: <Users size={18} />, roles: ['admin'] },
  { to: '/stats', label: 'Статистика', icon: <BarChart2 size={18} />, roles: ['supervisor', 'admin'] },
]

const roleLabels: Record<Role, string> = {
  admin: 'Администратор',
  supervisor: 'Супервизор',
  operator: 'Оператор',
}

export function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const allowed = navItems.filter((item) => user && item.roles.includes(user.role))

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50">
      <aside className="flex w-60 shrink-0 flex-col border-r border-surface-200 bg-white">
        <div className="flex items-center gap-3 border-b border-surface-200 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
            <Phone size={18} />
          </div>
          <div>
            <div className="text-sm font-semibold text-surface-900">CC Platform</div>
            <div className="text-xs text-slate-500">Internal workspace</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-3">
          {allowed.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                  isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-surface-50 hover:text-surface-900',
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-surface-200 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {user?.full_name?.slice(0, 1) || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-surface-900">{user?.full_name}</div>
              <div className="mt-1 inline-flex items-center gap-1 rounded bg-surface-100 px-1.5 py-0.5 text-xs text-slate-600">
                <Shield size={11} />
                {user ? roleLabels[user.role] : ''}
              </div>
            </div>
            <button onClick={handleLogout} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Выйти">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
