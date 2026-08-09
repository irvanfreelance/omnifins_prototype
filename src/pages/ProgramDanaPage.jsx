import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { Plus, Pencil } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { Pills } from '../components/ui/Tabs'
import { Modal } from '../components/ui/Modal'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { FormField, FormGrid, Input, Select, Textarea } from '../components/ui/Field'
import { useScopeStore } from '../store/useScopeStore'
import { useLedgerStore } from '../store/useLedgerStore'
import { programs, funds, campaigns, costCenters, getFundById, getUserById, getNodeById, FUND_TYPE_LABEL, TODAY_Y, TODAY_M } from '../data'
import { computeSaldoDanaPerFund } from '../data/reports'
import { formatCurrency, formatDate } from '../lib/format'
import { CATEGORICAL, CHART_INK } from '../lib/chartColors'

const FUND_TYPE_VARIANT = { restricted: 'red', temporarily_restricted: 'amber', unrestricted: 'green' }

function emptyForm() {
  return { code: '', name: '', fundId: '', picUserId: 6, costCenterId: 4, target: '', hardLock: 'false', fundType: 'unrestricted', periodStart: '', periodEnd: '', description: '' }
}

export default function ProgramDanaPage() {
  const [tab, setTab] = useState('program')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState(null)
  const { nodeId, consolidated } = useScopeStore()
  const version = useLedgerStore((s) => s.version)
  const addProgram = useLedgerStore((s) => s.addProgram)
  const addFund = useLedgerStore((s) => s.addFund)
  const addCampaign = useLedgerStore((s) => s.addCampaign)

  const danaRows = useMemo(() => computeSaldoDanaPerFund({ nodeId, consolidated, year: TODAY_Y, month: TODAY_M }).rows, [nodeId, consolidated, version])
  const fundChartData = danaRows.map((r) => ({ name: r.fund.fund_code, saldo: r.saldo, type: r.fund.fund_type }))

  const programColumns = [
    { header: 'Kode', cell: (r) => <span className="font-mono text-xs text-slate-500">{r.program_code}</span> },
    { header: 'Nama Program', cell: (r) => <span className="font-medium text-slate-700">{r.program_name}</span> },
    { header: 'Fund', cell: (r) => getFundById(r.fund_id)?.fund_name },
    { header: 'PIC', cell: (r) => getUserById(r.pic_user_id)?.full_name },
    { header: 'Target', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular">{formatCurrency(r.target_amount, { compact: true })}</span> },
    { header: 'Periode', cell: (r) => <span className="text-xs text-slate-400">{formatDate(r.period_start)} — {formatDate(r.period_end)}</span> },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    { header: '', className: 'text-right', cell: () => <Button size="sm" variant="ghost"><Pencil size={13} /></Button> },
  ]

  const fundColumns = [
    { header: 'Kode', cell: (r) => <span className="font-mono text-xs text-slate-500">{r.fund.fund_code}</span> },
    { header: 'Nama Dana', cell: (r) => <span className="font-medium text-slate-700">{r.fund.fund_name}</span> },
    { header: 'Tipe', cell: (r) => <Badge variant={FUND_TYPE_VARIANT[r.fund.fund_type]}>{FUND_TYPE_LABEL[r.fund.fund_type]}</Badge> },
    { header: 'Hard Lock', cell: (r) => <Badge variant={r.fund.hard_lock ? 'red' : 'slate'}>{r.fund.hard_lock ? 'Ya' : 'Tidak'}</Badge> },
    { header: 'Penerimaan (s.d. ini)', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular text-slate-500">{formatCurrency(r.penerimaan, { compact: true })}</span> },
    { header: 'Penyaluran (s.d. ini)', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular text-slate-500">{formatCurrency(r.penyaluran, { compact: true })}</span> },
    { header: 'Saldo', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular font-semibold">{formatCurrency(r.saldo, { compact: true })}</span> },
  ]

  const campaignColumns = [
    { header: 'Kode', cell: (r) => <span className="font-mono text-xs text-slate-500">{r.campaign_code}</span> },
    { header: 'Nama Campaign', cell: (r) => <span className="font-medium text-slate-700">{r.campaign_name}</span> },
    { header: 'Fund', cell: (r) => getFundById(r.fund_id)?.fund_name },
    { header: 'Target', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular">{formatCurrency(r.target_amount, { compact: true })}</span> },
    { header: 'Periode', cell: (r) => <span className="text-xs text-slate-400">{formatDate(r.start_date)} — {r.end_date ? formatDate(r.end_date) : 'berjalan'}</span> },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
  ]

  const openAdd = () => { setForm(emptyForm()); setError(null); setModalOpen(true) }

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim()) return setError('Kode & nama wajib diisi.')
    if (tab === 'program') {
      if (!form.fundId) return setError('Fund wajib dipilih.')
      addProgram({ program_code: form.code, program_name: form.name, fund_id: Number(form.fundId), cost_center_id: Number(form.costCenterId), pic_user_id: Number(form.picUserId), target_amount: Number(form.target) || 0, period_start: form.periodStart || `${TODAY_Y}-01-01`, period_end: form.periodEnd || `${TODAY_Y}-12-31`, description: form.description })
    } else if (tab === 'fund') {
      addFund({ fund_code: form.code, fund_name: form.name, fund_type: form.fundType, hard_lock: form.hardLock === 'true' })
    } else {
      if (!form.fundId) return setError('Fund wajib dipilih.')
      addCampaign({ campaign_code: form.code, campaign_name: form.name, fund_id: Number(form.fundId), target_amount: Number(form.target) || 0, start_date: form.periodStart || `${TODAY_Y}-01-01`, end_date: form.periodEnd || null, description: form.description })
    }
    setModalOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="Program & Dana"
        description="Master Program penyaluran, Fund/Dana terikat-tidak terikat, dan Campaign fundraising"
        actions={<Button onClick={openAdd}><Plus size={15} /> Tambah {tab === 'program' ? 'Program' : tab === 'fund' ? 'Dana' : 'Campaign'}</Button>}
      />

      <Card className="mb-6">
        <CardHeader><div><CardTitle>Saldo per Fund/Dana</CardTitle><CardDescription>Saldo dana berjalan (penerimaan − penyaluran, sesuai scope aktif)</CardDescription></div></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={fundChartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={65} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="saldo" radius={[4, 4, 0, 0]} maxBarSize={36}>
                {fundChartData.map((d, i) => (
                  <Cell key={i} fill={d.type === 'unrestricted' ? CATEGORICAL[2] : d.type === 'temporarily_restricted' ? CATEGORICAL[3] : CATEGORICAL[7]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4">
            <Pills options={[{ value: 'program', label: `Program (${programs.length})` }, { value: 'fund', label: `Fund/Dana (${funds.length})` }, { value: 'campaign', label: `Campaign (${campaigns.length})` }]} active={tab} onChange={setTab} />
          </div>
          {tab === 'program' && <DataTable key={version} columns={programColumns} data={programs} searchKeys={['program_code', 'program_name']} searchPlaceholder="Cari program..." />}
          {tab === 'fund' && <DataTable key={version} columns={fundColumns} data={danaRows} searchable={false} rowKey={(r) => r.fund.id} />}
          {tab === 'campaign' && <DataTable key={version} columns={campaignColumns} data={campaigns} searchKeys={['campaign_code', 'campaign_name']} searchPlaceholder="Cari campaign..." />}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Tambah ${tab === 'program' ? 'Program' : tab === 'fund' ? 'Dana' : 'Campaign'}`}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button><Button onClick={handleSave}>Simpan</Button></>}
      >
        <ErrorBanner message={error} />
        {tab === 'program' && (
          <FormGrid>
            <FormField label="Kode Program" required><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="cth. BEA-2027" /></FormField>
            <FormField label="Nama Program" required><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></FormField>
            <FormField label="Fund" required>
              <Select value={form.fundId} onChange={(e) => setForm((f) => ({ ...f, fundId: e.target.value }))}>
                <option value="">— Pilih Fund —</option>{funds.map((f) => <option key={f.id} value={f.id}>{f.fund_name}</option>)}
              </Select>
            </FormField>
            <FormField label="Cost Center">
              <Select value={form.costCenterId} onChange={(e) => setForm((f) => ({ ...f, costCenterId: e.target.value }))}>
                {costCenters.map((cc) => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
              </Select>
            </FormField>
            <FormField label="PIC">
              <Select value={form.picUserId} onChange={(e) => setForm((f) => ({ ...f, picUserId: e.target.value }))}>
                {[6, 8, 10].map((id) => <option key={id} value={id}>{getUserById(id)?.full_name}</option>)}
              </Select>
            </FormField>
            <FormField label="Target Anggaran" required><Input type="number" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} /></FormField>
            <FormField label="Periode" required>
              <div className="flex gap-2">
                <Input type="date" value={form.periodStart} onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))} />
                <Input type="date" value={form.periodEnd} onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))} />
              </div>
            </FormField>
          </FormGrid>
        )}
        {tab === 'fund' && (
          <FormGrid>
            <FormField label="Kode Dana" required><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="cth. PROG-EDU" /></FormField>
            <FormField label="Nama Dana" required><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></FormField>
            <FormField label="Tipe" required>
              <Select value={form.fundType} onChange={(e) => setForm((f) => ({ ...f, fundType: e.target.value }))}>
                <option value="unrestricted">Tidak Terikat</option>
                <option value="temporarily_restricted">Terikat Sementara</option>
                <option value="restricted">Terikat Permanen</option>
              </Select>
            </FormField>
            <FormField label="Hard Lock">
              <Select value={form.hardLock} onChange={(e) => setForm((f) => ({ ...f, hardLock: e.target.value }))}>
                <option value="false">Tidak</option>
                <option value="true">Ya — blokir cross-fund</option>
              </Select>
            </FormField>
          </FormGrid>
        )}
        {tab === 'campaign' && (
          <FormGrid>
            <FormField label="Kode Campaign" required><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="cth. CMP-2027" /></FormField>
            <FormField label="Nama Campaign" required><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></FormField>
            <FormField label="Fund" required>
              <Select value={form.fundId} onChange={(e) => setForm((f) => ({ ...f, fundId: e.target.value }))}>
                <option value="">— Pilih Fund —</option>{funds.map((f) => <option key={f.id} value={f.id}>{f.fund_name}</option>)}
              </Select>
            </FormField>
            <FormField label="Target" required><Input type="number" value={form.target} onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))} /></FormField>
            <FormField label="Periode" required>
              <div className="flex gap-2">
                <Input type="date" value={form.periodStart} onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))} />
                <Input type="date" value={form.periodEnd} onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))} />
              </div>
            </FormField>
          </FormGrid>
        )}
        <FormField label="Deskripsi" className="mt-4"><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} /></FormField>
      </Modal>
    </div>
  )
}
