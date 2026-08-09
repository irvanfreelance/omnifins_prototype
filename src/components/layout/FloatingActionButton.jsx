import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, HandCoins, Send, Wallet, BookText, ClipboardList } from 'lucide-react'
import { cn } from '../../lib/utils'

const ACTIONS = [
  { label: 'Input Donasi', to: '/donasi', icon: HandCoins },
  { label: 'Input Distribusi', to: '/distribusi', icon: Send },
  { label: 'Ajukan Cash Advance', to: '/cash-advance', icon: Wallet },
  { label: 'Jurnal Umum', to: '/jurnal', icon: BookText },
  { label: 'Buat Register', to: '/register', icon: ClipboardList },
]

export function FloatingActionButton() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2.5">
      {open && (
        <div className="flex flex-col items-end gap-2 animate-slide-up">
          {ACTIONS.map((a) => (
            <button
              key={a.to}
              onClick={() => { navigate(a.to); setOpen(false) }}
              className="flex items-center gap-2.5 rounded-full bg-white pl-4 pr-1.5 py-1.5 shadow-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {a.label}
              <span className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <a.icon size={15} />
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 flex items-center justify-center transition-transform hover:bg-blue-700',
          open && 'rotate-45'
        )}
        title="Transaksi Baru"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
