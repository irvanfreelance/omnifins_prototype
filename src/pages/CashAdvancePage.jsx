import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { Plus, Eye, Receipt, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatCard } from '../components/ui/StatCard'
import { StatusBadge, Badge } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { Modal } from '../components/ui/Modal'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { FormField, FormGrid, Input, Select, Textarea } from '../components/ui/Field'
import { useScopedNodeIds } from '../lib/scope'
import { useScopeStore } from '../store/useScopeStore'
import { useLedgerStore } from '../store/useLedgerStore'
import { cashAdvances, caItems, costCenters, coa, getUserById, getNodeById, orgNodes, PRODUCING_NODE_IDS, CURRENT_USER_ID, TODAY, TODAY_Y, TODAY_M, TODAY_D } from '../data'
import { formatCurrency, formatDate } from '../lib/format'
import { CHART_INK, STATUS } from '../lib/chartColors'
import { Wallet, Clock } from 'lucide-react'

const todayStr = `${TODAY_Y}-${String(TODAY_M).padStart(2, '0')}-${String(TODAY_D).padStart(2, '0')}`
const producingNodes = orgNodes.filter((n) => PRODUCING_NODE_IDS.includes(n.id))
const expenseLeaves = coa.filter((c) => !c.is_group && c.account_type === 'expense')

function emptyForm(defaultNodeId) {
  return { nodeId: defaultNodeId, purpose: '', amount: '', needDate: todayStr, costCenterId: 2 }
}
function emptyItem() {
  return { coa_id: '', description: '', amount: '' }
}

function agingBucket(days) {
  if (days === 0) return 'Current'
  if (days <= 7) return '1-7 hari'
  if (days <= 14) return '8-14 hari'
  if (days <= 30) return '15-30 hari'
  return '>30 hari'
}
const BUCKET_ORDER = ['Current', '1-7 hari', '8-14 hari', '15-30 hari', '>30 hari']

export default function CashAdvancePage() {
  const nodeIds = useScopedNodeIds()
  const scopeNodeId = useScopeStore((s) => s.nodeId)
  const version = useLedgerStore((s) => s.version)
  const createCashAdvance = useLedgerStore((s) => s.createCashAdvance)
  const settleCashAdvance = useLedgerStore((s) => s.settleCashAdvance)
  const defaultNodeId = PRODUCING_NODE_IDS.includes(scopeNodeId) ? scopeNodeId : PRODUCING_NODE_IDS[0]
  const [addOpen, setAddOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [lpjOpen, setLpjOpen] = useState(null)
  const [form, setForm] = useState(emptyForm(defaultNodeId))
  const [error, setError] = useState(null)
  const [lpjItems, setLpjItems] = useState([emptyItem()])
  const [lpjError, setLpjError] = useState(null)

  const scoped = useMemo(
    () =>
      cashAdvances
        .filter((c) => nodeIds.includes(c.org_node_id))
        .map((c) => ({ ...c, overdueDays: c.status === 'settled' || c.status === 'cancelled' ? 0 : Math.max(0, Math.floor((TODAY - new Date(c.need_date)) / 86400000)) }))
        .sort((a, b) => new Date(b.need_date) - new Date(a.need_date)),
    [nodeIds, version]
  )

  const outstanding = scoped.filter((c) => !['settled', 'cancelled'].includes(c.status))
  const totalOutstanding = outstanding.reduce((s, c) => s + (c.amount_disbursed || c.amount_requested), 0)
  const totalOverdue = outstanding.filter((c) => c.overdueDays > 0).reduce((s, c) => s + (c.amount_disbursed || c.amount_requested), 0)

  const agingData = useMemo(() => {
    const buckets = Object.fromEntries(BUCKET_ORDER.map((b) => [b, 0]))
    for (const c of outstanding) buckets[agingBucket(c.overdueDays)] += c.amount_disbursed || c.amount_requested
    return BUCKET_ORDER.map((name) => ({ name, value: buckets[name] }))
  }, [outstanding])

  const columns = [
    { header: 'No. CA', cell: (r) => <span className="font-mono text-xs text-blue-700">{r.ca_no}</span> },
    { header: 'Pemohon', cell: (r) => getUserById(r.requested_by)?.full_name },
    { header: 'Tujuan', cell: (r) => <span className="truncate max-w-[200px] block">{r.purpose}</span> },
    { header: 'Node', cell: (r) => <span className="text-xs text-slate-400">{getNodeById(r.org_node_id)?.short_code}</span> },
    { header: 'Diajukan', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular">{formatCurrency(r.amount_requested)}</span> },
    { header: 'Realisasi', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular text-slate-500">{r.amount_realized ? formatCurrency(r.amount_realized) : '—'}</span> },
    {
      header: 'Aging',
      cell: (r) => (r.overdueDays > 0 ? <Badge variant="red">{r.overdueDays} hari</Badge> : <Badge variant="slate">Current</Badge>),
    },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    {
      header: '',
      className: 'text-right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          {r.status === 'disbursed' && (
            <Button size="sm" variant="secondary" onClick={() => { setLpjOpen(r); setLpjItems([emptyItem()]); setLpjError(null) }}>
              <Receipt size={12} /> LPJ
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setDetail(r)}><Eye size={13} /></Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Dana Operasional / Cash Advance"
        description="Pengajuan, pencairan, dan LPJ dana operasional — CA Aging Report otomatis"
        actions={<Button onClick={() => { setForm(emptyForm(defaultNodeId)); setError(null); setAddOpen(true) }}><Plus size={15} /> Ajukan CA</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="CA Outstanding" value={formatCurrency(totalOutstanding, { compact: true })} icon={Wallet} tone="blue" sub={`${outstanding.length} CA belum settled`} />
        <StatCard label="CA Lewat Jatuh Tempo" value={formatCurrency(totalOverdue, { compact: true })} icon={Clock} tone="red" sub={`${outstanding.filter((c) => c.overdueDays > 0).length} CA menunggak`} />
        <StatCard label="Total CA (semua waktu)" value={scoped.length} tone="slate" sub="pengajuan tercatat" />
        <StatCard label="CA Settled" value={scoped.filter((c) => c.status === 'settled').length} tone="green" sub="LPJ selesai & disetujui" />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div>
            <CardTitle>CA Aging Report</CardTitle>
            <CardDescription>Distribusi CA outstanding berdasarkan umur tunggakan</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={agingData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={65} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="value" name="Outstanding" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {agingData.map((d, i) => (
                  <Cell key={i} fill={d.name === 'Current' ? STATUS.good : d.name === '>30 hari' ? STATUS.critical : d.name === '15-30 hari' ? STATUS.serious : STATUS.warning} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <DataTable columns={columns} data={scoped} searchKeys={['ca_no', 'purpose']} searchPlaceholder="Cari no. CA / tujuan..." pageSize={10} />
        </CardContent>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Ajukan Cash Advance"
        footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Batal</Button><Button onClick={() => {
          if (!form.purpose.trim()) return setError('Tujuan penggunaan wajib diisi.')
          if (!form.amount || Number(form.amount) <= 0) return setError('Nominal harus lebih dari 0.')
          try {
            createCashAdvance({ nodeId: form.nodeId, requestedBy: CURRENT_USER_ID, purpose: form.purpose, amount: Number(form.amount), needDate: form.needDate, costCenterId: Number(form.costCenterId) })
            setAddOpen(false)
            setForm(emptyForm(defaultNodeId))
            setError(null)
          } catch (e) { setError(e.message) }
        }}>Ajukan</Button></>}
      >
        <ErrorBanner message={error} />
        <FormGrid>
          <FormField label="Node / Cabang" required>
            <Select value={form.nodeId} onChange={(e) => setForm((f) => ({ ...f, nodeId: Number(e.target.value) }))}>
              {producingNodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Tujuan Penggunaan" required className="sm:col-span-2"><Input placeholder="cth. Operasional sosialisasi ZIS" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} /></FormField>
          <FormField label="Nominal" required><Input type="number" placeholder="Rp" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></FormField>
          <FormField label="Tanggal Dibutuhkan" required><Input type="date" value={form.needDate} onChange={(e) => setForm((f) => ({ ...f, needDate: e.target.value }))} /></FormField>
          <FormField label="Cost Center">
            <Select value={form.costCenterId} onChange={(e) => setForm((f) => ({ ...f, costCenterId: e.target.value }))}>
              {costCenters.map((cc) => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
            </Select>
          </FormField>
        </FormGrid>
        <p className="text-[11px] text-slate-400 mt-3">Sistem akan otomatis mengecek sisa budget terkait sebelum diteruskan ke approver (FR-CA-02).</p>
      </Modal>

      <Modal open={!!lpjOpen} onClose={() => setLpjOpen(null)} title={`LPJ — ${lpjOpen?.ca_no}`} description="Upload struk via AI OCR, sistem otomatis mengekstrak nominal" size="lg"
        footer={<><Button variant="secondary" onClick={() => setLpjOpen(null)}>Batal</Button><Button onClick={() => {
          const items = lpjItems.filter((it) => it.coa_id && Number(it.amount) > 0)
          if (!items.length) return setLpjError('Rincian LPJ tidak boleh kosong.')
          try {
            settleCashAdvance(lpjOpen.id, { items: items.map((it) => ({ coa_id: Number(it.coa_id), description: it.description || 'Realisasi CA', amount: Number(it.amount) })) })
            setLpjOpen(null)
          } catch (e) { setLpjError(e.message) }
        }}>Ajukan LPJ</Button></>}
      >
        {lpjOpen && (
          <div className="space-y-4">
            <ErrorBanner message={lpjError} />
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-sm text-blue-700">Dana dicairkan: <strong>{formatCurrency(lpjOpen.amount_disbursed)}</strong></div>
            <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-6 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 cursor-pointer transition-colors">
              <Receipt size={16} /> Unggah Struk / Bukti Pengeluaran (AI OCR — simulasi)
            </div>
            <div className="space-y-2">
              {lpjItems.map((it, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_120px_28px] gap-2 items-center">
                  <Select value={it.coa_id} onChange={(e) => setLpjItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, coa_id: e.target.value } : x)))}>
                    <option value="">— Akun Biaya —</option>
                    {expenseLeaves.map((c) => <option key={c.id} value={c.id}>{c.account_name}</option>)}
                  </Select>
                  <Input placeholder="Deskripsi item" value={it.description} onChange={(e) => setLpjItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, description: e.target.value } : x)))} />
                  <Input type="number" placeholder="Rp" value={it.amount} onChange={(e) => setLpjItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, amount: e.target.value } : x)))} />
                  <button onClick={() => setLpjItems((prev) => prev.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setLpjItems((prev) => [...prev, emptyItem()])} className="text-xs font-medium text-blue-600 hover:text-blue-700">+ Tambah Item</button>
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
              <span className="text-slate-500">Total Realisasi</span>
              <strong className="tabular">{formatCurrency(lpjItems.reduce((s, it) => s + (Number(it.amount) || 0), 0))}</strong>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.ca_no} description={detail?.purpose} size="lg">
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><p className="text-xs text-slate-400 mb-0.5">Diajukan</p><p className="font-medium tabular">{formatCurrency(detail.amount_requested)}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Dicairkan</p><p className="font-medium tabular">{formatCurrency(detail.amount_disbursed)}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Realisasi</p><p className="font-medium tabular">{formatCurrency(detail.amount_realized)}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Dikembalikan</p><p className="font-medium tabular">{formatCurrency(detail.amount_returned)}</p></div>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Rincian LPJ</p>
              <div className="rounded-lg border border-slate-100 divide-y divide-slate-50">
                {caItems.filter((it) => it.ca_id === detail.id).map((it) => (
                  <div key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-slate-600">{it.description}</span>
                    <span className="font-medium tabular">{formatCurrency(it.amount)}</span>
                  </div>
                ))}
                {caItems.filter((it) => it.ca_id === detail.id).length === 0 && (
                  <p className="text-sm text-slate-400 px-3 py-4 text-center">Belum ada rincian LPJ.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
