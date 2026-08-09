import { cn } from '../../lib/utils'

export function Tabs({ tabs, active, onChange, className }) {
  return (
    <div className={cn('flex items-center gap-1 border-b border-slate-200 overflow-x-auto', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
            active === tab.value ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {tab.label}
          {tab.count != null && (
            <span
              className={cn(
                'ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]',
                active === tab.value ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
              )}
            >
              {tab.count}
            </span>
          )}
          {active === tab.value && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-blue-600 rounded-full" />}
        </button>
      ))}
    </div>
  )
}

export function Pills({ options, active, onChange, className }) {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
            active === opt.value ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
