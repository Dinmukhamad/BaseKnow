import { BarChart2, BookOpen, Clock, PhoneCall, TrendingUp } from 'lucide-react'

export function StatsPage() {
  const cards = [
    { label: 'Обращения сегодня', value: '0', icon: <PhoneCall size={18} />, color: 'text-brand-700 bg-brand-50' },
    { label: 'Среднее время ответа', value: '--:--', icon: <Clock size={18} />, color: 'text-blue-700 bg-blue-50' },
    { label: 'Статей в работе', value: '0', icon: <BookOpen size={18} />, color: 'text-amber-700 bg-amber-50' },
    { label: 'SLA', value: '--%', icon: <TrendingUp size={18} />, color: 'text-green-700 bg-green-50' },
  ]

  return (
    <div className="page-shell">
      <header className="page-header">
        <div className="flex items-center gap-3">
          <div className="icon-tile">
            <BarChart2 size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-900">Статистика</h1>
            <p className="text-sm text-ink-500">Раздел подготовлен под метрики обращений, телефонии и SLA</p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="panel-pad">
            <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>{card.icon}</div>
            <div className="text-2xl font-semibold text-ink-900">{card.value}</div>
            <div className="mt-1 text-sm text-ink-500">{card.label}</div>
          </div>
        ))}
      </section>

      <section className="panel-pad mt-4">
        <h2 className="text-sm font-semibold text-ink-900">Следующий этап</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500">
          Здесь можно подключить реальные источники данных: телефонию, CRM, тикеты и AI-аналитику. UI уже подготовлен под компактные KPI и операционный мониторинг.
        </p>
      </section>
    </div>
  )
}
