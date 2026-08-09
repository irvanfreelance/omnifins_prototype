import { cn } from '../../lib/utils'

const variants = {
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-700',
  purple: 'bg-violet-50 text-violet-700',
  pink: 'bg-pink-50 text-pink-700',
  cyan: 'bg-cyan-50 text-cyan-700',
}

const dotColors = {
  slate: 'bg-slate-400',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  red: 'bg-red-500',
  amber: 'bg-amber-500',
  purple: 'bg-violet-500',
  pink: 'bg-pink-500',
  cyan: 'bg-cyan-500',
}

export function Badge({ children, variant = 'slate', dot = false, className }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium whitespace-nowrap',
        variants[variant],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotColors[variant])} />}
      {children}
    </span>
  )
}

const STATUS_MAP = {
  draft: { label: 'Draft', variant: 'slate' },
  submitted: { label: 'Diajukan', variant: 'amber' },
  approved: { label: 'Disetujui', variant: 'blue' },
  posted: { label: 'Terposting', variant: 'green' },
  reversed: { label: 'Dibalik', variant: 'purple' },
  cancelled: { label: 'Dibatalkan', variant: 'red' },
  disbursed: { label: 'Dicairkan', variant: 'cyan' },
  ljp_submitted: { label: 'LPJ Diajukan', variant: 'amber' },
  settled: { label: 'Selesai', variant: 'green' },
  pending: { label: 'Menunggu', variant: 'amber' },
  rejected: { label: 'Ditolak', variant: 'red' },
  escalated: { label: 'Eskalasi', variant: 'purple' },
  matched: { label: 'Matched', variant: 'green' },
  unmatched: { label: 'Unmatched', variant: 'amber' },
  excluded: { label: 'Dikecualikan', variant: 'slate' },
  manual: { label: 'Manual', variant: 'blue' },
  active: { label: 'Aktif', variant: 'green' },
  closed: { label: 'Ditutup', variant: 'slate' },
  open: { label: 'Terbuka', variant: 'blue' },
  closing: { label: 'Proses Closing', variant: 'amber' },
  reopened: { label: 'Dibuka Ulang', variant: 'purple' },
}

export function StatusBadge({ status, className }) {
  const cfg = STATUS_MAP[status] || { label: status, variant: 'slate' }
  return (
    <Badge variant={cfg.variant} dot className={className}>
      {cfg.label}
    </Badge>
  )
}
