import { useEffect, useRef, useState } from 'react'
import { ChevronDown, MapPin, Layers, Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import { orgNodes, getChildNodeIds } from '../../data/orgNodes'
import { useScopeStore } from '../../store/useScopeStore'

const LEVEL_LABEL = { pusat: 'Pusat', wilayah: 'Wilayah', daerah: 'Daerah', area: 'Area', cabang: 'Cabang' }
const LEVEL_INDENT = { pusat: 0, wilayah: 1, area: 2, daerah: 2, cabang: 3 }

export function ScopeSwitcher() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { nodeId, consolidated, setScope } = useScopeStore()
  const node = orgNodes.find((n) => n.id === nodeId)
  const childCount = getChildNodeIds(nodeId, false).length

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 h-9 text-sm hover:bg-slate-50 transition-colors"
      >
        <MapPin size={14} className="text-blue-600" />
        <span className="font-medium text-slate-700 max-w-[180px] truncate">{node?.name}</span>
        {consolidated && childCount > 0 && (
          <span className="rounded-full bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 font-medium">Konsolidasi</span>
        )}
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-80 rounded-xl border border-slate-200 bg-white shadow-lg animate-fade-in overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-600">Scope Switcher</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Pilih node organisasi & mode tampilan data</p>
          </div>
          <div className="max-h-72 overflow-y-auto py-1.5">
            {orgNodes.map((n) => {
              const indent = LEVEL_INDENT[n.org_level] || 0
              const isActive = n.id === nodeId
              return (
                <button
                  key={n.id}
                  onClick={() => setScope(n.id, consolidated)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3.5 py-1.5 text-left text-sm hover:bg-slate-50 transition-colors',
                    isActive && 'bg-blue-50'
                  )}
                  style={{ paddingLeft: `${14 + indent * 16}px` }}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      n.org_level === 'pusat' ? 'bg-blue-600' : n.org_level === 'wilayah' ? 'bg-violet-500' : 'bg-slate-400'
                    )}
                  />
                  <span className={cn('flex-1 truncate', isActive ? 'font-medium text-blue-700' : 'text-slate-600')}>{n.name}</span>
                  <span className="text-[10px] text-slate-400">{LEVEL_LABEL[n.org_level]}</span>
                  {isActive && <Check size={13} className="text-blue-600" />}
                </button>
              )
            })}
          </div>
          <div className="border-t border-slate-100 p-3">
            <label className={cn('flex items-center justify-between gap-2 text-sm', childCount === 0 && 'opacity-40')}>
              <span className="flex items-center gap-2 text-slate-600">
                <Layers size={14} />
                Konsolidasi node di bawahnya
              </span>
              <input
                type="checkbox"
                disabled={childCount === 0}
                checked={consolidated}
                onChange={(e) => setScope(nodeId, e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600"
              />
            </label>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              {childCount > 0
                ? consolidated
                  ? `Menampilkan data gabungan ${node?.name} + ${childCount} node di bawahnya (eliminasi transfer antar-node otomatis).`
                  : `Hanya menampilkan data milik ${node?.name} sendiri.`
                : 'Node ini tidak memiliki node turunan.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
