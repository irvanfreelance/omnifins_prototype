import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft } from 'lucide-react'
import { NAV } from './Sidebar'
import { cn } from '../../lib/utils'

function flattenActions() {
  const actions = []
  for (const entry of NAV) {
    if (entry.type === 'group') {
      for (const child of entry.children) {
        actions.push({ label: child.label, to: child.to, group: entry.label, icon: entry.icon })
      }
    } else {
      actions.push({ label: entry.label, to: entry.to, group: 'Menu', icon: entry.icon })
    }
  }
  return actions
}

const QUICK_ACTIONS = [
  { label: 'Buat Jurnal Umum', to: '/jurnal', group: 'Aksi Cepat' },
  { label: 'Input Donasi', to: '/donasi', group: 'Aksi Cepat' },
  { label: 'Input Distribusi', to: '/distribusi', group: 'Aksi Cepat' },
  { label: 'Ajukan Cash Advance', to: '/cash-advance', group: 'Aksi Cepat' },
  { label: 'Buat Register', to: '/register', group: 'Aksi Cepat' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const allActions = useMemo(() => [...QUICK_ACTIONS, ...flattenActions()], [])
  const filtered = useMemo(() => {
    if (!query.trim()) return allActions
    const q = query.toLowerCase()
    return allActions.filter((a) => a.label.toLowerCase().includes(q))
  }, [query, allActions])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    const openHandler = () => setOpen(true)
    document.addEventListener('keydown', handler)
    window.addEventListener('open-command-palette', openHandler)
    return () => {
      document.removeEventListener('keydown', handler)
      window.removeEventListener('open-command-palette', openHandler)
    }
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 10)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => setActiveIndex(0), [query])

  const go = (action) => {
    if (!action) return
    navigate(action.to)
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(filtered.length - 1, i + 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(0, i - 1)) }
    if (e.key === 'Enter') { e.preventDefault(); go(filtered[activeIndex]) }
  }

  if (!open) return null

  const grouped = filtered.reduce((acc, a) => {
    ;(acc[a.group] ||= []).push(a)
    return acc
  }, {})

  let flatIndex = -1

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-24 px-4">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] animate-fade-in" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden animate-slide-up">
        <div className="flex items-center gap-2.5 px-4 h-12 border-b border-slate-100">
          <Search size={16} className="text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder='Ketik untuk navigasi cepat, cth. "Buat Jurnal"...'
            className="flex-1 h-full text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="text-[10px] rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-slate-400">ESC</kbd>
        </div>
        <div className="max-h-96 overflow-y-auto py-2">
          {filtered.length === 0 && <p className="px-4 py-8 text-center text-sm text-slate-400">Tidak ditemukan.</p>}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="mb-1.5 last:mb-0">
              <p className="px-4 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{group}</p>
              {items.map((item) => {
                flatIndex += 1
                const isActive = flatIndex === activeIndex
                return (
                  <button
                    key={`${group}-${item.to}`}
                    onMouseEnter={() => setActiveIndex(flatIndex)}
                    onClick={() => go(item)}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors',
                      isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {item.icon && <item.icon size={14} className="shrink-0" />}
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && <CornerDownLeft size={13} className="text-blue-400" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
