import type { ReactNode } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BarChart2, BookMarked, BookOpen, ClipboardList, LogOut, PhoneCall, ShieldCheck, Users } from 'lucide-react'
import clsx from 'clsx'
import { useAuthStore } from '@/store/auth'
import type { Role } from '@/types'

const navItems: Array<{ to: string; label: string; icon: ReactNode; roles: Role[] }> = [
  { to: '/kb', label: 'База знаний', icon: <BookOpen size={18} />, roles: ['operator', 'supervisor', 'admin'] },
  { to: '/kb/dictionaries', label: 'Справочники', icon: <BookMarked size={18} />, roles: ['supervisor', 'admin'] },
  { to: '/audit', label: 'Журнал аудита', icon: <ClipboardList size={18} />, roles: ['supervisor', 'admin'] },
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
    <div className="flex h-screen overflow-hidden bg-surface-50 text-ink-900">
      <aside className="flex w-64 shrink-0 flex-col border-r border-surface-200 bg-white">
        <div className="border-b border-surface-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
              <PhoneCall size={19} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight text-ink-900">Contact Center</div>
              <div className="text-xs text-ink-500">Операционная панель</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {allowed.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition',
                  isActive
                    ? 'bg-brand-50 font-medium text-brand-700 ring-1 ring-brand-100'
                    : 'text-ink-500 hover:bg-surface-50 hover:text-ink-900',
                )
              }
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-surface-200 p-4">
          <div className="rounded-lg bg-surface-50 p-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-brand-700 ring-1 ring-surface-200">
                {user?.full_name?.slice(0, 1) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink-900">{user?.full_name}</div>
                <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-ink-500 ring-1 ring-surface-200">
                  <ShieldCheck size={12} />
                  {user ? roleLabels[user.role] : ''}
                </div>
              </div>
              <button onClick={handleLogout} className="rounded-md p-1.5 text-ink-500 transition hover:bg-white hover:text-accent-rose" title="Выйти">
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
