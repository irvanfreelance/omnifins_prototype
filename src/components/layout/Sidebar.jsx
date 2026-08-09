import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Database,
  ClipboardList,
  PiggyBank,
  Wallet,
  CheckSquare,
  HandCoins,
  Send,
  FolderKanban,
  Users,
  Landmark,
  Scale,
  BookText,
  Lock,
  FileBarChart,
  Settings,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Sparkles,
  BookMarked,
  Boxes,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { ORG_NAME, getUserById, getUserRole, CURRENT_USER_ID } from '../../data'

export const NAV = [
  { type: 'item', label: 'Dashboard Dana & Program', to: '/', icon: LayoutDashboard },
  {
    type: 'group',
    label: 'Master Data',
    icon: Database,
    children: [
      { label: 'Chart of Account (COA)', to: '/master-data/coa' },
      { label: 'Cost Center', to: '/master-data/cost-center' },
      { label: 'Aset Tetap', to: '/master-data/aset' },
    ],
  },
  { type: 'item', label: 'Register Transaksi', to: '/register', icon: ClipboardList },
  { type: 'item', label: 'Anggaran Program (RAPB)', to: '/rapb', icon: PiggyBank },
  { type: 'item', label: 'Dana Operasional / CA', to: '/cash-advance', icon: Wallet },
  { type: 'item', label: 'Approval Center', to: '/approval', icon: CheckSquare },
  { type: 'item', label: 'Donasi & Penerimaan Dana', to: '/donasi', icon: HandCoins },
  { type: 'item', label: 'Distribusi & Pengeluaran', to: '/distribusi', icon: Send },
  { type: 'item', label: 'Program & Dana', to: '/program-dana', icon: FolderKanban },
  { type: 'item', label: 'Donatur & Mitra', to: '/kontak', icon: Users },
  { type: 'item', label: 'Kas & Bank', to: '/kas-bank', icon: Landmark },
  { type: 'item', label: 'Rekonsiliasi Bank', to: '/rekonsiliasi', icon: Scale },
  { type: 'item', label: 'Jurnal', to: '/jurnal', icon: BookText },
  { type: 'item', label: 'Tutup Buku', to: '/tutup-buku', icon: Lock },
  { type: 'item', label: 'Laporan Keuangan', to: '/laporan', icon: FileBarChart },
  { type: 'item', label: 'Setting Sistem', to: '/setting', icon: Settings },
  { type: 'item', label: 'Log Aktivitas', to: '/audit-trail', icon: ShieldCheck },
]

export function NavItem({ label, to, icon: Icon, indent, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          indent && 'pl-9',
          isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
        )
      }
    >
      {Icon && <Icon size={16} className="shrink-0" />}
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

export function NavGroup({ label, icon: Icon, children, defaultOpen, onNavigate }) {
  const [open, setOpen] = useState(defaultOpen ?? true)
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
      >
        <Icon size={16} className="shrink-0" />
        <span className="truncate flex-1 text-left">{label}</span>
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      {open && (
        <div className="mt-0.5 space-y-0.5">
          {children.map((c) => (
            <NavItem key={c.to} {...c} indent onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}

export function Sidebar() {
  const user = getUserById(CURRENT_USER_ID)
  const role = getUserRole(CURRENT_USER_ID)

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-4 h-16 border-b border-slate-100 shrink-0">
        <div className="h-9 w-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
          <Boxes size={18} />
        </div>
        <div className="leading-tight overflow-hidden">
          <p className="text-sm font-semibold text-slate-800 truncate">OmniFin</p>
          <p className="text-[11px] text-slate-400 truncate">{ORG_NAME}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV.map((entry) =>
          entry.type === 'group' ? (
            <NavGroup key={entry.label} {...entry} />
          ) : (
            <NavItem key={entry.to} {...entry} />
          )
        )}
      </nav>

      <div className="p-3 border-t border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <div
            className="h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
            style={{ backgroundColor: user.avatar_color }}
          >
            {user.full_name.split(' ').slice(0, 2).map((s) => s[0]).join('')}
          </div>
          <div className="leading-tight overflow-hidden flex-1">
            <p className="text-sm font-medium text-slate-800 truncate">{user.full_name}</p>
            <p className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
              <Sparkles size={11} /> {role.label}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
