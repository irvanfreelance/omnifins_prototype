import { Menu, Search } from 'lucide-react'
import { ScopeSwitcher } from './ScopeSwitcher'
import { NotificationBell } from './NotificationBell'
import { TODAY } from '../../data'
import { formatDate } from '../../lib/format'

export function Topbar({ onOpenMobileNav }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/80 backdrop-blur px-4 lg:px-6">
      <button onClick={onOpenMobileNav} className="lg:hidden h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">
        <Menu size={18} />
      </button>

      <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-medium">
        <span>{formatDate(TODAY.toISOString())}</span>
      </div>

      <button
        onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
        className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 h-9 text-sm text-slate-400 ml-2 flex-1 max-w-xs hover:bg-slate-100 transition-colors"
      >
        <Search size={14} />
        <span className="truncate">Cari transaksi, donatur...</span>
        <kbd className="ml-auto text-[10px] rounded border border-slate-300 bg-white px-1.5 py-0.5 text-slate-400">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <ScopeSwitcher />
        <NotificationBell />
      </div>
    </header>
  )
}
