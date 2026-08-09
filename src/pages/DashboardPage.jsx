import { useMemo } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  Treemap,
} from 'recharts'
import { HandCoins, Send, Landmark, PiggyBank, Target, TriangleAlert, Sparkles, ArrowRight } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { useScopeStore } from '../store/useScopeStore'
import { useScopedNodeIds } from '../lib/scope'
import {
  TODAY_Y,
  TODAY_M,
  donations,
  distributions,
  cashAdvances,
  campaigns,
  programs,
  getFundById,
  getProgramById,
  getContactById,
  getNodeById,
  orgNodes,
} from '../data'
import { computeSaldoDanaPerFund, computeMonthlyTrend, computeByNodeBreakdown } from '../data/reports'
import { getBudgetsForPeriod, getActualForBudget } from '../data/budgets'
import { formatCurrency, formatMonthShort, formatDate } from '../lib/format'
import { CATEGORICAL, STATUS, CHART_INK } from '../lib/chartColors'

function monthsBack(n) {
  const out = []
  let y = TODAY_Y,
    m = TODAY_M
  for (let i = 0; i < n; i++) {
    out.unshift({ year: y, month: m })
    m--
    if (m < 1) { m = 12; y-- }
  }
  return out
}

function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-1.5 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span>{p.name}:</span>
          <span className="font-medium tabular">{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { nodeId, consolidated } = useScopeStore()
  const nodeIds = useScopedNodeIds()
  const node = getNodeById(nodeId)
  const childCount = orgNodes.filter((n) => n.parent_id === nodeId).length

  const monthDonations = useMemo(
    () =>
      donations.filter(
        (d) => nodeIds.includes(d.org_node_id) && d.status === 'posted' && d.donation_date.startsWith(`${TODAY_Y}-${String(TODAY_M).padStart(2, '0')}`)
      ),
    [nodeIds]
  )
  const monthDistributions = useMemo(
    () =>
      distributions.filter(
        (d) => nodeIds.includes(d.org_node_id) && d.status === 'posted' && d.dist_date.startsWith(`${TODAY_Y}-${String(TODAY_M).padStart(2, '0')}`)
      ),
    [nodeIds]
  )
  const totalPenerimaanMTD = monthDonations.reduce((s, d) => s + d.amount, 0)
  const totalDistribusiMTD = monthDistributions.reduce((s, d) => s + d.amount, 0)

  const saldoDana = useMemo(() => computeSaldoDanaPerFund({ nodeId, consolidated, year: TODAY_Y, month: TODAY_M }), [nodeId, consolidated])

  const activeCampaigns = campaigns.filter((c) => c.status === 'active')
  const campaignProgress = activeCampaigns.map((c) => {
    const raised = donations.filter((d) => d.campaign_id === c.id && d.status === 'posted').reduce((s, d) => s + d.amount, 0)
    return { ...c, raised, pct: Math.min(100, Math.round((raised / c.target_amount) * 100)) }
  })
  const avgCampaignPct = campaignProgress.length ? Math.round(campaignProgress.reduce((s, c) => s + c.pct, 0) / campaignProgress.length) : 0

  const trend = useMemo(() => {
    const months = monthsBack(12)
    const data = computeMonthlyTrend({ nodeId, consolidated, yFrom: months[0].year, mFrom: months[0].month, yTo: months[11].year, mTo: months[11].month })
    return data.map((d) => ({ ...d, label: formatMonthShort(d.year, d.month) }))
  }, [nodeId, consolidated])

  const fundBarData = useMemo(() => {
    const byFund = new Map()
    for (const d of monthDonations) {
      byFund.set(d.fund_id, (byFund.get(d.fund_id) || 0) + d.amount)
    }
    return Array.from(byFund.entries())
      .map(([fundId, amount]) => ({ name: getFundById(fundId).fund_name, amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [monthDonations])

  const fundTypePie = [
    { name: 'Tidak Terikat', value: Math.max(0, saldoDana.totalByType.unrestricted) },
    { name: 'Terikat Sementara', value: Math.max(0, saldoDana.totalByType.temporarily_restricted) },
    { name: 'Terikat Permanen', value: Math.max(0, saldoDana.totalByType.restricted) },
  ]

  const treemapData = useMemo(() => {
    const byProgram = new Map()
    for (const d of monthDistributions) {
      byProgram.set(d.program_id, (byProgram.get(d.program_id) || 0) + d.amount)
    }
    return Array.from(byProgram.entries())
      .filter(([, v]) => v > 0)
      .map(([programId, amount], i) => ({ name: getProgramById(programId)?.program_name || 'Lainnya', size: amount, fill: CATEGORICAL[i % CATEGORICAL.length] }))
  }, [monthDistributions])

  const dailyDonations = useMemo(() => {
    const days = []
    const end = new Date(TODAY_Y, TODAY_M - 1, 8)
    for (let i = 29; i >= 0; i--) {
      const d = new Date(end)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const total = donations.filter((don) => nodeIds.includes(don.org_node_id) && don.status === 'posted' && don.donation_date === key).reduce((s, don) => s + don.amount, 0)
      days.push({ date: key, total })
    }
    return days
  }, [nodeIds])

  const pendingDonations = donations
    .filter((d) => nodeIds.includes(d.org_node_id) && d.status !== 'posted')
    .sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date))
    .slice(0, 6)

  const caBelumLpj = cashAdvances
    .filter((c) => nodeIds.includes(c.org_node_id) && !['settled', 'cancelled'].includes(c.status))
    .map((c) => ({ ...c, overdueDays: Math.max(0, Math.floor((new Date(TODAY_Y, TODAY_M - 1, 8) - new Date(c.need_date)) / 86400000)) }))
    .sort((a, b) => b.overdueDays - a.overdueDays)
    .slice(0, 6)

  const overBudgetPrograms = useMemo(() => {
    const budgetRows = getBudgetsForPeriod(TODAY_Y, TODAY_M, 'penyaluran')
    return budgetRows
      .map((b) => {
        const actual = getActualForBudget(b)
        return { program: getProgramById(b.program_id), budget: b.amount, actual, pct: b.amount ? Math.round((actual / b.amount) * 100) : 0 }
      })
      .filter((r) => r.pct >= 80)
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5)
  }, [])

  const nodeBreakdown = useMemo(() => (childCount > 0 && consolidated ? computeByNodeBreakdown({ nodeId, year: TODAY_Y, month: TODAY_M }) : []), [nodeId, consolidated, childCount])

  const prevTrend = trend[trend.length - 2]
  const curTrend = trend[trend.length - 1]
  const trendChangePct = prevTrend && prevTrend.penerimaan > 0 ? ((curTrend.penerimaan - prevTrend.penerimaan) / prevTrend.penerimaan) * 100 : 0

  const topFund = fundBarData[0]
  const nearTargetCampaign = campaignProgress.filter((c) => c.pct < 100).sort((a, b) => b.pct - a.pct)[0]

  return (
    <div>
      <PageHeader
        title="Dashboard Dana & Program"
        description={`${node?.name}${consolidated && childCount > 0 ? ' — Tampilan Konsolidasi' : ''} · Periode berjalan: ${formatMonthShort(TODAY_Y, TODAY_M).replace("'", " 20")}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Penerimaan Donasi (MTD)" value={formatCurrency(totalPenerimaanMTD, { compact: true })} icon={HandCoins} tone="blue" sub={`${monthDonations.length} transaksi posted`} />
        <StatCard label="Distribusi & Penyaluran (MTD)" value={formatCurrency(totalDistribusiMTD, { compact: true })} icon={Send} tone="amber" sub={`${monthDistributions.length} transaksi posted`} />
        <StatCard label="Saldo Dana Terikat" value={formatCurrency(saldoDana.totalByType.restricted + saldoDana.totalByType.temporarily_restricted, { compact: true })} icon={Landmark} tone="purple" sub="Permanen + Sementara" />
        <StatCard label="Saldo Dana Tidak Terikat" value={formatCurrency(saldoDana.totalByType.unrestricted, { compact: true })} icon={PiggyBank} tone="green" sub="Termasuk aset & cadangan umum" />
        <StatCard label="Pencapaian Campaign Aktif" value={`${avgCampaignPct}%`} icon={Target} tone="slate" sub={`${activeCampaigns.length} campaign berjalan`} />
      </div>

      {childCount > 0 && consolidated && (
        <Card className="mb-6">
          <CardHeader>
            <div>
              <CardTitle>Perbandingan Kinerja Antar Node</CardTitle>
              <CardDescription>Ringkasan penerimaan & penyaluran bulan berjalan per node dalam scope konsolidasi</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase tracking-wide">
                    <th className="py-2 font-medium">Node</th>
                    <th className="py-2 font-medium text-right">Penerimaan</th>
                    <th className="py-2 font-medium text-right">Penyaluran</th>
                    <th className="py-2 font-medium text-right">Saldo Bersih</th>
                  </tr>
                </thead>
                <tbody>
                  {nodeBreakdown.map((r) => (
                    <tr key={r.node.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 text-slate-700 font-medium">{r.node.name}</td>
                      <td className="py-2.5 text-right text-slate-600 tabular">{formatCurrency(r.penerimaan, { compact: true })}</td>
                      <td className="py-2.5 text-right text-slate-600 tabular">{formatCurrency(r.penyaluran, { compact: true })}</td>
                      <td className={`py-2.5 text-right font-medium tabular ${r.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(r.saldo, { compact: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Tren Penerimaan vs Penyaluran — 12 Bulan Terakhir</CardTitle>
              <CardDescription>Akumulasi jurnal terposting per bulan, scope {consolidated && childCount > 0 ? 'konsolidasi' : 'node ini'}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trend} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} />
                <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 11, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={70} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="penerimaan" name="Penerimaan" stroke={CATEGORICAL[0]} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="penyaluran" name="Penyaluran" stroke={CATEGORICAL[1]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Donasi Harian — 30 Hari Terakhir</CardTitle>
              <CardDescription>Sparkline penerimaan donasi harian</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyDonations} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} labelFormatter={() => ''} />
                <Line type="monotone" dataKey="total" name="Donasi" stroke={CATEGORICAL[2]} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Penerimaan per Jenis Dana</CardTitle>
              <CardDescription>Bulan {formatMonthShort(TODAY_Y, TODAY_M)}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={fundBarData} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: CHART_INK.secondary }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                <Bar dataKey="amount" name="Penerimaan" fill={CATEGORICAL[0]} radius={[0, 4, 4, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Komposisi Saldo Dana</CardTitle>
              <CardDescription>Terikat vs Tidak Terikat, s.d. periode ini</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={fundTypePie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {fundTypePie.map((_, i) => (
                    <Cell key={i} fill={CATEGORICAL[i]} stroke="#fff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip formatter={(v) => formatCurrency(v)} />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Distribusi per Program</CardTitle>
              <CardDescription>Bulan {formatMonthShort(TODAY_Y, TODAY_M)}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <Treemap data={treemapData} dataKey="size" stroke="#fff" fill={CATEGORICAL[0]} content={<TreemapCell />} />
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Donasi Menunggu Konfirmasi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {pendingDonations.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">Tidak ada donasi pending.</p>}
              {pendingDonations.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 text-sm border-b border-slate-50 last:border-0 pb-2.5 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-700 truncate">{getContactById(d.donor_id)?.name}</p>
                    <p className="text-xs text-slate-400">{getFundById(d.fund_id)?.fund_name} · {formatDate(d.donation_date)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium tabular text-slate-700">{formatCurrency(d.amount, { compact: true })}</p>
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cash Advance Belum LPJ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {caBelumLpj.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">Semua CA sudah LPJ.</p>}
              {caBelumLpj.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 text-sm border-b border-slate-50 last:border-0 pb-2.5 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-700 truncate">{c.ca_no}</p>
                    <p className="text-xs text-slate-400 truncate">{c.purpose}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium tabular text-slate-700">{formatCurrency(c.amount_requested, { compact: true })}</p>
                    {c.overdueDays > 0 ? (
                      <Badge variant="red">{c.overdueDays} hari lewat</Badge>
                    ) : (
                      <StatusBadge status={c.status} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Program Mendekati / Lewat Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overBudgetPrograms.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">Semua program dalam batas anggaran.</p>}
              {overBudgetPrograms.map((r) => (
                <div key={r.program.id} className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-slate-700 truncate flex items-center gap-1.5">
                      {r.pct >= 100 && <TriangleAlert size={13} className="text-red-500" />}
                      {r.program.program_name}
                    </p>
                    <span className={`text-xs font-semibold ${r.pct >= 100 ? 'text-red-600' : 'text-amber-600'}`}>{r.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full rounded-full ${r.pct >= 100 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, r.pct)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-blue-600 to-blue-700 border-0 text-white">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1.5">AI Financial Insight</p>
              <p className="text-sm text-blue-50 leading-relaxed">
                Penerimaan donasi bulan {formatMonthShort(TODAY_Y, TODAY_M)} {trendChangePct >= 0 ? 'naik' : 'turun'}{' '}
                <strong>{Math.abs(trendChangePct).toFixed(1)}%</strong> dibanding bulan lalu
                {topFund ? (
                  <>
                    , didorong oleh <strong>{topFund.name}</strong> yang menyumbang {formatCurrency(topFund.amount, { compact: true })}
                  </>
                ) : null}
                . {nearTargetCampaign ? (
                  <>
                    Campaign <strong>{nearTargetCampaign.campaign_name}</strong> telah mencapai {nearTargetCampaign.pct}% dari target — pertahankan momentum promosi untuk menutup sisa {formatCurrency(nearTargetCampaign.target_amount - nearTargetCampaign.raised, { compact: true })}.
                  </>
                ) : null}
                {overBudgetPrograms.length > 0 ? (
                  <> Waspadai <strong>{overBudgetPrograms[0].program.program_name}</strong> yang realisasinya sudah {overBudgetPrograms[0].pct}% dari anggaran bulan ini.</>
                ) : null}
              </p>
              <button className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-white/90 hover:text-white">
                Buka FinBot untuk analisis lebih lanjut <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function TreemapCell({ x, y, width, height, name, size, fill }) {
  if (width < 2 || height < 2) return null
  const showLabel = width > 70 && height > 32
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} style={{ fill, stroke: '#fff', strokeWidth: 2 }} />
      {showLabel && (
        <>
          <text x={x + 8} y={y + 18} fill="#fff" fontSize={11} fontWeight={600}>
            {name?.length > 22 ? name.slice(0, 20) + '…' : name}
          </text>
          <text x={x + 8} y={y + 34} fill="#fff" fontSize={10} opacity={0.85}>
            {formatCurrency(size, { compact: true })}
          </text>
        </>
      )}
    </g>
  )
}
