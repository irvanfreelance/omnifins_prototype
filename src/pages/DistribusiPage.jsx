import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts'
import { Plus, FileText, Eye } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { StatCard } from '../components/ui/StatCard'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { Modal } from '../components/ui/Modal'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { FormField, FormGrid, Input, Select, Textarea } from '../components/ui/Field'
import { useScopedNodeIds } from '../lib/scope'
import { useScopeStore } from '../store/useScopeStore'
import { useLedgerStore } from '../store/useLedgerStore'
import { distributions, programs, getProgramById, getFundById, getContactById, ASNAF_LABEL, contacts, orgNodes, PRODUCING_NODE_IDS, getFundLedgerSnapshot, TODAY_Y, TODAY_M, TODAY_D } from '../data'
import { formatCurrency, formatDate } from '../lib/format'
import { CATEGORICAL, CHART_INK } from '../lib/chartColors'
import { Send, Package, Users2 } from 'lucide-react'

const DIST_TYPE_LABEL = { cash: 'Tunai', transfer: 'Transfer', natura: 'Natura', voucher: 'Voucher' }
const todayStr = `${TODAY_Y}-${String(TODAY_M).padStart(2, '0')}-${String(TODAY_D).padStart(2, '0')}`
const producingNodes = orgNodes.filter((n) => PRODUCING_NODE_IDS.includes(n.id))

function emptyForm(defaultNodeId) {
  return { nodeId: defaultNodeId, programId: '', recipientId: '', amount: '', distType: 'transfer', date: todayStr, naturaDesc: '' }
}

export default function DistribusiPage() {
  const nodeIds = useScopedNodeIds()
  const scopeNodeId = useScopeStore((s) => s.nodeId)
  const version = useLedgerStore((s) => s.version)
  const createDistribution = useLedgerStore((s) => s.createDistribution)
  const defaultNodeId = PRODUCING_NODE_IDS.includes(scopeNodeId) ? scopeNodeId : PRODUCING_NODE_IDS[0]
  const [addOpen, setAddOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(emptyForm(defaultNodeId))
  const [error, setError] = useState(null)

  const scoped = useMemo(() => distributions.filter((d) => nodeIds.includes(d.org_node_id)).sort((a, b) => new Date(b.dist_date) - new Date(a.dist_date)), [nodeIds, version])
  const fundBalances = getFundLedgerSnapshot()
  const selectedProgram = form.programId ? getProgramById(Number(form.programId)) : null
  const selectedFund = selectedProgram ? getFundById(selectedProgram.fund_id) : null
  const monthKey = `${TODAY_Y}-${String(TODAY_M).padStart(2, '0')}`
  const mtd = scoped.filter((d) => d.status === 'posted' && d.dist_date.startsWith(monthKey))
  const totalMTD = mtd.reduce((s, d) => s + d.amount, 0)
  const natura = mtd.filter((d) => d.dist_type === 'natura').length
  const uniqueRecipients = new Set(scoped.map((d) => d.recipient_id)).size

  const asnafData = useMemo(() => {
    const map = new Map()
    for (const d of scoped.filter((d) => d.status === 'posted')) map.set(d.asnaf_category, (map.get(d.asnaf_category) || 0) + d.amount)
    return Array.from(map.entries()).map(([k, v]) => ({ name: ASNAF_LABEL[k] || k, value: v }))
  }, [scoped])

  const programData = useMemo(() => {
    const map = new Map()
    for (const d of scoped.filter((d) => d.status === 'posted')) map.set(d.program_id, (map.get(d.program_id) || 0) + d.amount)
    return Array.from(map.entries()).map(([id, v]) => ({ name: getProgramById(id)?.program_name.slice(0, 18) || '—', value: v })).sort((a, b) => b.value - a.value).slice(0, 8)
  }, [scoped])

  const columns = [
    { header: 'Tanggal', cell: (r) => formatDate(r.dist_date) },
    { header: 'Penerima', cell: (r) => <span className="font-medium text-slate-700">{getContactById(r.recipient_id)?.name}</span> },
    { header: 'Asnaf', cell: (r) => <Badge variant="cyan">{ASNAF_LABEL[r.asnaf_category] || r.asnaf_category}</Badge> },
    { header: 'Program', cell: (r) => <span className="truncate max-w-[160px] block">{getProgramById(r.program_id)?.program_name}</span> },
    { header: 'Tipe', cell: (r) => DIST_TYPE_LABEL[r.dist_type] },
    { header: 'Nominal', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular font-medium">{formatCurrency(r.amount)}</span> },
    { header: 'SK No.', cell: (r) => <span className="font-mono text-[11px] text-slate-400">{r.sk_no}</span> },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { header: '', className: 'text-right', cell: (r) => <Button size="sm" variant="ghost" onClick={() => setDetail(r)}><Eye size={13} /></Button> },
  ]

  return (
    <div>
      <PageHeader
        title="Distribusi & Pengeluaran"
        description="Penyaluran dana ke mustahiq per program & asnaf — Surat Keputusan & Berita Acara otomatis"
        actions={<Button onClick={() => { setForm(emptyForm(defaultNodeId)); setError(null); setAddOpen(true) }}><Plus size={15} /> Input Distribusi</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Distribusi Bulan Ini" value={formatCurrency(totalMTD, { compact: true })} icon={Send} tone="amber" sub={`${mtd.length} transaksi`} />
        <StatCard label="Distribusi Natura" value={natura} icon={Package} tone="purple" sub="transaksi bulan ini" />
        <StatCard label="Penerima Unik" value={uniqueRecipients} icon={Users2} tone="blue" sub="sepanjang periode tercatat" />
        <StatCard label="Total Transaksi" value={scoped.length} tone="slate" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><div><CardTitle>Distribusi per Asnaf</CardTitle><CardDescription>Kumulatif seluruh periode, sesuai format BAZNAS/LAZ</CardDescription></div></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={asnafData} dataKey="value" nameKey="name" innerRadius={0} outerRadius={95} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: 10 }}>
                  {asnafData.map((_, i) => <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} stroke="#fff" strokeWidth={1} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Distribusi per Program</CardTitle><CardDescription>Top 8 program berdasarkan total penyaluran</CardDescription></div></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={programData} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: CHART_INK.secondary }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="value" fill={CATEGORICAL[1]} radius={[0, 4, 4, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <DataTable columns={columns} data={scoped} searchKeys={[(r) => getContactById(r.recipient_id)?.name, 'sk_no']} searchPlaceholder="Cari penerima / SK..." pageSize={10} />
        </CardContent>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Input Distribusi / Penyaluran Dana"
        size="lg"
        footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Batal</Button><Button onClick={() => {
          if (!form.programId) return setError('Program wajib dipilih.')
          if (!form.recipientId) return setError('Penerima wajib dipilih.')
          if (!form.amount || Number(form.amount) <= 0) return setError('Nominal harus lebih dari 0.')
          try {
            createDistribution({ nodeId: form.nodeId, programId: Number(form.programId), recipientId: Number(form.recipientId), amount: Number(form.amount), distType: form.distType, date: form.date, naturaDesc: form.naturaDesc })
            setAddOpen(false)
            setForm(emptyForm(defaultNodeId))
            setError(null)
          } catch (e) { setError(e.message) }
        }}>Simpan & Ajukan</Button></>}
      >
        <ErrorBanner message={error} />
        <FormGrid>
          <FormField label="Node / Cabang" required>
            <Select value={form.nodeId} onChange={(e) => setForm((f) => ({ ...f, nodeId: Number(e.target.value) }))}>
              {producingNodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Program" required>
            <Select value={form.programId} onChange={(e) => setForm((f) => ({ ...f, programId: e.target.value }))}>
              <option value="">— Pilih Program —</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.program_name}</option>)}
            </Select>
          </FormField>
          <FormField label="Mustahiq / Penerima" required>
            <Select value={form.recipientId} onChange={(e) => setForm((f) => ({ ...f, recipientId: e.target.value }))}>
              <option value="">— Cari Penerima —</option>{contacts.filter((c) => c.contact_type === 'mustahiq').map((c) => <option key={c.id} value={c.id}>{c.name} ({ASNAF_LABEL[c.asnaf_category]})</option>)}
            </Select>
          </FormField>
          <FormField label="Nominal" required><Input type="number" placeholder="Rp" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></FormField>
          <FormField label="Metode Penyaluran" required>
            <Select value={form.distType} onChange={(e) => setForm((f) => ({ ...f, distType: e.target.value }))}>
              {Object.entries(DIST_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </FormField>
          <FormField label="Tanggal" required><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></FormField>
        </FormGrid>
        {selectedFund && (
          <div className={`mt-4 rounded-lg px-3 py-2.5 text-xs ${selectedFund.hard_lock ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-500'}`}>
            Saldo tersedia <strong>{selectedFund.fund_name}</strong>: <strong className="tabular">{formatCurrency(fundBalances[selectedFund.id] || 0)}</strong>
            {selectedFund.hard_lock && ' — Dana Terikat (Hard Lock): transaksi ditolak otomatis jika melebihi saldo.'}
          </div>
        )}
        {form.distType === 'natura' && (
          <FormField label="Deskripsi Natura" className="mt-4"><Textarea placeholder="cth. Sembako 1 paket, estimasi nilai Rp 250.000" value={form.naturaDesc} onChange={(e) => setForm((f) => ({ ...f, naturaDesc: e.target.value }))} /></FormField>
        )}
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 p-3 text-xs text-amber-700">
          <FileText size={14} className="shrink-0" /> Surat Keputusan Distribusi & Berita Acara Penyaluran akan digenerate otomatis setelah disetujui.
        </div>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detail Distribusi" description={detail?.sk_no} size="md"
        footer={<><Button variant="secondary"><FileText size={14} /> Unduh SK</Button><Button variant="secondary"><FileText size={14} /> Unduh Berita Acara</Button></>}
      >
        {detail && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-slate-400 mb-0.5">Penerima</p><p className="font-medium">{getContactById(detail.recipient_id)?.name}</p></div>
            <div><p className="text-xs text-slate-400 mb-0.5">Nominal</p><p className="font-medium tabular">{formatCurrency(detail.amount)}</p></div>
            <div><p className="text-xs text-slate-400 mb-0.5">Program</p><p className="font-medium">{getProgramById(detail.program_id)?.program_name}</p></div>
            <div><p className="text-xs text-slate-400 mb-0.5">Fund</p><p className="font-medium">{getFundById(detail.fund_id)?.fund_name}</p></div>
            {detail.natura_desc && <div className="col-span-2"><p className="text-xs text-slate-400 mb-0.5">Deskripsi Natura</p><p className="font-medium">{detail.natura_desc}</p></div>}
          </div>
        )}
      </Modal>
    </div>
  )
}
