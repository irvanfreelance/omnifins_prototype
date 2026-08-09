import { cn } from '../../lib/utils'

const baseInput =
  'w-full h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-colors disabled:bg-slate-50 disabled:text-slate-400'

export function Label({ className, required, children, ...props }) {
  return (
    <label className={cn('block text-xs font-medium text-slate-600 mb-1.5', className)} {...props}>
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

export function Input({ className, ...props }) {
  return <input className={cn(baseInput, className)} {...props} />
}

export function Textarea({ className, rows = 3, ...props }) {
  return <textarea rows={rows} className={cn(baseInput, 'h-auto py-2 resize-none', className)} {...props} />
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn(baseInput, 'appearance-none bg-no-repeat pr-8', className)} {...props}>
      {children}
    </select>
  )
}

export function FormField({ label, required, hint, error, className, children }) {
  return (
    <div className={className}>
      {label && <Label required={required}>{label}</Label>}
      {children}
      {hint && !error && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  )
}

export function FormGrid({ className, children }) {
  return <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-4', className)}>{children}</div>
}
