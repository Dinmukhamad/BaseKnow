import { BarChart2 } from 'lucide-react'

export function StatsPage() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <BarChart2 className="text-brand-600" size={22} />
        <h1 className="text-xl font-semibold text-surface-900">Статистика</h1>
      </div>
      <div className="rounded-lg border border-surface-200 bg-white p-6 text-sm text-slate-600">
        Раздел подготовлен под подключение метрик обращений, телефонии и SLA.
      </div>
    </div>
  )
}
