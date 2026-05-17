// src/pages/StatsPage.tsx
import { useQuery } from '@tanstack/react-query'
import { BarChart2, BookOpen, Eye, Search, TrendingUp, Users, Clock, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/api/client'
import { StatCardSkeleton } from '@/components/Skeleton'

interface Stats {
  articles: { total: number; actual: number; outdated: number }
  users:    { total: number }
  views:    { today: number; week: number; month: number }
  searches: { today: number; week: number; month: number }
  top_articles: { id: string; title: string; views: number }[]
}

interface StatCardProps {
  label:   string
  value:   number
  sub:     string
  icon:    React.ReactNode
  color:   string
  bgColor: string
  trend?:  { label: string; value: number; positive?: boolean }
}

function StatCard({ label, value, sub, icon, color, bgColor, trend }: StatCardProps) {
  return (
    <div className="card card-pad">
      <div style={{
        width: 44, height: 44, borderRadius: 'var(--radius-lg)',
        background: bgColor, color, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 'var(--space-4)',
      }} aria-hidden="true">
        {icon}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)',
        fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1,
        marginBottom: 4 }}>
        {value.toLocaleString('ru')}
      </div>
      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)',
        color: 'var(--color-text-primary)', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
        {sub}
      </div>
      {trend && (
        <div style={{
          marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--color-border)',
          fontSize: 'var(--text-xs)',
          color: trend.positive !== false ? 'var(--color-success-text)' : 'var(--color-error-text)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <TrendingUp size={11} />
          {trend.label}: {trend.value}
        </div>
      )}
    </div>
  )
}

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
      {data.map(d => (
        <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 4 }}>
          <div style={{
            width: '100%',
            height: Math.max(4, (d.value / max) * 60),
            background: 'var(--color-brand)',
            borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
            opacity: 0.8,
            transition: 'height 0.5s var(--ease-out)',
            minHeight: d.value > 0 ? 4 : 0,
          }} />
          <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)',
            whiteSpace: 'nowrap' }}>
            {d.label}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            {d.value}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StatsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<Stats>('/stats').then(r => r.data),
    staleTime: 60_000,
  })

  const cards = data ? [
    {
      label: 'Всего статей',
      value: data.articles.total,
      sub: `${data.articles.actual} актуальных · ${data.articles.outdated} устаревших`,
      icon: <BookOpen size={20} />,
      color: 'var(--color-brand-text)',
      bgColor: 'var(--color-brand-muted)',
      trend: { label: 'Актуальных', value: data.articles.actual },
    },
    {
      label: 'Пользователей',
      value: data.users.total,
      sub: 'с доступом к системе',
      icon: <Users size={20} />,
      color: 'var(--color-info-text)',
      bgColor: 'var(--color-info-bg)',
    },
    {
      label: 'Просмотров за месяц',
      value: data.views.month,
      sub: `неделя: ${data.views.week}`,
      icon: <Eye size={20} />,
      color: 'var(--color-warning-text)',
      bgColor: 'var(--color-warning-bg)',
      trend: { label: 'Сегодня', value: data.views.today },
    },
    {
      label: 'Поисков за месяц',
      value: data.searches.month,
      sub: `неделя: ${data.searches.week}`,
      icon: <Search size={20} />,
      color: 'var(--color-success-text)',
      bgColor: 'var(--color-success-bg)',
      trend: { label: 'Сегодня', value: data.searches.today },
    },
  ] : []

  return (
    <div className="page-container">
      <header className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div className="icon-tile"><BarChart2 size={20} /></div>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)',
              fontWeight: 800, letterSpacing: '-0.03em' }}>
              Статистика
            </h1>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
              Активность пользователей и использование базы знаний
            </p>
          </div>
        </div>
      </header>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {isLoading
          ? [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
          : cards.map(c => <StatCard key={c.label} {...c} />)
        }
      </div>

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-4)' }}>
          {/* Views chart */}
          <div className="card card-pad">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              marginBottom: 'var(--space-4)' }}>
              <Eye size={15} color="var(--color-text-tertiary)" />
              <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                Просмотры статей
              </h2>
            </div>
            <BarChart data={[
              { label: 'Сегодня', value: data.views.today },
              { label: 'Неделя',  value: data.views.week },
              { label: 'Месяц',   value: data.views.month },
            ]} />
          </div>

          {/* Searches chart */}
          <div className="card card-pad">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              marginBottom: 'var(--space-4)' }}>
              <Search size={15} color="var(--color-text-tertiary)" />
              <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                Поисковые запросы
              </h2>
            </div>
            <BarChart data={[
              { label: 'Сегодня', value: data.searches.today },
              { label: 'Неделя',  value: data.searches.week },
              { label: 'Месяц',   value: data.searches.month },
            ]} />
          </div>

          {/* Top articles */}
          {data.top_articles.length > 0 && (
            <div className="card" style={{ gridColumn: '1 / -1', overflow: 'hidden' }}>
              <div style={{ padding: 'var(--space-4) var(--space-5)',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <TrendingUp size={15} color="var(--color-text-tertiary)" />
                <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 700 }}>
                  Популярные статьи
                </h2>
              </div>
              <div>
                {data.top_articles.slice(0, 5).map((a, i) => (
                  <div
                    key={a.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                      padding: 'var(--space-3) var(--space-5)',
                      borderBottom: i < data.top_articles.length - 1
                        ? '1px solid var(--color-border-subtle)' : 'none' }}
                  >
                    <div style={{
                      width: 24, height: 24, flexShrink: 0,
                      background: i < 3 ? 'var(--color-brand-muted)' : 'var(--color-surface-2)',
                      color: i < 3 ? 'var(--color-brand-text)' : 'var(--color-text-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                    }} aria-hidden="true">
                      {i + 1}
                    </div>
                    <Link
                      to={`/kb/${a.id}`}
                      style={{ flex: 1, fontWeight: 500, fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-primary)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        transition: 'color var(--duration-fast)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-brand-text)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)'}
                    >
                      {a.title}
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
                      flexShrink: 0 }}>
                      <Eye size={11} />
                      {a.views}
                    </div>
                    <Link
                      to={`/kb/${a.id}`}
                      className="btn btn-ghost btn-icon"
                      aria-label={`Открыть: ${a.title}`}
                      style={{ width: 28, height: 28 }}
                    >
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
