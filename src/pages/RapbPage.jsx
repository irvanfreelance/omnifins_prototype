import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { Plus, History } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { Pills } from '../components/ui/Tabs'
import { Modal } from '../components/ui/Modal'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { FormField, FormGrid, Input, Select } from '../components/ui/Field'
import { useLedgerStore } from '../store/useLedgerStore'
import { budgets, getActualForBudget } from '../data/budgets'
import { getFundById, getProgramById, funds, programs, TODAY_Y, TODAY_M } from '../data'
import { formatCurrency, formatMonthLabel } from '../lib/format'
import { CATEGORICAL, CHART_INK, STATUS } from '../lib/chartColors'

function emptyForm() {
  return { kind: 'penyaluran', targetId: '', amount: '', lockMode: 'soft' }
}

export default function RapbPage() {
  const [kind, setKind] = useState('penyaluran')
  const [month, setMonth] = useState(TODAY_M)
  const [addOpen, setAddOpen] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState(null)
  const [revisionAmount, setRevisionAmount] = useState('')
  const [revisionReason, setRevisionReason] = useState('')
  const [revisionError, setRevisionError] = useState(null)

  const version = useLedgerStore((s) => s.version)
  const addBudget = useLedgerStore((s) => s.addBudget)
  const reviseBudget = useLedgerStore((s) => s.reviseBudget)

  const rows = useMemo(() => {
    return budgets
      .filter((b) => b.budget_kind === kind && b.period_year === TODAY_Y && b.period_month === month)
      .map((b) => {
        const actual = getActualForBudget(b)
        const pct = b.amount ? Math.round((actual / b.amount) * 100) : 0
        const label = b.budget_kind === 'penerimaan' ? getFundById(b.fund_id)?.fund_name : getProgramById(b.program_id)?.program_name
        return { ...b, actual, pct, label }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [kind, month, version])

  const chartData = rows.slice(0, 8).map((r) => ({ name: r.label?.length > 16 ? r.label.slice(0, 14) + '…' : r.label, budget: r.amount, realisasi: r.actual }))
  const radarData = rows.slice(0, 6).map((r) => ({ name: r.label?.length > 14 ? r.label.slice(0, 12) + '…' : r.label, pct: Math.min(150, r.pct) }))

  const columns = [
    { header: kind === 'penerimaan' ? 'Fund / Dana' : 'Program', cell: (r) => <span className="font-medium text-slate-700">{r.label}</span> },
    { header: 'Lock Mode', cell: (r) => <Badge variant={r.lock_mode === 'hard' ? 'red' : r.lock_mode === 'soft' ? 'amber' : 'slate'}>{r.lock_mode}</Badge> },
    { header: 'Versi', cell: (r) => <span className="text-xs text-slate-400">v{r.version}</span> },
    { header: 'Budget', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular">{formatCurrency(r.amount)}</span> },
    { header: 'Realisasi', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular font-medium">{formatCurrency(r.actual)}</span> },
    {
      header: 'Progress',
      cell: (r) => (
        <div className="w-32">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className={r.pct >= 100 ? 'text-red-600 font-semibold' : r.pct >= 80 ? 'text-amber-600 font-semibold' : 'text-slate-500'}>{r.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.min(100, r.pct)}%`, background: r.pct >= 100 ? STATUS.critical : r.pct >= 80 ? STATUS.warning : STATUS.good }}
            />
          </div>
        </div>
      ),
    },
    {
      header: '',
      className: 'text-right',
      cell: (r) => (
        <Button variant="ghost" size="sm" onClick={() => { setRevisionOpen(r); setRevisionAmount(r.amount); setRevisionReason(''); setRevisionError(null) }}>
          <History size={13} /> Revisi
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Anggaran Program (RAPB)"
        description="Rencana Anggaran Pendapatan & Belanja — Budget vs Actual real-time, per Program/Fund"
        actions={<Button onClick={() => { setForm(emptyForm()); setError(null); setAddOpen(true) }}><Plus size={15} /> Buat Anggaran</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Budget vs Realisasi</CardTitle>
              <CardDescription>{formatMonthLabel(TODAY_Y, month)} — Top 8 {kind === 'penerimaan' ? 'fund' : 'program'}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} interval={0} angle={-12} textAnchor="end" height={45} />
                <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={65} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="budget" name="Budget" fill={CATEGORICAL[0]} radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="realisasi" name="Realisasi" fill={CATEGORICAL[1]} radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>% Pencapaian per Item</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke={CHART_INK.grid} />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 9, fill: CHART_INK.secondary }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: CHART_INK.muted }} angle={90} />
                <Radar dataKey="pct" name="% Realisasi" stroke={CATEGORICAL[2]} fill={CATEGORICAL[2]} fillOpacity={0.35} />
                <Tooltip formatter={(v) => `${v}%`} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Pills options={[{ value: 'penerimaan', label: 'Penerimaan' }, { value: 'penyaluran', label: 'Penyaluran / Program' }]} active={kind} onChange={setKind} />
            <Select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-40 ml-auto">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{formatMonthLabel(TODAY_Y, m)}</option>
              ))}
            </Select>
          </div>
          <DataTable key={version} columns={columns} data={rows} searchable={false} pageSize={10} />
        </CardContent>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Buat Anggaran Baru"
        footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Batal</Button><Button onClick={() => {
          if (!form.targetId) return setError(form.kind === 'penerimaan' ? 'Fund wajib dipilih.' : 'Program wajib dipilih.')
          if (!form.amount || Number(form.amount) <= 0) return setError('Nominal harus lebih dari 0.')
          for (let m = 1; m <= 12; m++) {
            addBudget({
              org_node_id: 1,
              budget_kind: form.kind,
              fund_id: form.kind === 'penerimaan' ? Number(form.targetId) : programs.find((p) => p.id === Number(form.targetId))?.fund_id,
              program_id: form.kind === 'penyaluran' ? Number(form.targetId) : null,
              cost_center_id: form.kind === 'penyaluran' ? programs.find((p) => p.id === Number(form.targetId))?.cost_center_id : null,
              period_year: TODAY_Y,
              period_month: m,
              amount: Number(form.amount),
              lock_mode: form.lockMode,
              notes: 'Dibuat via RAPB — rata setiap bulan',
            })
          }
          setAddOpen(false)
        }}>Simpan Anggaran</Button></>}
      >
        <ErrorBanner message={error} />
        <FormGrid>
          <FormField label="Jenis Anggaran" required>
            <Select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value, targetId: '' }))}>
              <option value="penerimaan">Penerimaan (Target Dana)</option>
              <option value="penyaluran">Penyaluran (Program)</option>
            </Select>
          </FormField>
          <FormField label={form.kind === 'penerimaan' ? 'Fund' : 'Program'} required>
            <Select value={form.targetId} onChange={(e) => setForm((f) => ({ ...f, targetId: e.target.value }))}>
              <option value="">— Pilih {form.kind === 'penerimaan' ? 'Fund' : 'Program'} —</option>
              {form.kind === 'penerimaan'
                ? funds.map((f) => <option key={f.id} value={f.id}>{f.fund_name}</option>)
                : programs.map((p) => <option key={p.id} value={p.id}>{p.program_name}</option>)}
            </Select>
          </FormField>
          <FormField label="Tahun" required><Input type="number" value={TODAY_Y} disabled /></FormField>
          <FormField label="Nominal per Bulan" required><Input type="number" placeholder="Rp" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} /></FormField>
          <FormField label="Lock Mode" required>
            <Select value={form.lockMode} onChange={(e) => setForm((f) => ({ ...f, lockMode: e.target.value }))}>
              <option value="soft">Soft Lock (butuh approval)</option>
              <option value="hard">Hard Lock (ditolak jika lewat)</option>
              <option value="none">Tanpa Lock</option>
            </Select>
          </FormField>
        </FormGrid>
        <p className="text-[11px] text-slate-400 mt-3">Anggaran akan dibuat rata untuk 12 bulan tahun {TODAY_Y} (monthly spread).</p>
      </Modal>

      <Modal
        open={!!revisionOpen}
        onClose={() => setRevisionOpen(null)}
        title={`Revisi Anggaran — ${revisionOpen?.label}`}
        description="Perubahan RAPB dicatat dengan histori versi & alasan (FR-RAPB-04)"
        footer={<><Button variant="secondary" onClick={() => setRevisionOpen(null)}>Batal</Button><Button onClick={() => {
          if (!revisionReason.trim()) return setRevisionError('Alasan revisi wajib diisi.')
          try {
            reviseBudget(revisionOpen.id, { amount: Number(revisionAmount), reason: revisionReason })
            setRevisionOpen(null)
          } catch (e) { setRevisionError(e.message) }
        }}>Simpan Revisi</Button></>}
      >
        {revisionOpen && (
          <div className="space-y-4">
            <ErrorBanner message={revisionError} />
            <div className="rounded-lg bg-slate-50 p-3 text-sm flex items-center justify-between">
              <span className="text-slate-500">Anggaran saat ini (v{revisionOpen.version})</span>
              <span className="font-medium tabular">{formatCurrency(revisionOpen.amount)}</span>
            </div>
            <FormField label="Nominal Baru" required><Input type="number" value={revisionAmount} onChange={(e) => setRevisionAmount(e.target.value)} /></FormField>
            <FormField label="Alasan Revisi" required><Input value={revisionReason} onChange={(e) => setRevisionReason(e.target.value)} placeholder="cth. Penyesuaian target berdasar tren Q2" /></FormField>
          </div>
        )}
      </Modal>
    </div>
  )
}
