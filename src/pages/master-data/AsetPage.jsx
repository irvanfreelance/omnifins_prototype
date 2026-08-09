import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'
import { Plus, Pencil, QrCode, PackageX } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge, StatusBadge } from '../../components/ui/Badge'
import { StatCard } from '../../components/ui/StatCard'
import { DataTable } from '../../components/ui/DataTable'
import { RowMenu } from '../../components/ui/RowMenu'
import { Modal } from '../../components/ui/Modal'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { FormField, FormGrid, Input, Select, Textarea } from '../../components/ui/Field'
import { useLedgerStore } from '../../store/useLedgerStore'
import { useScopeStore } from '../../store/useScopeStore'
import { assets, getNodeById, costCenters, orgNodes, PRODUCING_NODE_IDS, TODAY_Y, TODAY_M, TODAY_D } from '../../data'
import { formatCurrency, formatDate } from '../../lib/format'
import { CATEGORICAL, CHART_INK } from '../../lib/chartColors'
import { Boxes } from 'lucide-react'

const CATEGORY_LABEL = { tanah: 'Tanah', bangunan: 'Bangunan', kendaraan: 'Kendaraan', inventaris: 'Inventaris', peralatan_kantor: 'Peralatan Kantor', peralatan_it: 'Peralatan IT', lainnya: 'Lainnya' }
const todayStr = `${TODAY_Y}-${String(TODAY_M).padStart(2, '0')}-${String(TODAY_D).padStart(2, '0')}`
const producingNodes = orgNodes.filter((n) => PRODUCING_NODE_IDS.includes(n.id))

function emptyForm(defaultNodeId) {
  return { nodeId: defaultNodeId, asset_code: '', asset_name: '', category: 'peralatan_it', cost_center_id: 2, purchase_date: todayStr, purchase_value: '', salvage_value: '0', useful_life_months: '48', depr_method: 'SL', location: '', notes: '' }
}

export default function AsetPage() {
  const scopeNodeId = useScopeStore((s) => s.nodeId)
  const version = useLedgerStore((s) => s.version)
  const addAsset = useLedgerStore((s) => s.addAsset)
  const defaultNodeId = PRODUCING_NODE_IDS.includes(scopeNodeId) ? scopeNodeId : PRODUCING_NODE_IDS[0]
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [qrAsset, setQrAsset] = useState(null)
  const [form, setForm] = useState(emptyForm(defaultNodeId))
  const [error, setError] = useState(null)

  const totalGross = assets.reduce((s, a) => s + a.purchase_value, 0)
  const totalBook = assets.reduce((s, a) => s + a.book_value, 0)
  const totalAccum = assets.reduce((s, a) => s + a.accumulated_depr, 0)
  const activeCount = assets.filter((a) => a.status === 'active').length

  const byCategory = useMemo(() => {
    const map = new Map()
    for (const a of assets) map.set(a.category, (map.get(a.category) || 0) + a.book_value)
    return Array.from(map.entries()).map(([cat, value]) => ({ name: CATEGORY_LABEL[cat], value }))
  }, [version])

  const bookVsAccum = assets
    .slice()
    .sort((a, b) => b.purchase_value - a.purchase_value)
    .slice(0, 8)
    .map((a) => ({ name: a.asset_name.length > 18 ? a.asset_name.slice(0, 16) + '…' : a.asset_name, book: a.book_value, accum: a.accumulated_depr }))

  const openEdit = (a) => { setEditing(a); setModalOpen(true) }
  const openAdd = () => { setEditing(null); setForm(emptyForm(defaultNodeId)); setError(null); setModalOpen(true) }

  const handleSave = () => {
    if (editing) return setModalOpen(false)
    if (!form.asset_code.trim() || !form.asset_name.trim()) return setError('Kode & nama aset wajib diisi.')
    if (!form.purchase_value || Number(form.purchase_value) <= 0) return setError('Nilai perolehan harus lebih dari 0.')
    try {
      addAsset({
        nodeId: form.nodeId,
        cost_center_id: Number(form.cost_center_id),
        asset_code: form.asset_code.trim(),
        asset_name: form.asset_name.trim(),
        category: form.category,
        purchase_date: form.purchase_date,
        purchase_value: Number(form.purchase_value),
        salvage_value: Number(form.salvage_value) || 0,
        useful_life_months: Number(form.useful_life_months) || 48,
        depr_method: form.depr_method,
        location: form.location,
        notes: form.notes,
      })
      setModalOpen(false)
    } catch (e) {
      setError(e.message)
    }
  }

  const columns = [
    { header: 'Kode Aset', accessor: 'asset_code', cell: (r) => <span className="font-mono text-xs text-slate-500">{r.asset_code}</span> },
    { header: 'Nama Aset', cell: (r) => <span className="font-medium text-slate-700">{r.asset_name}</span> },
    { header: 'Kategori', cell: (r) => <Badge variant="blue">{CATEGORY_LABEL[r.category]}</Badge> },
    { header: 'Node', cell: (r) => getNodeById(r.org_node_id)?.short_code },
    { header: 'Tgl Perolehan', cell: (r) => formatDate(r.purchase_date) },
    { header: 'Nilai Perolehan', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular">{formatCurrency(r.purchase_value)}</span> },
    { header: 'Akum. Penyusutan', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular text-slate-500">{formatCurrency(r.accumulated_depr)}</span> },
    { header: 'Nilai Buku', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular font-medium">{formatCurrency(r.book_value)}</span> },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status === 'active' ? 'active' : r.status === 'disposed' ? 'cancelled' : r.status} /> },
    {
      header: '',
      className: 'text-right',
      cell: (r) => (
        <RowMenu
          items={[
            { label: 'Lihat QR Code', icon: QrCode, onClick: () => setQrAsset(r) },
            { label: 'Edit', icon: Pencil, onClick: () => openEdit(r) },
            { divider: true },
            { label: 'Disposal / Penghapusan', icon: PackageX, danger: true, onClick: () => {} },
          ]}
        />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Aset Tetap"
        description="Fixed Asset Register — QR Code per aset, penyusutan otomatis (Straight Line)"
        actions={<Button onClick={openAdd}><Plus size={15} /> Tambah Aset</Button>}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Nilai Perolehan (Gross)" value={formatCurrency(totalGross, { compact: true })} icon={Boxes} tone="blue" />
        <StatCard label="Akumulasi Penyusutan" value={formatCurrency(totalAccum, { compact: true })} tone="amber" />
        <StatCard label="Nilai Buku Bersih" value={formatCurrency(totalBook, { compact: true })} tone="green" />
        <StatCard label="Aset Aktif" value={`${activeCount} / ${assets.length}`} tone="purple" sub="unit terdaftar" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Nilai Buku vs Akumulasi Penyusutan</CardTitle>
              <CardDescription>8 aset dengan nilai perolehan terbesar</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={bookVsAccum} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={70} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="book" name="Nilai Buku" stackId="a" fill={CATEGORICAL[0]} radius={[4, 4, 0, 0]} />
                <Bar dataKey="accum" name="Akum. Penyusutan" stackId="a" fill={CATEGORICAL[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Nilai Buku per Kategori</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={2}>
                  {byCategory.map((_, i) => <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} stroke="#fff" strokeWidth={2} />)}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <DataTable key={version} columns={columns} data={assets} searchKeys={['asset_code', 'asset_name']} searchPlaceholder="Cari aset..." pageSize={8} />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Aset — ${editing.asset_name}` : 'Tambah Aset Tetap'}
        size="lg"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button><Button onClick={handleSave}>{editing ? 'Tutup' : 'Simpan Aset'}</Button></>}
      >
        <ErrorBanner message={error} />
        {editing ? (
          <p className="text-sm text-slate-500">Edit aset yang sudah memiliki riwayat penyusutan tidak didukung pada prototype ini.</p>
        ) : (
          <>
            <FormGrid>
              <FormField label="Node / Cabang" required>
                <Select value={form.nodeId} onChange={(e) => setForm((f) => ({ ...f, nodeId: Number(e.target.value) }))}>
                  {producingNodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Kode Aset" required><Input value={form.asset_code} onChange={(e) => setForm((f) => ({ ...f, asset_code: e.target.value }))} placeholder="AST/IT/2026/001" /></FormField>
              <FormField label="Nama Aset" required><Input value={form.asset_name} onChange={(e) => setForm((f) => ({ ...f, asset_name: e.target.value }))} /></FormField>
              <FormField label="Kategori" required>
                <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </FormField>
              <FormField label="Cost Center">
                <Select value={form.cost_center_id} onChange={(e) => setForm((f) => ({ ...f, cost_center_id: e.target.value }))}>
                  {costCenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </FormField>
              <FormField label="Tanggal Perolehan" required><Input type="date" value={form.purchase_date} onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))} /></FormField>
              <FormField label="Nilai Perolehan" required><Input type="number" value={form.purchase_value} onChange={(e) => setForm((f) => ({ ...f, purchase_value: e.target.value }))} /></FormField>
              <FormField label="Nilai Residu"><Input type="number" value={form.salvage_value} onChange={(e) => setForm((f) => ({ ...f, salvage_value: e.target.value }))} /></FormField>
              <FormField label="Umur Ekonomis (bulan)" required><Input type="number" value={form.useful_life_months} onChange={(e) => setForm((f) => ({ ...f, useful_life_months: e.target.value }))} /></FormField>
              <FormField label="Metode Penyusutan" required>
                <Select value={form.depr_method} onChange={(e) => setForm((f) => ({ ...f, depr_method: e.target.value }))}>
                  <option value="SL">Straight Line</option>
                  <option value="DDB">Double Declining Balance</option>
                  <option value="NONE">Tidak disusutkan (Tanah)</option>
                </Select>
              </FormField>
              <FormField label="Lokasi"><Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} /></FormField>
            </FormGrid>
            <FormField label="Catatan" className="mt-4"><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></FormField>
            <p className="text-[11px] text-slate-400 mt-3">Sistem otomatis membuat jurnal perolehan: Debit Aset Tetap / Kredit Bank sesuai node yang dipilih.</p>
          </>
        )}
      </Modal>

      <Modal open={!!qrAsset} onClose={() => setQrAsset(null)} title="QR Code Aset" description={qrAsset?.asset_name} size="sm">
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="h-44 w-44 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
            <QrCode size={96} className="text-slate-400" />
          </div>
          <p className="text-xs font-mono text-slate-500">{qrAsset?.asset_code}</p>
          <p className="text-[11px] text-slate-400 text-center">Scan untuk melihat detail & histori perbaikan aset ini via mobile browser.</p>
        </div>
      </Modal>
    </div>
  )
}
