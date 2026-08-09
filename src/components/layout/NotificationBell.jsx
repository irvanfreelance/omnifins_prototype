import { useEffect, useRef, useState } from 'react'
import { Bell, MessageCircle, Mail, Smartphone, AppWindow } from 'lucide-react'
import { cn } from '../../lib/utils'
import { notifications } from '../../data'
import { timeAgo } from '../../lib/format'

const CHANNEL_ICON = { whatsapp: MessageCircle, email: Mail, push: Smartphone, in_app: AppWindow }

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const sorted = [...notifications].sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at))
  const unread = sorted.filter((n) => !n.is_read).length

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
        className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-96 rounded-xl border border-slate-200 bg-white shadow-lg animate-fade-in overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Notifikasi</p>
            <span className="text-xs text-slate-400">{unread} belum dibaca</span>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-50">
            {sorted.slice(0, 12).map((n) => {
              const Icon = CHANNEL_ICON[n.channel] || AppWindow
              return (
                <div key={n.id} className={cn('flex gap-3 px-4 py-3 hover:bg-slate-50', !n.is_read && 'bg-blue-50/40')}>
                  <div
                    className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                      n.is_read ? 'bg-slate-100 text-slate-400' : 'bg-blue-100 text-blue-600'
                    )}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className={cn('text-sm', !n.is_read ? 'font-semibold text-slate-800' : 'font-medium text-slate-600')}>{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.sent_at)}</p>
                  </div>
                  {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
