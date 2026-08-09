import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import {
  FileBarChart, Download, ChevronRight, Landmark, Activity, TrendingUp, Wallet2, HandCoins, PiggyBank,
  Users, BookOpen, PiggyBankIcon, Megaphone, Clock, Scale, Building2, Network,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Select } from '../components/ui/Field'
import { Pills } from '../components/ui/Tabs'
import { useScopeStore } from '../store/useScopeStore'
import {
  donations, distributions, campaigns, contacts, cashAdvances, funds, programs, getFundById, getProgramById,
  getContactById, getNodeById, orgNodes, TODAY_Y, TODAY_M, TODAY,
} from '../data'
import {
  computeLaporanPosisiKeuangan, computeLaporanAktivitas, computeSaldoDanaPerFund, computeArusKas,
  computeByNodeBreakdown, computeMonthlyTrend, resolveScopeNodeIds,
} from '../data/reports'
import { getBudgetsForPeriod, getActualForBudget } from '../data/budgets'
import { formatCurrency, formatMonthLabel, formatMonthShort, formatDate } from '../lib/format'
import { CATEGORICAL, CHART_INK, STATUS } from '../lib/chartColors'
import { cn } from '../lib/utils'
import { ASNAF_LABEL } from '../data/contacts'

const REPORT_GROUPS = [
  {
    label: 'Laporan Standar (PSAK 109 / ISAK 35)',
    items: [
      { id: 'posisi', code: 'RPT-S-01', name: 'Laporan Posisi Keuangan', icon: Landmark },
      { id: 'aktivitas', code: 'RPT-S-02', name: 'Laporan Aktivitas', icon: Activity },
      { id: 'perubahan-neto', code: 'RPT-S-03', name: 'Laporan Perubahan Aset Neto', icon: TrendingUp },
      { id: 'arus-kas', code: 'RPT-S-04', name: 'Laporan Arus Kas', icon: Wallet2 },
      { id: 'penerimaan-penggunaan', code: 'RPT-S-05', name: 'Penerimaan & Penggunaan Dana', icon: HandCoins },
      { id: 'dana-terikat', code: 'RPT-S-06', name: 'Dana Terikat & Tidak Terikat', icon: PiggyBank },
      { id: 'distribusi-asnaf', code: 'RPT-S-07', name: 'Distribusi per Program / Asnaf', icon: Users },
      { id: 'donatur', code: 'RPT-S-08', name: 'Laporan Donatur', icon: Users },
      { id: 'buku-besar-fund', code: 'RPT-S-09', name: 'Buku Besar per Fund/Dana', icon: BookOpen },
      { id: 'budget-vs-actual', code: 'RPT-S-10', name: 'Budget Program vs Realisasi', icon: PiggyBankIcon },
      { id: 'campaign', code: 'RPT-S-11', name: 'Rekap Campaign Fundraising', icon: Megaphone },
      { id: 'ca-aging', code: 'RPT-S-12', name: 'Cash Advance Aging', icon: Clock },
      { id: 'trial-balance', code: 'RPT-S-13', name: 'Trial Balance (Neraca Saldo)', icon: Scale },
    ],
  },
  {
    label: 'Laporan Konsolidasi Multi-Node',
    items: [
      { id: 'posisi-konsolidasi', code: 'RPT-K-03', name: 'Posisi Keuangan Konsolidasi', icon: Building2 },
      { id: 'aktivitas-konsolidasi', code: 'RPT-K-04', name: 'Laporan Aktivitas Konsolidasi', icon: Network },
      { id: 'rekap-penerimaan-node', code: 'RPT-K-05', name: 'Rekap Penerimaan per Node', icon: Building2 },
      { id: 'rekap-pengeluaran-node', code: 'RPT-K-06', name: 'Rekap Pengeluaran per Node', icon: Building2 },
      { id: 'budget-konsolidasi', code: 'RPT-K-07', name: 'Budget vs Actual Konsolidasi', icon: PiggyBankIcon },
      { id: 'perbandingan-node', code: 'RPT-K-08', name: 'Perbandingan Kinerja Antar Node', icon: Network },
      { id: 'dana-konsolidasi', code: 'RPT-K-09', name: 'Dana Terikat Konsolidasi', icon: PiggyBank },
      { id: 'distribusi-konsolidasi', code: 'RPT-K-10', name: 'Distribusi Konsolidasi per Program', icon: Users },
    ],
  },
]

function ReportShell({ code, name, description, children }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="blue">{code}</Badge>
            <h2 className="text-base font-semibold text-slate-800">{name}</h2>
          </div>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm"><Download size={13} /> PDF</Button>
          <Button variant="secondary" size="sm"><Download size={13} /> Excel</Button>
        </div>
      </div>
      {children}
    </div>
  )
}

function LineRow({ label, value, indent = 0, bold, tone, border }) {
  return (
    <div className={cn('flex items-center justify-between py-2 text-sm', border && 'border-t border-slate-100 mt-1 pt-2.5')} style={{ paddingLeft: `${indent * 16}px` }}>
      <span className={cn(bold ? 'font-semibold text-slate-800' : 'text-slate-600')}>{label}</span>
      <span className={cn('tabular', bold ? 'font-semibold' : 'font-medium', tone === 'red' ? 'text-red-600' : tone === 'green' ? 'text-emerald-600' : 'text-slate-700')}>
        {formatCurrency(value)}
      </span>
    </div>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span>{p.name}: <strong>{formatCurrency(p.value)}</strong></span>
        </div>
      ))}
    </div>
  )
}

export default function LaporanPage() {
  const { nodeId, consolidated } = useScopeStore()
  const [activeId, setActiveId] = useState('posisi')
  const [period, setPeriod] = useState({ year: TODAY_Y, month: TODAY_M })
  // Standard (RPT-S) reports must respect the Scope Switcher's node + consolidated
  // toggle — a Daerah-scoped user should see only their own data. Konsolidasi
  // (RPT-K) reports are always fully consolidated by definition, regardless of
  // the toggle (FR-KONSOL-01).
  const scopedNodeIds = resolveScopeNodeIds(nodeId, consolidated)
  const consolidatedNodeIds = resolveScopeNodeIds(nodeId, true)
  const childCount = orgNodes.filter((n) => n.parent_id === nodeId).length

  const activeItem = REPORT_GROUPS.flatMap((g) => g.items).find((i) => i.id === activeId)

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <FileBarChart size={18} className="text-blue-600" />
        <h1 className="text-lg font-semibold text-slate-800">Laporan Keuangan</h1>
      </div>
      <p className="text-sm text-slate-500 mb-5">Laporan standar PSAK 109 / ISAK 35 & laporan konsolidasi multi-node — {getNodeById(nodeId)?.name}</p>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        <Card className="lg:sticky lg:top-20 self-start">
          <CardContent className="pt-4 pb-3">
            {REPORT_GROUPS.map((group) => (
              <div key={group.label} className="mb-3 last:mb-0">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide px-2 mb-1.5">{group.label}</p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setActiveId(item.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors',
                        activeId === item.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                      )}
                    >
                      <item.icon size={14} className="shrink-0" />
                      <span className="truncate flex-1">{item.name}</span>
                      {activeId === item.id && <ChevronRight size={12} />}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <Select value={period.month} onChange={(e) => setPeriod((p) => ({ ...p, month: Number(e.target.value) }))} className="w-40">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{formatMonthLabel(period.year, m)}</option>)}
            </Select>
            <Select value={period.year} onChange={(e) => setPeriod((p) => ({ ...p, year: Number(e.target.value) }))} className="w-24">
              {[2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
            {!consolidated && childCount > 0 && <Badge variant="amber">Aktifkan mode Konsolidasi di Scope Switcher untuk laporan multi-node</Badge>}
          </div>

          <Card>
            <CardContent className="pt-6">
              {activeId === 'posisi' && <PosisiKeuanganReport nodeId={nodeId} consolidated={consolidated} period={period} />}
              {activeId === 'aktivitas' && <AktivitasReport nodeId={nodeId} consolidated={consolidated} period={period} />}
              {activeId === 'perubahan-neto' && <PerubahanNetoReport nodeId={nodeId} consolidated={consolidated} period={period} />}
              {activeId === 'arus-kas' && <ArusKasReport nodeId={nodeId} consolidated={consolidated} period={period} />}
              {activeId === 'penerimaan-penggunaan' && <PenerimaanPenggunaanReport nodeIds={scopedNodeIds} period={period} />}
              {activeId === 'dana-terikat' && <DanaTerikatReport nodeId={nodeId} consolidated={consolidated} period={period} />}
              {activeId === 'distribusi-asnaf' && <DistribusiAsnafReport nodeIds={scopedNodeIds} period={period} />}
              {activeId === 'donatur' && <DonaturReport nodeIds={scopedNodeIds} />}
              {activeId === 'buku-besar-fund' && <BukuBesarFundReport nodeIds={scopedNodeIds} period={period} />}
              {activeId === 'budget-vs-actual' && <BudgetVsActualReport period={period} />}
              {activeId === 'campaign' && <CampaignReport />}
              {activeId === 'ca-aging' && <CaAgingReport nodeIds={scopedNodeIds} />}
              {activeId === 'trial-balance' && <TrialBalanceLink />}
              {activeId === 'posisi-konsolidasi' && <PosisiKeuanganReport nodeId={nodeId} consolidated={true} period={period} showByNode nodeIds={consolidatedNodeIds} />}
              {activeId === 'aktivitas-konsolidasi' && <AktivitasReport nodeId={nodeId} consolidated={true} period={period} />}
              {activeId === 'rekap-penerimaan-node' && <RekapPerNodeReport nodeId={nodeId} period={period} mode="penerimaan" />}
              {activeId === 'rekap-pengeluaran-node' && <RekapPerNodeReport nodeId={nodeId} period={period} mode="penyaluran" />}
              {activeId === 'budget-konsolidasi' && <BudgetVsActualReport period={period} />}
              {activeId === 'perbandingan-node' && <PerbandinganNodeReport nodeId={nodeId} period={period} />}
              {activeId === 'dana-konsolidasi' && <DanaTerikatReport nodeId={nodeId} consolidated={true} period={period} />}
              {activeId === 'distribusi-konsolidasi' && <DistribusiAsnafReport nodeIds={consolidatedNodeIds} period={period} />}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
function PosisiKeuanganReport({ nodeId, consolidated, period, showByNode, nodeIds }) {
  const data = useMemo(() => computeLaporanPosisiKeuangan({ nodeId, consolidated, year: period.year, month: period.month }), [nodeId, consolidated, period])
  const [view, setView] = useState('summary')
  const byNode = useMemo(() => (showByNode ? computeByNodeBreakdown({ nodeId, year: period.year, month: period.month }) : []), [showByNode, nodeId, period])

  return (
    <ReportShell code="RPT-S-01" name="Laporan Posisi Keuangan" description={`Per akhir ${formatMonthLabel(period.year, period.month)} — ISAK 35 / PSAK 109`}>
      {showByNode && (
        <div className="mb-4"><Pills options={[{ value: 'summary', label: 'Summary' }, { value: 'bynode', label: 'By Node' }]} active={view} onChange={setView} /></div>
      )}
      {(!showByNode || view === 'summary') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">ASET</p>
            <LineRow label="Kas Kecil" value={data.aset.kasKecil} indent={1} />
            <LineRow label="Bank" value={data.aset.bank} indent={1} />
            <LineRow label="Piutang Karyawan" value={data.aset.piutang} indent={1} />
            <LineRow label="Total Aset Lancar" value={data.aset.totalAsetLancar} bold border />
            <LineRow label="Aset Tetap (Bruto)" value={data.aset.asetTetapBruto} indent={1} />
            <LineRow label="Akumulasi Penyusutan" value={-data.aset.akumPenyusutan} indent={1} tone="red" />
            <LineRow label="Total Aset Tidak Lancar" value={data.aset.totalAsetTidakLancar} bold border />
            <LineRow label="TOTAL ASET" value={data.aset.totalAset} bold border tone="green" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">KEWAJIBAN & SALDO DANA</p>
            <LineRow label="Utang kepada Mitra/Vendor" value={data.kewajiban.utangVendor} indent={1} />
            <LineRow label="Titipan Dana Pihak Ketiga" value={data.kewajiban.titipanPihakKetiga} indent={1} />
            <LineRow label="Total Kewajiban" value={data.kewajiban.totalKewajiban} bold border />
            <LineRow label="Dana Tidak Terikat" value={data.saldoDana.danaTidakTerikat} indent={1} />
            <LineRow label="Dana Terikat Sementara" value={data.saldoDana.danaTerikatSementara} indent={1} />
            <LineRow label="Dana Terikat Permanen" value={data.saldoDana.danaTerikatPermanen} indent={1} />
            <LineRow label="Total Saldo Dana" value={data.saldoDana.totalSaldoDana} bold border />
            <LineRow label="TOTAL KEWAJIBAN + SALDO DANA" value={data.totalPassiva} bold border tone="green" />
          </div>
        </div>
      )}
      {showByNode && view === 'bynode' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b text-left text-xs text-slate-500 uppercase"><th className="py-2 px-3">Node</th><th className="py-2 px-3 text-right">Penerimaan</th><th className="py-2 px-3 text-right">Penyaluran</th><th className="py-2 px-3 text-right">Saldo</th></tr></thead>
            <tbody>
              {byNode.map((r) => (
                <tr key={r.node.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5 px-3 font-medium text-slate-700">{r.node.name}</td>
                  <td className="py-2.5 px-3 text-right tabular">{formatCurrency(r.penerimaan)}</td>
                  <td className="py-2.5 px-3 text-right tabular">{formatCurrency(r.penyaluran)}</td>
                  <td className="py-2.5 px-3 text-right tabular font-semibold">{formatCurrency(r.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className={cn('mt-6 rounded-lg px-4 py-3 text-sm flex items-center gap-2', data.balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
        {data.balanced ? 'Aset = Kewajiban + Saldo Dana (BALANCE)' : 'Tidak seimbang — periksa data jurnal.'}
      </div>
    </ReportShell>
  )
}

// ============================================================================
function AktivitasReport({ nodeId, consolidated, period }) {
  const data = useMemo(() => computeLaporanAktivitas({ nodeId, consolidated, yFrom: period.year, mFrom: period.month, yTo: period.year, mTo: period.month }), [nodeId, consolidated, period])
  const chartData = [
    { name: 'Tidak Terikat', penerimaan: data.byClass.tidak_terikat.penerimaan, penyaluran: data.byClass.tidak_terikat.penyaluran },
    { name: 'Terikat Sementara', penerimaan: data.byClass.terikat_sementara.penerimaan, penyaluran: data.byClass.terikat_sementara.penyaluran },
    { name: 'Terikat Permanen', penerimaan: data.byClass.terikat_permanen.penerimaan, penyaluran: data.byClass.terikat_permanen.penyaluran },
  ]
  return (
    <ReportShell code="RPT-S-02" name="Laporan Aktivitas" description={`Periode ${formatMonthLabel(period.year, period.month)} — Perubahan Aset Neto per kelas dana`}>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} />
          <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={65} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="penerimaan" name="Penerimaan" fill={CATEGORICAL[0]} radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Bar dataKey="penyaluran" name="Penyaluran" fill={CATEGORICAL[1]} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
        {[['tidak_terikat', 'Tidak Terikat'], ['terikat_sementara', 'Terikat Sementara'], ['terikat_permanen', 'Terikat Permanen']].map(([key, label]) => (
          <div key={key}>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">{label}</p>
            <LineRow label="Penerimaan" value={data.byClass[key].penerimaan} />
            <LineRow label="Penyaluran" value={-data.byClass[key].penyaluran} tone="red" />
            <LineRow label="Perubahan Bersih" value={data.byClass[key].perubahanBersih} bold border />
          </div>
        ))}
      </div>
      <LineRow label="TOTAL PERUBAHAN ASET NETO" value={data.totalPerubahanBersih} bold border tone="green" />
    </ReportShell>
  )
}

// ============================================================================
function PerubahanNetoReport({ nodeId, consolidated, period }) {
  const ytd = useMemo(() => computeLaporanAktivitas({ nodeId, consolidated, yFrom: period.year, mFrom: 1, yTo: period.year, mTo: period.month }), [nodeId, consolidated, period])
  const opening = useMemo(() => computeLaporanPosisiKeuangan({ nodeId, consolidated, year: period.year - 1, month: 12 }), [nodeId, consolidated, period])
  const classes = [['tidak_terikat', 'Tidak Terikat', opening.saldoDana.danaTidakTerikat], ['terikat_sementara', 'Terikat Sementara', opening.saldoDana.danaTerikatSementara], ['terikat_permanen', 'Terikat Permanen', opening.saldoDana.danaTerikatPermanen]]
  return (
    <ReportShell code="RPT-S-03" name="Laporan Perubahan Aset Neto" description={`Tahun berjalan s.d. ${formatMonthLabel(period.year, period.month)}`}>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b text-left text-xs text-slate-500 uppercase">
              <th className="py-2 px-3">Kelas Dana</th>
              <th className="py-2 px-3 text-right">Saldo Awal Tahun</th>
              <th className="py-2 px-3 text-right">Penerimaan (YTD)</th>
              <th className="py-2 px-3 text-right">Penyaluran (YTD)</th>
              <th className="py-2 px-3 text-right">Saldo Akhir</th>
            </tr>
          </thead>
          <tbody>
            {classes.map(([key, label, saldoAwal]) => (
              <tr key={key} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 px-3 font-medium text-slate-700">{label}</td>
                <td className="py-2.5 px-3 text-right tabular">{formatCurrency(saldoAwal)}</td>
                <td className="py-2.5 px-3 text-right tabular text-emerald-600">{formatCurrency(ytd.byClass[key].penerimaan)}</td>
                <td className="py-2.5 px-3 text-right tabular text-red-500">{formatCurrency(ytd.byClass[key].penyaluran)}</td>
                <td className="py-2.5 px-3 text-right tabular font-semibold">{formatCurrency(saldoAwal + ytd.byClass[key].perubahanBersih)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportShell>
  )
}

// ============================================================================
function ArusKasReport({ nodeId, consolidated, period }) {
  const data = useMemo(() => computeArusKas({ nodeId, consolidated, yFrom: period.year, mFrom: period.month, yTo: period.year, mTo: period.month }), [nodeId, consolidated, period])
  const trend = useMemo(() => {
    const months = []
    let y = period.year, m = period.month
    for (let i = 0; i < 6; i++) { months.unshift({ year: y, month: m }); m--; if (m < 1) { m = 12; y-- } }
    return months.map(({ year, month }) => {
      const d = computeArusKas({ nodeId, consolidated, yFrom: year, mFrom: month, yTo: year, mTo: month })
      return { label: formatMonthShort(year, month), net: d.kenaikanBersihKas }
    })
  }, [nodeId, consolidated, period])

  return (
    <ReportShell code="RPT-S-04" name="Laporan Arus Kas" description={`Periode ${formatMonthLabel(period.year, period.month)} — metode langsung`}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={trend} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} />
          <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={65} />
          <Tooltip content={<ChartTooltip />} />
          <Area type="monotone" dataKey="net" name="Kenaikan Bersih Kas" stroke={CATEGORICAL[0]} fill={CATEGORICAL[0]} fillOpacity={0.3} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-6">
        <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Aktivitas Operasional</p>
        <LineRow label="Penerimaan Donasi" value={data.penerimaanDonasi} indent={1} tone="green" />
        <LineRow label="Penyaluran Program" value={data.penyaluranProgram} indent={1} tone="red" />
        <LineRow label="Beban Operasional" value={data.opex} indent={1} tone="red" />
        <LineRow label="Cash Advance (net)" value={data.caNet} indent={1} tone="red" />
        <LineRow label="Total Arus Kas Operasional" value={data.totalOperasional} bold border />
        <p className="text-xs font-semibold text-slate-400 uppercase mb-1 mt-4">Aktivitas Lainnya</p>
        <LineRow label="Transfer Antar Node" value={data.internodeNet} indent={1} />
        <LineRow label="Investasi Aset" value={data.asetInvestasi} indent={1} />
        <LineRow label="KENAIKAN BERSIH KAS" value={data.kenaikanBersihKas} bold border tone="green" />
      </div>
    </ReportShell>
  )
}

// ============================================================================
function PenerimaanPenggunaanReport({ nodeIds, period }) {
  const key = `${period.year}-${String(period.month).padStart(2, '0')}`
  const monthDonations = donations.filter((d) => nodeIds.includes(d.org_node_id) && d.status === 'posted' && d.donation_date.startsWith(key))
  const monthDist = distributions.filter((d) => nodeIds.includes(d.org_node_id) && d.status === 'posted' && d.dist_date.startsWith(key))
  const byFund = funds.map((f) => ({ fund: f, amount: monthDonations.filter((d) => d.fund_id === f.id).reduce((s, d) => s + d.amount, 0) })).filter((r) => r.amount > 0)
  const byAsnaf = Object.keys(ASNAF_LABEL).map((k) => ({ label: ASNAF_LABEL[k], amount: monthDist.filter((d) => d.asnaf_category === k).reduce((s, d) => s + d.amount, 0) })).filter((r) => r.amount > 0)
  const totalPenerimaan = byFund.reduce((s, r) => s + r.amount, 0)
  const totalPenyaluran = byAsnaf.reduce((s, r) => s + r.amount, 0)

  return (
    <ReportShell code="RPT-S-05" name="Laporan Penerimaan & Penggunaan Dana" description={`Format PSAK 109 — ${formatMonthLabel(period.year, period.month)}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Penerimaan per Jenis Dana</p>
          {byFund.map((r) => <LineRow key={r.fund.id} label={r.fund.fund_name} value={r.amount} indent={1} />)}
          <LineRow label="Total Penerimaan" value={totalPenerimaan} bold border tone="green" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Penggunaan Dana per Asnaf</p>
          {byAsnaf.map((r) => <LineRow key={r.label} label={r.label} value={r.amount} indent={1} />)}
          <LineRow label="Total Penyaluran" value={totalPenyaluran} bold border tone="red" />
        </div>
      </div>
      <LineRow label="SURPLUS (DEFISIT) BULAN INI" value={totalPenerimaan - totalPenyaluran} bold border tone="green" />
    </ReportShell>
  )
}

// ============================================================================
function DanaTerikatReport({ nodeId, consolidated, period }) {
  const data = useMemo(() => computeSaldoDanaPerFund({ nodeId, consolidated, year: period.year, month: period.month }), [nodeId, consolidated, period])
  const pieData = [
    { name: 'Tidak Terikat', value: Math.max(0, data.totalByType.unrestricted) },
    { name: 'Terikat Sementara', value: Math.max(0, data.totalByType.temporarily_restricted) },
    { name: 'Terikat Permanen', value: Math.max(0, data.totalByType.restricted) },
  ]
  return (
    <ReportShell code="RPT-S-06" name="Laporan Dana Terikat & Tidak Terikat" description={`Saldo per akhir ${formatMonthLabel(period.year, period.month)}`}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {pieData.map((_, i) => <Cell key={i} fill={CATEGORICAL[i]} stroke="#fff" strokeWidth={2} />)}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="overflow-x-auto rounded-xl border border-slate-200 self-start">
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b text-left text-xs text-slate-500 uppercase"><th className="py-2 px-3">Fund</th><th className="py-2 px-3 text-right">Saldo</th></tr></thead>
            <tbody>
              {data.rows.filter((r) => r.saldo !== 0).sort((a, b) => b.saldo - a.saldo).map((r) => (
                <tr key={r.fund.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 px-3 text-slate-700">{r.fund.fund_name}</td>
                  <td className="py-2 px-3 text-right tabular font-medium">{formatCurrency(r.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ReportShell>
  )
}

// ============================================================================
function DistribusiAsnafReport({ nodeIds, period }) {
  const scoped = distributions.filter((d) => nodeIds.includes(d.org_node_id) && d.status === 'posted')
  const byProgram = programs.map((p) => ({ name: p.program_name, value: scoped.filter((d) => d.program_id === p.id).reduce((s, d) => s + d.amount, 0) })).filter((r) => r.value > 0).sort((a, b) => b.value - a.value)
  const byAsnaf = Object.entries(ASNAF_LABEL).map(([k, label]) => ({ label, value: scoped.filter((d) => d.asnaf_category === k).reduce((s, d) => s + d.amount, 0) })).filter((r) => r.value > 0)
  return (
    <ReportShell code="RPT-S-07" name="Laporan Distribusi per Program / Asnaf" description="Kumulatif seluruh periode — format pelaporan BAZNAS/LAZ">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Per Program</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byProgram} layout="vertical" margin={{ left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 9, fill: CHART_INK.secondary }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" fill={CATEGORICAL[1]} radius={[0, 4, 4, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Per Kategori Asnaf</p>
          {byAsnaf.map((r) => <LineRow key={r.label} label={r.label} value={r.value} />)}
          <LineRow label="Total" value={byAsnaf.reduce((s, r) => s + r.value, 0)} bold border />
        </div>
      </div>
    </ReportShell>
  )
}

// ============================================================================
function DonaturReport({ nodeIds }) {
  const donors = contacts.filter((c) => c.contact_type === 'donor' && nodeIds.includes(c.org_node_id))
  const rows = donors
    .map((d) => {
      const list = donations.filter((don) => don.donor_id === d.id && don.status === 'posted')
      const total = list.reduce((s, don) => s + don.amount, 0)
      const last = list.sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date))[0]
      const daysSince = last ? Math.floor((TODAY - new Date(last.donation_date)) / 86400000) : Infinity
      return { donor: d, total, count: list.length, lastDate: last?.donation_date, status: daysSince <= 60 ? 'active' : list.length > 0 ? 'lapsed' : 'never' }
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.total - a.total)

  const active = rows.filter((r) => r.status === 'active').length
  const lapsed = rows.filter((r) => r.status === 'lapsed').length

  return (
    <ReportShell code="RPT-S-08" name="Laporan Donatur" description="Top Donatur, Aktif vs Lapsed (>60 hari tanpa donasi)">
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="rounded-lg bg-emerald-50 p-3 text-center"><p className="text-xl font-semibold text-emerald-700">{active}</p><p className="text-xs text-emerald-600">Donatur Aktif</p></div>
        <div className="rounded-lg bg-amber-50 p-3 text-center"><p className="text-xl font-semibold text-amber-700">{lapsed}</p><p className="text-xs text-amber-600">Donatur Lapsed</p></div>
        <div className="rounded-lg bg-slate-50 p-3 text-center"><p className="text-xl font-semibold text-slate-700">{rows.length}</p><p className="text-xs text-slate-500">Total Donatur Berdonasi</p></div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b text-left text-xs text-slate-500 uppercase"><th className="py-2 px-3">Donatur</th><th className="py-2 px-3">Tier</th><th className="py-2 px-3 text-right">Total Donasi</th><th className="py-2 px-3 text-right">Jml Transaksi</th><th className="py-2 px-3">Donasi Terakhir</th><th className="py-2 px-3">Status</th></tr></thead>
          <tbody>
            {rows.slice(0, 15).map((r) => (
              <tr key={r.donor.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2 px-3 font-medium text-slate-700">{r.donor.name}</td>
                <td className="py-2 px-3"><Badge variant="purple">{r.donor.donor_tier}</Badge></td>
                <td className="py-2 px-3 text-right tabular font-medium">{formatCurrency(r.total)}</td>
                <td className="py-2 px-3 text-right tabular">{r.count}</td>
                <td className="py-2 px-3 text-slate-500">{formatDate(r.lastDate)}</td>
                <td className="py-2 px-3">{r.status === 'active' ? <Badge variant="green">Aktif</Badge> : <Badge variant="amber">Lapsed</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportShell>
  )
}

// ============================================================================
function BukuBesarFundReport({ nodeIds, period }) {
  const [fundId, setFundId] = useState(funds[0].id)
  const scoped = donations.filter((d) => nodeIds.includes(d.org_node_id) && d.fund_id === Number(fundId) && d.status === 'posted')
  const dist = distributions.filter((d) => nodeIds.includes(d.org_node_id) && d.fund_id === Number(fundId) && d.status === 'posted')
  const combined = [
    ...scoped.map((d) => ({ date: d.donation_date, desc: `Penerimaan — ${getContactById(d.donor_id)?.name}`, debit: 0, credit: d.amount })),
    ...dist.map((d) => ({ date: d.dist_date, desc: `Penyaluran — ${getContactById(d.recipient_id)?.name}`, debit: d.amount, credit: 0 })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date))
  let running = 0
  const withBalance = combined.map((r) => { running += r.credit - r.debit; return { ...r, balance: running } })

  return (
    <ReportShell code="RPT-S-09" name="Buku Besar per Fund/Dana" description="Riwayat mutasi & saldo berjalan per dana">
      <Select value={fundId} onChange={(e) => setFundId(e.target.value)} className="w-56 mb-4">
        {funds.map((f) => <option key={f.id} value={f.id}>{f.fund_name}</option>)}
      </Select>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b text-left text-xs text-slate-500 uppercase"><th className="py-2 px-3">Tanggal</th><th className="py-2 px-3">Keterangan</th><th className="py-2 px-3 text-right">Debit</th><th className="py-2 px-3 text-right">Kredit</th><th className="py-2 px-3 text-right">Saldo</th></tr></thead>
          <tbody>
            {withBalance.slice(-30).map((r, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0">
                <td className="py-2 px-3 text-slate-500">{formatDate(r.date)}</td>
                <td className="py-2 px-3 text-slate-600">{r.desc}</td>
                <td className="py-2 px-3 text-right tabular">{r.debit > 0 ? formatCurrency(r.debit) : ''}</td>
                <td className="py-2 px-3 text-right tabular">{r.credit > 0 ? formatCurrency(r.credit) : ''}</td>
                <td className="py-2 px-3 text-right tabular font-medium">{formatCurrency(r.balance)}</td>
              </tr>
            ))}
            {withBalance.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">Belum ada mutasi.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-400 mt-2">Menampilkan 30 transaksi terakhir dari total {withBalance.length}.</p>
    </ReportShell>
  )
}

// ============================================================================
function BudgetVsActualReport({ period }) {
  const rows = getBudgetsForPeriod(period.year, period.month, 'penyaluran').map((b) => {
    const actual = getActualForBudget(b)
    return { label: getProgramById(b.program_id)?.program_name, budget: b.amount, actual, pct: b.amount ? Math.round((actual / b.amount) * 100) : 0 }
  })
  return (
    <ReportShell code="RPT-S-10 / RPT-K-07" name="Budget Program vs Realisasi" description={formatMonthLabel(period.year, period.month)}>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
          <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={65} />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="budget" name="Budget" fill={CATEGORICAL[0]} radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Bar dataKey="actual" name="Realisasi" fill={CATEGORICAL[1]} radius={[4, 4, 0, 0]} maxBarSize={26} />
        </BarChart>
      </ResponsiveContainer>
    </ReportShell>
  )
}

// ============================================================================
function CampaignReport() {
  const rows = campaigns.map((c) => {
    const raised = donations.filter((d) => d.campaign_id === c.id && d.status === 'posted').reduce((s, d) => s + d.amount, 0)
    return { ...c, raised, pct: Math.min(100, Math.round((raised / c.target_amount) * 100)) }
  })
  return (
    <ReportShell code="RPT-S-11" name="Rekap Campaign Fundraising" description="Progress seluruh campaign terhadap target">
      <div className="space-y-4">
        {rows.map((c) => (
          <div key={c.id} className="rounded-lg border border-slate-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium text-slate-700">{c.campaign_name}</p>
                <p className="text-xs text-slate-400">{formatDate(c.start_date)} — {c.end_date ? formatDate(c.end_date) : 'berjalan'}</p>
              </div>
              <StatusBadge status={c.status} />
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-1.5">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${c.pct}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{formatCurrency(c.raised)} terkumpul</span>
              <span className="font-medium">{c.pct}% dari {formatCurrency(c.target_amount, { compact: true })}</span>
            </div>
          </div>
        ))}
      </div>
    </ReportShell>
  )
}

// ============================================================================
function CaAgingReport({ nodeIds }) {
  const outstanding = cashAdvances.filter((c) => nodeIds.includes(c.org_node_id) && !['settled', 'cancelled'].includes(c.status)).map((c) => ({ ...c, days: Math.max(0, Math.floor((TODAY - new Date(c.need_date)) / 86400000)) }))
  const buckets = ['Current', '1-7 hari', '8-14 hari', '15-30 hari', '>30 hari']
  const data = buckets.map((name) => {
    const inBucket = outstanding.filter((c) => {
      if (name === 'Current') return c.days === 0
      if (name === '1-7 hari') return c.days >= 1 && c.days <= 7
      if (name === '8-14 hari') return c.days >= 8 && c.days <= 14
      if (name === '15-30 hari') return c.days >= 15 && c.days <= 30
      return c.days > 30
    })
    return { name, value: inBucket.reduce((s, c) => s + c.amount_requested, 0), count: inBucket.length }
  })
  return (
    <ReportShell code="RPT-S-12" name="Cash Advance Aging" description="Distribusi CA outstanding berdasarkan umur tunggakan">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} />
          <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={65} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((d, i) => <Cell key={i} fill={d.name === 'Current' ? STATUS.good : d.name === '>30 hari' ? STATUS.critical : STATUS.warning} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ReportShell>
  )
}

// ============================================================================
function TrialBalanceLink() {
  return (
    <ReportShell code="RPT-S-13" name="Trial Balance (Neraca Saldo)" description="Laporan Trial Balance memiliki halaman interaktif tersendiri">
      <div className="rounded-lg bg-blue-50 border border-blue-100 p-6 text-center">
        <Scale size={28} className="text-blue-500 mx-auto mb-2" />
        <p className="text-sm text-blue-700 mb-3">Buka halaman <strong>Tutup Buku</strong> untuk Trial Balance lengkap dengan drill-down transaksi, validasi balance, dan proses Closing.</p>
        <Button onClick={() => (window.location.href = '/tutup-buku')}>Buka Tutup Buku <ChevronRight size={14} /></Button>
      </div>
    </ReportShell>
  )
}

// ============================================================================
function RekapPerNodeReport({ nodeId, period, mode }) {
  const rows = computeByNodeBreakdown({ nodeId, year: period.year, month: period.month })
  return (
    <ReportShell
      code={mode === 'penerimaan' ? 'RPT-K-05' : 'RPT-K-06'}
      name={mode === 'penerimaan' ? 'Rekapitulasi Penerimaan per Node' : 'Rekapitulasi Pengeluaran per Node'}
      description={formatMonthLabel(period.year, period.month)}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={rows.map((r) => ({ name: r.node.short_code, value: mode === 'penerimaan' ? r.penerimaan : r.penyaluran }))} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} />
          <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={65} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" fill={mode === 'penerimaan' ? CATEGORICAL[0] : CATEGORICAL[1]} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
      <div className="overflow-x-auto rounded-xl border border-slate-200 mt-4">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b text-left text-xs text-slate-500 uppercase"><th className="py-2 px-3">Node</th><th className="py-2 px-3 text-right">{mode === 'penerimaan' ? 'Penerimaan' : 'Penyaluran'}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.node.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2 px-3 font-medium text-slate-700">{r.node.name}</td>
                <td className="py-2 px-3 text-right tabular font-medium">{formatCurrency(mode === 'penerimaan' ? r.penerimaan : r.penyaluran)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportShell>
  )
}

// ============================================================================
function PerbandinganNodeReport({ nodeId, period }) {
  const rows = computeByNodeBreakdown({ nodeId, year: period.year, month: period.month })
  return (
    <ReportShell code="RPT-K-08" name="Perbandingan Kinerja Antar Node" description={formatMonthLabel(period.year, period.month)}>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b text-left text-xs text-slate-500 uppercase"><th className="py-2 px-3">Node</th><th className="py-2 px-3 text-right">Penerimaan</th><th className="py-2 px-3 text-right">Penyaluran</th><th className="py-2 px-3 text-right">Saldo Bersih</th><th className="py-2 px-3 text-right">Rasio Penyaluran</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.node.id} className="border-b border-slate-50 last:border-0">
                <td className="py-2.5 px-3 font-medium text-slate-700">{r.node.name}</td>
                <td className="py-2.5 px-3 text-right tabular">{formatCurrency(r.penerimaan)}</td>
                <td className="py-2.5 px-3 text-right tabular">{formatCurrency(r.penyaluran)}</td>
                <td className={cn('py-2.5 px-3 text-right tabular font-semibold', r.saldo >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(r.saldo)}</td>
                <td className="py-2.5 px-3 text-right tabular">{r.penerimaan ? `${Math.round((r.penyaluran / r.penerimaan) * 100)}%` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportShell>
  )
}
