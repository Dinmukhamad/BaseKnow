// src/components/Layout.tsx
import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import {
  BarChart2, BookMarked, BookOpen, ClipboardList,
  LogOut, Settings, Users, Moon, Sun, Search,
  ChevronLeft, Menu, Heart, ShieldCheck
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useThemeStore } from '@/store/theme'
import { SearchModal } from './SearchModal'
import type { Role } from '@/types'

import '@/styles/sidebar.css'

const navItems: Array<{
  to: string
  label: string
  icon: ReactNode
  roles: Role[]
}> = [
  { to: '/kb',             label: 'База знаний',  icon: <BookOpen size={18} />,      roles: ['operator', 'supervisor', 'admin'] },
  { to: '/kb/dictionaries',label: 'Справочники',  icon: <BookMarked size={18} />,    roles: ['supervisor', 'admin'] },
  { to: '/favorites',      label: 'Избранное',    icon: <Heart size={18} />,         roles: ['operator', 'supervisor', 'admin'] },
  { to: '/audit',          label: 'Журнал аудита',icon: <ClipboardList size={18} />, roles: ['supervisor', 'admin'] },
  { to: '/users',          label: 'Пользователи', icon: <Users size={18} />,         roles: ['admin'] },
  { to: '/stats',          label: 'Статистика',   icon: <BarChart2 size={18} />,     roles: ['supervisor', 'admin'] },
]

const roleLabels: Record<Role, string> = {
  admin: 'Администратор',
  supervisor: 'Супервизор',
  operator: 'Оператор',
}

export function Layout() {
  const { user, logout } = useAuthStore()
  const { theme, toggle: toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const allowed = navItems.filter(item => user && item.roles.includes(user.role))

  // Global Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = useCallback(async () => {
    await logout()
    navigate('/login')
  }, [logout, navigate])

  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U'

  return (
    <div className="app-shell">
      {/* Mobile hamburger overlay */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' active' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* ── SIDEBAR ── */}
      <aside
        className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}
        role="navigation"
        aria-label="Основная навигация"
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark" aria-hidden="true">BK</div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-name">BaseKnow</div>
            <div className="sidebar-logo-sub">База знаний</div>
          </div>
        </div>

        {/* Collapse toggle (desktop) */}
        <button
          className="sidebar-toggle"
          onClick={() => setCollapsed(p => !p)}
          aria-label={collapsed ? 'Развернуть боковую панель' : 'Свернуть боковую панель'}
          aria-expanded={!collapsed}
        >
          <ChevronLeft size={14} />
        </button>

        {/* Nav */}
        <nav className="sidebar-nav">
          {/* Search shortcut */}
          <button
            className="nav-item"
            onClick={() => setSearchOpen(true)}
            data-label="Поиск"
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              justifyContent: 'flex-start' }}
            aria-label="Открыть поиск (Ctrl+K)"
          >
            <span className="nav-item-icon"><Search size={18} /></span>
            <span className="nav-item-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span>Поиск</span>
              <kbd style={{ fontSize: 10, padding: '1px 5px', border: '1px solid var(--color-border-strong)',
                borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-2)',
                color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>⌘K</kbd>
            </span>
          </button>

          <hr className="divider" style={{ margin: 'var(--space-2) 0' }} />

          {/* Nav items */}
          {allowed.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/kb'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              data-label={item.label}
              aria-current={undefined}
              onClick={() => setMobileOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <span className="nav-item-icon" aria-hidden="true">{item.icon}</span>
                  <span className="nav-item-text">{item.label}</span>
                  {isActive && <span className="sr-only">(текущая страница)</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer: user + actions */}
        <div className="sidebar-footer">
          {/* Theme toggle */}
          <button
            className="nav-item"
            onClick={toggleTheme}
            data-label={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              justifyContent: 'flex-start', marginBottom: 'var(--space-1)' }}
            aria-label={theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему'}
          >
            <span className="nav-item-icon" aria-hidden="true">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </span>
            <span className="nav-item-text">
              {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            </span>
          </button>

          {/* User tile */}
          <div className="user-tile">
            <div className="avatar" aria-hidden="true">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.full_name ?? 'Пользователь'}</div>
              <div className="user-role-badge">
                <ShieldCheck size={9} aria-hidden="true" />
                {user ? roleLabels[user.role] : ''}
              </div>
            </div>
            <div className="user-actions">
              <Link
                to="/profile"
                className="user-action-btn"
                aria-label="Мой профиль"
                onClick={() => setMobileOpen(false)}
              >
                <Settings size={14} />
              </Link>
              <button
                className="user-action-btn danger"
                onClick={handleLogout}
                aria-label="Выйти из системы"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="main-content" id="main-content" tabIndex={-1}>
        {/* Mobile header */}
        <header style={{
          display: 'none',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          position: 'sticky', top: 0, zIndex: 'var(--z-header)',
        }} className="mobile-header">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Открыть меню"
            aria-expanded={mobileOpen}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-secondary)', padding: 4, display: 'flex' }}
          >
            <Menu size={22} />
          </button>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 'var(--text-base)', color: 'var(--color-text-primary)' }}>
            BaseKnow
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Поиск"
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-secondary)', padding: 4, display: 'flex' }}
            >
              <Search size={20} />
            </button>
            <button
              onClick={toggleTheme}
              aria-label="Переключить тему"
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-secondary)', padding: 4, display: 'flex' }}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        <Outlet />
      </main>

      {/* Search modal */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      <style>{`
        @media (max-width: 768px) {
          .mobile-header { display: flex !important; }
        }
        .sr-only {
          position: absolute;
          width: 1px; height: 1px;
          padding: 0; margin: -1px;
          overflow: hidden;
          clip: rect(0,0,0,0);
          white-space: nowrap;
          border-width: 0;
        }
      `}</style>
    </div>
  )
}
