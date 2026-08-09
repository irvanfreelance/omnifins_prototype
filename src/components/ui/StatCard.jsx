import { cn } from '../../lib/utils'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'

export function StatCard({ label, value, sub, icon: Icon, trend, trendLabel, tone = 'blue', className }) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-violet-50 text-violet-600',
    slate: 'bg-slate-100 text-slate-600',
  }
  const isUp = typeof trend === 'number' ? trend >= 0 : null

  return (
    <div className={cn('bg-white rounded-xl border border-slate-200/80 shadow-sm p-4', className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        {Icon && (
          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', tones[tone])}>
            <Icon size={16} />
          </div>
        )}
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-800 tabular tracking-tight">{value}</p>
      {(sub || trendLabel) && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          {isUp !== null && (
            <span className={cn('inline-flex items-center gap-0.5 font-medium', isUp ? 'text-emerald-600' : 'text-red-500')}>
              {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          <span className="text-slate-400">{trendLabel || sub}</span>
        </div>
      )}
    </div>
  )
}
