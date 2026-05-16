import { useQuery } from '@tanstack/react-query'
import { BarChart2, BookOpen, Clock, Eye, Search, TrendingUp, Users } from 'lucide-react'
import { Link } from 'react-router-dom'
import api from '@/api/client'

interface Stats {
  articles: { total: number; actual: number; outdated: number }
  users: { total: number }
  views: { today: number; week: number; month: number }
  searches: { today: number; week: number; month: number }
  top_articles: { id: string; title: string; views: number }[]
}

export function StatsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.get<Stats>('/stats').then(r => r.data),
    staleTime: 60_000,
  })

  if (isLoading) return <div className="page-shell text-sm text-ink-500">Загрузка статистики...</div>

  const cards = [
    { label: 'Всего статей', value: data?.articles.total ?? 0, sub: `${data?.articles.actual ?? 0} актуальных`, icon: <BookOpen size={18} />, color: 'text-brand-700 bg-brand-50' },
    { label: 'Активных пользователей', value: data?.users.total ?? 0, sub: 'с доступом к системе', icon: <Users size={18} />, color: 'text-blue-700 bg-blue-50' },
    { label: 'Просмотров за месяц', value: data?.views.month ?? 0, sub: `сегодня: ${data?.views.today ?? 0}`, icon: <Eye size={18} />, color: 'text-amber-700 bg-amber-50' },
    { label: 'Поисков за месяц', value: data?.searches.month ?? 0, sub: `сегодня: ${data?.searches.today ?? 0}`, icon: <Search size={18} />, color: 'text-green-700 bg-green-50' },
  ]

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <div className="icon-tile"><BarChart2 size={20} /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Статистика</h1>
            <p className="text-sm text-ink-500">Активность пользователей и использование базы знаний</p>
          </div>
        </div>
      </header>

      <section className="mb-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className="panel-pad">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>{card.icon}</div>
            <div className="text-2xl font-semibold text-ink-900">{card.value.toLocaleString('ru')}</div>
            <div className="mt-0.5 text-sm font-medium text-ink-700">{card.label}</div>
            <div className="mt-1 text-xs text-ink-500">{card.sub}</div>
          </div>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Views chart */}
        <div className="panel-pad">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-900">
            <TrendingUp size={15} className="text-ink-400" />
            Просмотры статей
          </h2>
          <div className="space-y-3">
            {[
              { label: 'Сегодня', value: data?.views.today ?? 0, max: data?.views.month ?? 1 },
              { label: 'За неделю', value: data?.views.week ?? 0, max: data?.views.month ?? 1 },
              { label: 'За месяц', value: data?.views.month ?? 0, max: data?.views.month ?? 1 },
            ].map(row => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-xs text-ink-500">
                  <span>{row.label}</span>
                  <span className="font-medium text-ink-700">{row.value}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-surface-100">
                  <div className="h-2 rounded-full bg-brand-400 transition-all" style={{ width: `${row.max ? Math.round((row.value / row.max) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top articles */}
        <div className="panel-pad">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Clock size={15} className="text-ink-400" />
            Топ статей за месяц
          </h2>
          {!data?.top_articles.length ? (
            <div className="text-sm text-ink-500">Нет данных</div>
          ) : (
            <ol className="space-y-2">
              {data.top_articles.map((article, i) => (
                <li key={article.id} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-100 text-xs font-semibold text-ink-500">{i + 1}</span>
                  <Link to={`/kb/${article.id}`} className="min-w-0 flex-1 truncate text-sm text-brand-700 hover:underline">{article.title}</Link>
                  <span className="shrink-0 text-xs text-ink-500">{article.views} просм.</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
