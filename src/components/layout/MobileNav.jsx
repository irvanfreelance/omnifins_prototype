import { createPortal } from 'react-dom'
import { X, Boxes } from 'lucide-react'
import { NAV, NavItem, NavGroup } from './Sidebar'
import { ORG_NAME } from '../../data'

export function MobileNav({ open, onClose }) {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-72 bg-white flex flex-col animate-slide-up">
        <div className="flex items-center gap-2.5 px-4 h-16 border-b border-slate-100 shrink-0">
          <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
            <Boxes size={18} />
          </div>
          <div className="leading-tight overflow-hidden flex-1">
            <p className="text-sm font-semibold text-slate-800 truncate">OmniFin</p>
            <p className="text-[11px] text-slate-400 truncate">{ORG_NAME}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={16} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {NAV.map((entry) =>
            entry.type === 'group' ? (
              <NavGroup key={entry.label} {...entry} onNavigate={onClose} />
            ) : (
              <NavItem key={entry.to} {...entry} onNavigate={onClose} />
            )
          )}
        </nav>
      </div>
    </div>,
    document.body
  )
}
