import { useMemo, useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Bar, Line } from 'recharts'
import { Plus, Upload, Send, Eye } from 'lucide-react'
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
import { donations, funds, getFundById, getContactById, getProgramById, getCampaignById, campaigns, contacts, orgNodes, PRODUCING_NODE_IDS, TODAY_Y, TODAY_M, TODAY_D } from '../data'
import { formatCurrency, formatDate, formatMonthShort } from '../lib/format'
import { CATEGORICAL, CHART_INK } from '../lib/chartColors'
import { HandCoins, TrendingUp, ReceiptText, Users } from 'lucide-react'

const CHANNEL_LABEL = { cash: 'Tunai', transfer: 'Transfer', qris: 'QRIS', gopay: 'GoPay', ovo: 'OVO', dana: 'DANA', shopeepay: 'ShopeePay', cc: 'Kartu Kredit', platform_online: 'Platform Online', lainnya: 'Lainnya' }
const todayStr = `${TODAY_Y}-${String(TODAY_M).padStart(2, '0')}-${String(TODAY_D).padStart(2, '0')}`
const producingNodes = orgNodes.filter((n) => PRODUCING_NODE_IDS.includes(n.id))

function emptyForm(defaultNodeId) {
  return { nodeId: defaultNodeId, donorId: '', fundId: '', programId: '', amount: '', channel: 'transfer', date: todayStr, notes: '' }
}

function monthsBack(n) {
  const out = []
  let y = TODAY_Y, m = TODAY_M
  for (let i = 0; i < n; i++) { out.unshift({ year: y, month: m }); m--; if (m < 1) { m = 12; y-- } }
  return out
}

export default function DonasiPage() {
  const nodeIds = useScopedNodeIds()
  const scopeNodeId = useScopeStore((s) => s.nodeId)
  const version = useLedgerStore((s) => s.version)
  const createDonation = useLedgerStore((s) => s.createDonation)
  const defaultNodeId = PRODUCING_NODE_IDS.includes(scopeNodeId) ? scopeNodeId : PRODUCING_NODE_IDS[0]
  const [addOpen, setAddOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(emptyForm(defaultNodeId))
  const [error, setError] = useState(null)

  const scoped = useMemo(() => donations.filter((d) => nodeIds.includes(d.org_node_id)).sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date)), [nodeIds, version])
  const monthKey = `${TODAY_Y}-${String(TODAY_M).padStart(2, '0')}`
  const mtd = scoped.filter((d) => d.status === 'posted' && d.donation_date.startsWith(monthKey))
  const totalMTD = mtd.reduce((s, d) => s + d.amount, 0)
  const avgDonation = mtd.length ? Math.round(totalMTD / mtd.length) : 0
  const receiptRate = mtd.length ? Math.round((mtd.filter((d) => d.receipt_sent_at).length / mtd.length) * 100) : 0
  const uniqueDonors = new Set(mtd.map((d) => d.donor_id)).size

  const areaData = useMemo(() => {
    const months = monthsBack(6)
    return months.map(({ year, month }) => {
      const key = `${year}-${String(month).padStart(2, '0')}`
      const rows = scoped.filter((d) => d.status === 'posted' && d.donation_date.startsWith(key))
      const zakat = rows.filter((d) => [1, 2].includes(d.fund_id)).reduce((s, d) => s + d.amount, 0)
      const infaqSedekah = rows.filter((d) => [3, 4].includes(d.fund_id)).reduce((s, d) => s + d.amount, 0)
      const lainnya = rows.filter((d) => ![1, 2, 3, 4].includes(d.fund_id)).reduce((s, d) => s + d.amount, 0)
      return { label: formatMonthShort(year, month), zakat, infaqSedekah, lainnya }
    })
  }, [scoped])

  const campaignData = campaigns
    .filter((c) => c.status === 'active')
    .map((c) => {
      const raised = donations.filter((d) => d.campaign_id === c.id && d.status === 'posted').reduce((s, d) => s + d.amount, 0)
      return { name: c.campaign_name.length > 16 ? c.campaign_name.slice(0, 14) + '…' : c.campaign_name, target: c.target_amount, raised, pct: Math.round((raised / c.target_amount) * 100) }
    })

  const columns = [
    { header: 'Tanggal', cell: (r) => formatDate(r.donation_date) },
    { header: 'Donatur', cell: (r) => <span className="font-medium text-slate-700">{getContactById(r.donor_id)?.name}</span> },
    { header: 'Fund', cell: (r) => <Badge variant="purple">{getFundById(r.fund_id)?.fund_name}</Badge> },
    { header: 'Program', cell: (r) => (r.program_id ? getProgramById(r.program_id)?.program_name : <span className="text-slate-300">—</span>) },
    { header: 'Channel', cell: (r) => CHANNEL_LABEL[r.channel] },
    { header: 'Nominal', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular font-medium">{formatCurrency(r.amount)}</span> },
    { header: 'Kwitansi', cell: (r) => (r.receipt_sent_at ? <Badge variant="green">Terkirim</Badge> : <Badge variant="slate">Belum</Badge>) },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { header: '', className: 'text-right', cell: (r) => <Button size="sm" variant="ghost" onClick={() => setDetail(r)}><Eye size={13} /></Button> },
  ]

  return (
    <div>
      <PageHeader
        title="Donasi & Penerimaan Dana"
        description="Pencatatan penerimaan zakat, infaq, sedekah, wakaf — kwitansi digital otomatis"
        actions={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(true)}><Upload size={15} /> Import Bulk</Button>
            <Button onClick={() => { setForm(emptyForm(defaultNodeId)); setError(null); setAddOpen(true) }}><Plus size={15} /> Input Donasi</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Penerimaan Bulan Ini" value={formatCurrency(totalMTD, { compact: true })} icon={HandCoins} tone="blue" sub={`${mtd.length} transaksi`} />
        <StatCard label="Rata-rata per Donasi" value={formatCurrency(avgDonation, { compact: true })} icon={TrendingUp} tone="green" />
        <StatCard label="Donatur Unik (MTD)" value={uniqueDonors} icon={Users} tone="purple" sub={`dari ${contacts.filter((c) => c.contact_type === 'donor').length} total donatur`} />
        <StatCard label="Kwitansi Terkirim" value={`${receiptRate}%`} icon={ReceiptText} tone="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <div><CardTitle>Penerimaan per Jenis Dana — 6 Bulan</CardTitle><CardDescription>Zakat vs Infaq/Sedekah vs lainnya</CardDescription></div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={areaData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} />
                <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={65} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="zakat" name="Zakat" stackId="1" stroke={CATEGORICAL[0]} fill={CATEGORICAL[0]} fillOpacity={0.35} />
                <Area type="monotone" dataKey="infaqSedekah" name="Infaq/Sedekah" stackId="1" stroke={CATEGORICAL[2]} fill={CATEGORICAL[2]} fillOpacity={0.35} />
                <Area type="monotone" dataKey="lainnya" name="Lainnya" stackId="1" stroke={CATEGORICAL[3]} fill={CATEGORICAL[3]} fillOpacity={0.35} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div><CardTitle>Campaign vs Target</CardTitle><CardDescription>Progress fundraising campaign aktif</CardDescription></div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={campaignData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} interval={0} angle={-10} textAnchor="end" height={40} />
                <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={65} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="target" name="Target" fill={CATEGORICAL[4]} radius={[4, 4, 0, 0]} maxBarSize={26} fillOpacity={0.35} />
                <Bar dataKey="raised" name="Terkumpul" fill={CATEGORICAL[0]} radius={[4, 4, 0, 0]} maxBarSize={26} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <DataTable columns={columns} data={scoped} searchKeys={[(r) => getContactById(r.donor_id)?.name]} searchPlaceholder="Cari donatur..." pageSize={10} />
        </CardContent>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Input Penerimaan Donasi"
        footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Batal</Button><Button onClick={() => {
          if (!form.donorId) return setError('Donatur wajib dipilih.')
          if (!form.fundId) return setError('Jenis dana wajib dipilih.')
          if (!form.amount || Number(form.amount) <= 0) return setError('Nominal harus lebih dari 0.')
          try {
            createDonation({ nodeId: form.nodeId, donorId: Number(form.donorId), fundId: Number(form.fundId), programId: form.programId || null, amount: Number(form.amount), channel: form.channel, date: form.date, notes: form.notes })
            setAddOpen(false)
            setForm(emptyForm(defaultNodeId))
            setError(null)
          } catch (e) { setError(e.message) }
        }}>Simpan Donasi</Button></>}
      >
        <ErrorBanner message={error} />
        <FormGrid>
          <FormField label="Node / Cabang" required>
            <Select value={form.nodeId} onChange={(e) => setForm((f) => ({ ...f, nodeId: Number(e.target.value) }))}>
              {producingNodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Donatur" required>
            <Select value={form.donorId} onChange={(e) => setForm((f) => ({ ...f, donorId: e.target.value }))}>
              <option value="">— Cari / Pilih Donatur —</option>{contacts.filter((c) => c.contact_type === 'donor').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Jenis Dana" required>
            <Select value={form.fundId} onChange={(e) => setForm((f) => ({ ...f, fundId: e.target.value }))}>
              <option value="">— Pilih Dana —</option>{funds.map((f) => <option key={f.id} value={f.id}>{f.fund_name}</option>)}
            </Select>
          </FormField>
          <FormField label="Nominal" required><Input type="number" placeholder="Rp" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></FormField>
          <FormField label="Metode Pembayaran" required>
            <Select value={form.channel} onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}>
              {Object.entries(CHANNEL_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </FormField>
          <FormField label="Tanggal" required><Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></FormField>
        </FormGrid>
        <FormField label="Catatan" className="mt-4"><Textarea placeholder="Opsional" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></FormField>
        <label className="flex items-center gap-2 mt-3 text-sm text-slate-600">
          <input type="checkbox" className="h-4 w-4 rounded accent-blue-600" defaultChecked disabled /> Kirim kwitansi digital via WhatsApp otomatis (setelah disetujui)
        </label>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import Bulk Donasi"
        description="Untuk rekap donasi platform online (Kitabisa, Tokopedia Salam, Shopee Barokah, dll.)"
        footer={<><Button variant="secondary" onClick={() => setImportOpen(false)}>Batal</Button><Button onClick={() => setImportOpen(false)}>Proses Import</Button></>}
      >
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-10 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 cursor-pointer transition-colors">
          <Upload size={20} />
          Seret file Excel/CSV atau klik untuk unggah
        </div>
        <p className="text-[11px] text-slate-400 mt-3">Format kolom: Nama Donatur, Nominal, Tanggal, Jenis Dana, Channel, Referensi.</p>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detail Donasi" description={detail?.receipt_no} size="md"
        footer={<Button variant="secondary"><Send size={14} /> Kirim Ulang Kwitansi</Button>}
      >
        {detail && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-xs text-slate-400 mb-0.5">Donatur</p><p className="font-medium text-slate-700">{getContactById(detail.donor_id)?.name}</p></div>
            <div><p className="text-xs text-slate-400 mb-0.5">Nominal</p><p className="font-medium tabular">{formatCurrency(detail.amount)}</p></div>
            <div><p className="text-xs text-slate-400 mb-0.5">Jenis Dana</p><p className="font-medium">{getFundById(detail.fund_id)?.fund_name}</p></div>
            <div><p className="text-xs text-slate-400 mb-0.5">Channel</p><p className="font-medium">{CHANNEL_LABEL[detail.channel]}</p></div>
            <div><p className="text-xs text-slate-400 mb-0.5">Referensi Pembayaran</p><p className="font-medium font-mono text-xs">{detail.payment_ref}</p></div>
            <div><p className="text-xs text-slate-400 mb-0.5">Campaign</p><p className="font-medium">{detail.campaign_id ? getCampaignById(detail.campaign_id)?.campaign_name : '—'}</p></div>
          </div>
        )}
      </Modal>
    </div>
  )
}
