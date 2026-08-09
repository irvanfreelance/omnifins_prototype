import { useMemo, useState } from 'react'
import { Check, X, MessageCircle, Clock, UserCog, History, ShieldAlert } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/StatCard'
import { Pills } from '../components/ui/Tabs'
import { Modal } from '../components/ui/Modal'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { FormField, Textarea } from '../components/ui/Field'
import { useScopedNodeIds } from '../lib/scope'
import { useLedgerStore } from '../store/useLedgerStore'
import { registers, getNodeById, getUserById, closingOverrideLog, approvalFlows } from '../data'
import { formatCurrency, formatDate, timeAgo } from '../lib/format'

const TYPE_LABEL = { donasi: 'Donasi', distribusi: 'Distribusi', jurnal_umum: 'Jurnal Umum', transfer: 'Transfer', ca_pencairan: 'CA Pencairan', pengeluaran: 'Pengeluaran' }
const LEVEL_LABEL = { 1: 'Level 1 — Manager', 2: 'Level 2 — Direktur/Ketua' }

export default function ApprovalPage() {
  const nodeIds = useScopedNodeIds()
  const version = useLedgerStore((s) => s.version)
  const approveRegister = useLedgerStore((s) => s.approveRegister)
  const rejectRegister = useLedgerStore((s) => s.rejectRegister)
  const approveCutoffOverride = useLedgerStore((s) => s.approveCutoffOverride)
  const rejectCutoffOverride = useLedgerStore((s) => s.rejectCutoffOverride)

  const [tab, setTab] = useState('pending')
  const [actionItem, setActionItem] = useState(null)
  const [actionType, setActionType] = useState(null)
  const [historyItem, setHistoryItem] = useState(null)
  const [comment, setComment] = useState('')
  const [actionError, setActionError] = useState(null)
  const [overrideError, setOverrideError] = useState(null)

  const rejectedRegisterIds = useMemo(() => new Set(approvalFlows.filter((f) => f.status === 'rejected').map((f) => f.register_id)), [version])

  const pending = useMemo(
    () => registers.filter((r) => nodeIds.includes(r.org_node_id) && ['submitted', 'approved'].includes(r.status) && r.status !== 'posted').sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at)),
    [nodeIds, version]
  )
  const decided = useMemo(
    () => registers.filter((r) => nodeIds.includes(r.org_node_id) && r.status === 'posted' && r.approved_by).sort((a, b) => new Date(b.approved_at) - new Date(a.approved_at)).slice(0, 30),
    [nodeIds, version]
  )
  const rejected = useMemo(
    () => registers.filter((r) => nodeIds.includes(r.org_node_id) && rejectedRegisterIds.has(r.id)),
    [nodeIds, rejectedRegisterIds]
  )
  const pendingOverrides = closingOverrideLog.filter((o) => nodeIds.includes(o.org_node_id) && o.status === 'pending')

  const list = tab === 'pending' ? pending : tab === 'decided' ? decided : rejected
  const totalPendingValue = pending.reduce((s, r) => s + r.total_amount, 0)
  const historyFlows = historyItem ? approvalFlows.filter((f) => f.register_id === historyItem.id).sort((a, b) => a.approval_level - b.approval_level) : []

  return (
    <div>
      <PageHeader title="Approval Center" description="Persetujuan transaksi berjenjang sesuai threshold nominal & tipe transaksi (FR-APR)" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Menunggu Persetujuan" value={pending.length} icon={Clock} tone="amber" sub={formatCurrency(totalPendingValue, { compact: true })} />
        <StatCard label="Override Cutoff Pending" value={pendingOverrides.length} icon={UserCog} tone="purple" sub="perlu keputusan Super Admin" />
        <StatCard label="Disetujui 30 Transaksi Terakhir" value={decided.length} tone="green" />
      </div>

      {pendingOverrides.length > 0 && (
        <Card className="mb-6 border-purple-200 bg-purple-50/40">
          <CardContent className="pt-5">
            <p className="text-sm font-semibold text-purple-800 mb-3">Permintaan Override Cutoff Tutup Buku</p>
            <ErrorBanner message={overrideError} />
            {pendingOverrides.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-3 bg-white rounded-lg border border-purple-100 p-3 text-sm mb-2 last:mb-0">
                <div>
                  <p className="font-medium text-slate-700">{getNodeById(o.org_node_id)?.name} — Periode {o.period_month}/{o.period_year}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Diajukan {getUserById(o.requested_by)?.full_name}: "{o.reason}"</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="secondary" onClick={() => { try { rejectCutoffOverride(o.id, { note: 'Ditolak oleh Super Admin' }); setOverrideError(null) } catch (e) { setOverrideError(e.message) } }}><X size={13} /> Tolak</Button>
                  <Button size="sm" variant="success" onClick={() => { try { approveCutoffOverride(o.id); setOverrideError(null) } catch (e) { setOverrideError(e.message) } }}><Check size={13} /> Setujui</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4">
            <Pills
              options={[
                { value: 'pending', label: `Menunggu (${pending.length})` },
                { value: 'decided', label: 'Riwayat Keputusan' },
                { value: 'rejected', label: `Ditolak (${rejected.length})` },
              ]}
              active={tab}
              onChange={setTab}
            />
          </div>
          <div className="space-y-2.5">
            {list.length === 0 && <p className="text-sm text-slate-400 py-10 text-center">Tidak ada data.</p>}
            {list.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 p-3.5 hover:bg-slate-50/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-blue-700">{r.register_no}</span>
                    <Badge variant="slate">{TYPE_LABEL[r.register_type] || r.register_type}</Badge>
                    <span className="text-xs text-slate-400">{getNodeById(r.org_node_id)?.short_code}</span>
                  </div>
                  <p className="text-sm text-slate-600 truncate">{r.description}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Diajukan {getUserById(r.created_by)?.full_name} · {timeAgo(r.submitted_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold tabular text-slate-800">{formatCurrency(r.total_amount)}</p>
                  {tab === 'decided' ? (
                    <StatusBadge status="posted" />
                  ) : tab === 'rejected' ? (
                    <StatusBadge status="rejected" />
                  ) : (
                    <StatusBadge status={r.status} />
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="ghost" title="Riwayat Approval" onClick={() => setHistoryItem(r)}><History size={13} /></Button>
                  {tab === 'pending' && (
                    <>
                      <Button size="sm" variant="ghost" title="WhatsApp Quick Reply"><MessageCircle size={14} className="text-emerald-500" /></Button>
                      <Button size="sm" variant="secondary" onClick={() => { setActionItem(r); setActionType('reject'); setComment(''); setActionError(null) }}><X size={13} /> Tolak</Button>
                      <Button size="sm" variant="success" onClick={() => { setActionItem(r); setActionType('approve'); setComment(''); setActionError(null) }}><Check size={13} /> Setuju</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Modal
        open={!!actionItem}
        onClose={() => setActionItem(null)}
        title={actionType === 'approve' ? 'Setujui Transaksi' : 'Tolak Transaksi'}
        description={actionItem?.register_no}
        footer={
          <>
            <Button variant="secondary" onClick={() => setActionItem(null)}>Batal</Button>
            <Button
              variant={actionType === 'approve' ? 'success' : 'danger'}
              onClick={() => {
                try {
                  if (actionType === 'approve') {
                    approveRegister(actionItem.id, { comment })
                  } else {
                    if (!comment.trim()) return setActionError('Alasan penolakan wajib diisi.')
                    rejectRegister(actionItem.id, { reason: comment })
                  }
                  setActionItem(null)
                } catch (e) {
                  setActionError(e.message)
                }
              }}
            >
              {actionType === 'approve' ? 'Konfirmasi Setuju' : 'Konfirmasi Tolak'}
            </Button>
          </>
        }
      >
        <ErrorBanner message={actionError} />
        <div className="rounded-lg bg-slate-50 p-3 text-sm mb-4">
          <p className="text-slate-600">{actionItem?.description}</p>
          <p className="font-semibold tabular mt-1">{actionItem && formatCurrency(actionItem.total_amount)}</p>
          {actionItem?.total_amount > 10_000_000 && (
            <p className="text-[11px] text-amber-600 mt-1.5">Nominal &gt; Rp 10.000.000 — memerlukan approval berjenjang Level 2 (Direktur/Ketua) setelah ini.</p>
          )}
        </div>
        <FormField label={actionType === 'approve' ? 'Komentar (opsional)' : 'Alasan Penolakan'} required={actionType === 'reject'}>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={actionType === 'approve' ? 'Tambahkan catatan untuk pengajuan ini...' : 'Jelaskan alasan penolakan...'} />
        </FormField>
      </Modal>

      <Modal open={!!historyItem} onClose={() => setHistoryItem(null)} title="Riwayat Approval Berjenjang" description={historyItem?.register_no} size="md">
        {historyItem && (
          <div className="space-y-3">
            {historyFlows.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">Belum ada riwayat approval untuk register ini.</p>}
            {historyFlows.map((f) => (
              <div key={f.id} className="rounded-lg border border-slate-100 p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    {f.approval_level === 2 && <ShieldAlert size={13} className="text-purple-500" />}
                    {LEVEL_LABEL[f.approval_level]}
                  </span>
                  <StatusBadge status={f.status} />
                </div>
                <p className="text-sm text-slate-700 font-medium">{getUserById(f.approver_id)?.full_name}</p>
                {f.notes && <p className="text-xs text-slate-500 mt-1 italic">"{f.notes}"</p>}
                <p className="text-[11px] text-slate-400 mt-1.5">
                  {f.status === 'pending' ? `Diajukan ${timeAgo(f.created_at)}` : `Direspons ${f.responded_at ? formatDate(f.responded_at, { withTime: true }) : '—'}`}
                </p>
              </div>
            ))}
            {historyItem.total_amount > 10_000_000 && historyFlows.length === 1 && (
              <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2">Nominal &gt; Rp 10.000.000 — menunggu eskalasi ke Level 2 (Direktur/Ketua) setelah Level 1 disetujui.</p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
