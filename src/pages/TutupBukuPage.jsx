import { useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, Folder, FileText, Search, Download, Lock, TriangleAlert, CircleCheck, Clock, CornerDownRight } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { Select, FormField, Textarea } from '../components/ui/Field'
import { useScopeStore } from '../store/useScopeStore'
import { useLedgerStore } from '../store/useLedgerStore'
import { resolveScopeNodeIds, filterJournalItems, computeTrialBalance } from '../data/reports'
import { getNodeById, getCoaById, journals, journalItems, closingCutoffConfig, closingOverrideLog, getProgramById, getCostCenterById, ORG_NAME, TODAY, TODAY_Y, TODAY_M } from '../data'
import { formatCurrency, formatDate, formatMonthLabel } from '../lib/format'
import { cn } from '../lib/utils'

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const ACCOUNT_TYPE_GROUP = { all: 'All COA', asset: 'Aset', liability: 'Kewajiban', fund_balance: 'Saldo Dana', revenue: 'Penerimaan', expense: 'Penyaluran' }
const GROUP_OPTIONS = { none: 'Tanpa Group', program: 'Per Program', cost_center: 'Per Cost Center' }

function collectGroupIds(node, set) {
  if (node.children?.length) {
    set.add(node.coa.id)
    node.children.forEach((c) => collectGroupIds(c, set))
  }
}

function getGroupBreakdown(coaId, dimension, nodeIds, year, month) {
  if (dimension === 'none') return []
  const items = filterJournalItems({ nodeIds, yFrom: year, mFrom: month, yTo: year, mTo: month }).filter((ji) => ji.coa_id === coaId)
  const key = dimension === 'program' ? 'program_id' : 'cost_center_id'
  const map = new Map()
  for (const ji of items) {
    const dimId = ji[key]
    if (!dimId) continue
    const cur = map.get(dimId) || { debit: 0, credit: 0 }
    cur.debit += ji.debit
    cur.credit += ji.credit
    map.set(dimId, cur)
  }
  return Array.from(map.entries())
    .map(([dimId, v]) => ({
      dimId,
      label: dimension === 'program' ? getProgramById(dimId)?.program_name : getCostCenterById(dimId)?.name,
      ...v,
    }))
    .filter((r) => r.label)
    .sort((a, b) => b.debit + b.credit - (a.debit + a.credit))
}

function TreeRow({ node, depth, expanded, onToggle, onDrill, filterType, level, closed, groupBy, nodeIds, year, month }) {
  if (filterType !== 'all' && node.coa.account_type !== filterType && !(node.children?.length)) return null
  const isVisible = level === 'all' || node.coa.coa_level <= level
  if (!isVisible) return null
  const hasChildren = node.children?.length > 0
  const isExpanded = expanded.has(node.coa.id)
  const isLeaf = !hasChildren
  const groupRows = isLeaf && groupBy !== 'none' ? getGroupBreakdown(node.coa.id, groupBy, nodeIds, year, month) : []

  return (
    <>
      <tr
        className={cn('border-b border-slate-50 hover:bg-slate-50/70', isLeaf && 'cursor-pointer group')}
        onClick={() => isLeaf && onDrill(node)}
      >
        <td className="py-2 px-3">
          <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 18}px` }}>
            {hasChildren ? (
              <button onClick={(e) => { e.stopPropagation(); onToggle(node.coa.id) }} className="text-slate-400 hover:text-slate-600">
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            ) : (
              <span className="w-3.5" />
            )}
            {hasChildren ? <Folder size={13} className="text-amber-500" /> : <FileText size={12} className="text-slate-400" />}
          </div>
        </td>
        <td className="py-2 px-3 font-mono text-xs text-slate-500">{node.coa.account_code}</td>
        <td className="py-2 px-3">
          <span className={cn('text-sm group-hover:text-blue-600', hasChildren ? 'font-semibold text-slate-700' : 'text-slate-600')}>{node.coa.account_name}</span>
        </td>
        <td className="py-2 px-3 text-right tabular text-xs text-slate-500">{formatCurrency(node.saldoAwal)}</td>
        <td className="py-2 px-3 text-right tabular text-xs text-slate-500">{node.debitMutasi > 0 ? formatCurrency(node.debitMutasi) : ''}</td>
        <td className="py-2 px-3 text-right tabular text-xs text-slate-500">{node.creditMutasi > 0 ? formatCurrency(node.creditMutasi) : ''}</td>
        <td className="py-2 px-3 text-right tabular text-sm text-slate-600">{formatCurrency(node.neracaSaldo)}</td>
        <td className="py-2 px-3 text-right tabular text-xs text-slate-400">{node.debitDisesuaikan > 0 ? formatCurrency(node.debitDisesuaikan) : ''}</td>
        <td className="py-2 px-3 text-right tabular text-xs text-slate-400">{node.creditDisesuaikan > 0 ? formatCurrency(node.creditDisesuaikan) : ''}</td>
        <td className={cn('py-2 px-3 text-right tabular text-sm font-semibold', closed ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-100 text-pink-600')}>
          {formatCurrency(node.neracaDisesuaikan)}
        </td>
      </tr>
      {isLeaf && groupRows.map((g) => (
        <tr key={`${node.coa.id}-${g.dimId}`} className="border-b border-slate-50 bg-slate-50/40">
          <td className="py-1.5 px-3" />
          <td className="py-1.5 px-3" />
          <td className="py-1.5 px-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500" style={{ paddingLeft: `${(depth + 1) * 18}px` }}>
              <CornerDownRight size={11} className="text-slate-300" />
              {g.label}
            </div>
          </td>
          <td />
          <td className="py-1.5 px-3 text-right tabular text-[11px] text-slate-400">{g.debit > 0 ? formatCurrency(g.debit) : ''}</td>
          <td className="py-1.5 px-3 text-right tabular text-[11px] text-slate-400">{g.credit > 0 ? formatCurrency(g.credit) : ''}</td>
          <td colSpan={4} />
        </tr>
      ))}
      {hasChildren && isExpanded && node.children.map((c) => (
        <TreeRow key={c.coa.id} node={c} depth={depth + 1} expanded={expanded} onToggle={onToggle} onDrill={onDrill} filterType={filterType} level={level} closed={closed} groupBy={groupBy} nodeIds={nodeIds} year={year} month={month} />
      ))}
    </>
  )
}

export default function TutupBukuPage() {
  const { nodeId, consolidated } = useScopeStore()
  const [year, setYear] = useState(TODAY_Y)
  const [month, setMonth] = useState(TODAY_M === 1 ? 12 : TODAY_M - 1)
  const [filterType, setFilterType] = useState('all')
  const [level, setLevel] = useState('all')
  const [groupBy, setGroupBy] = useState('none')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(new Set())
  const [drillAccount, setDrillAccount] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)
  const [closingConfirm, setClosingConfirm] = useState(false)
  const [closingError, setClosingError] = useState(null)
  const [overrideReason, setOverrideReason] = useState('')

  const version = useLedgerStore((s) => s.version)
  const closePeriod = useLedgerStore((s) => s.closePeriod)
  const requestCutoffOverride = useLedgerStore((s) => s.requestCutoffOverride)

  const result = useMemo(() => computeTrialBalance({ nodeId, consolidated, year, month }), [nodeId, consolidated, year, month, version])
  const scopedNodeIds = useMemo(() => resolveScopeNodeIds(nodeId, consolidated), [nodeId, consolidated])
  const cutoffConfig = closingCutoffConfig.find((c) => c.org_node_id === nodeId)
  const node = getNodeById(nodeId)

  const allIds = useMemo(() => {
    const set = new Set()
    result.tree.forEach((n) => collectGroupIds(n, set))
    return set
  }, [result])

  const expandAll = () => setExpanded(new Set(allIds))
  const collapseAll = () => setExpanded(new Set())
  const expandToLevel = (targetLevel) => {
    if (!targetLevel) return
    const set = new Set()
    const walk = (n) => {
      if (n.children?.length && n.coa.coa_level < targetLevel) {
        set.add(n.coa.id)
        n.children.forEach(walk)
      }
    }
    result.tree.forEach(walk)
    setExpanded(set)
  }

  // Cutoff calculations
  const closeMonth = month === 12 ? 1 : month + 1
  const closeYear = month === 12 ? year + 1 : year
  const cutoffDate = cutoffConfig ? new Date(closeYear, closeMonth - 1, cutoffConfig.cutoff_day) : null
  const daysLeft = cutoffDate ? Math.ceil((cutoffDate - TODAY) / 86400000) : null
  const isPastCutoff = cutoffDate ? TODAY > cutoffDate : false
  const pendingOverride = closingOverrideLog.find((o) => o.org_node_id === nodeId && o.period_year === year && o.period_month === month && o.status === 'pending')

  const hasImbalance = Object.values(result.validations).some((v) => Math.round(v.diff) !== 0)
  const canClickClosing = !hasImbalance && (!isPastCutoff || cutoffConfig?.mode === 'approval')
  const closingDisabledReason = hasImbalance
    ? 'Selesaikan selisih sebelum melakukan Closing.'
    : isPastCutoff && cutoffConfig?.mode === 'strict'
    ? `Batas Closing periode ini (${formatDate(cutoffDate.toISOString())}) telah terlewat. Hubungi Super Admin untuk override.`
    : null

  const drillTransactions = useMemo(() => {
    if (!drillAccount) return []
    const journalById = new Map(journals.map((j) => [j.id, j]))
    return journalItems
      .filter((ji) => ji.coa_id === drillAccount.coa.id)
      .map((ji) => ({ ...ji, journal: journalById.get(ji.journal_id) }))
      .filter((ji) => ji.journal && ji.journal.period_year === year && ji.journal.period_month === month && scopedNodeIds.includes(ji.org_node_id))
      .sort((a, b) => new Date(b.journal.journal_date) - new Date(a.journal.journal_date))
  }, [drillAccount, year, month, scopedNodeIds])
  const drillTotalPages = Math.max(1, Math.ceil(drillTransactions.length / pageSize))
  const drillPageData = drillTransactions.slice((page - 1) * pageSize, page * pageSize)

  const filterTree = (nodes) => {
    if (!search.trim()) return nodes
    const q = search.toLowerCase()
    const matches = (n) => n.coa.account_code.toLowerCase().includes(q) || n.coa.account_name.toLowerCase().includes(q)
    const walk = (n) => {
      const selfMatch = matches(n)
      const childResults = (n.children || []).map(walk).filter(Boolean)
      if (selfMatch || childResults.length) {
        if (childResults.length) expanded.add(n.coa.id)
        return { ...n, children: childResults }
      }
      return null
    }
    return nodes.map(walk).filter(Boolean)
  }
  const visibleTree = filterTree(result.tree)

  return (
    <div>
      <PageHeader title="Tutup Buku" description="Trial Balance interaktif — drill-down transaksi, validasi balance & cutoff otomatis" />

      <Card className="mb-4">
        <CardContent className="pt-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <Select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-24">
              {[2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
            </Select>
            <Select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-40">
              {MONTHS.map((m) => <option key={m} value={m}>{formatMonthLabel(year, m)}</option>)}
            </Select>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari akun..." className="h-9 w-44 rounded-lg border border-slate-300 pl-7 pr-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400" />
            </div>
            <Button variant="secondary" size="sm"><Download size={13} /> Export</Button>

            <div className="flex items-center gap-1.5 ml-auto flex-wrap">
              <Button
                size="sm"
                disabled={result.isClosed || (!canClickClosing && !pendingOverride) || !!pendingOverride}
                title={result.isClosed ? 'Periode ini sudah ditutup.' : pendingOverride ? 'Menunggu keputusan Super Admin di Approval Center.' : closingDisabledReason || ''}
                onClick={() => { setClosingError(null); setOverrideReason(''); setClosingConfirm(true) }}
              >
                <Lock size={13} />{' '}
                {result.isClosed ? 'Sudah Ditutup' : pendingOverride ? 'Menunggu Persetujuan Override' : isPastCutoff && cutoffConfig?.mode === 'approval' ? 'Ajukan Override' : 'Closing'}
              </Button>
              <Button variant="secondary" size="sm" onClick={collapseAll}>CollapseAll</Button>
              <Button variant="secondary" size="sm" onClick={expandAll}>ExpandAll</Button>
              <Select onChange={(e) => expandToLevel(Number(e.target.value))} className="w-32" defaultValue="">
                <option value="" disabled>ExpandTo</option>
                {[1, 2, 3, 4].map((l) => <option key={l} value={l}>Level {l}</option>)}
              </Select>
              <Select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="w-36">
                {Object.entries(GROUP_OPTIONS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
              <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-36">
                {Object.entries(ACCOUNT_TYPE_GROUP).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
              <Select value={level} onChange={(e) => setLevel(e.target.value === 'all' ? 'all' : Number(e.target.value))} className="w-28">
                <option value="all">All Level</option>
                {[1, 2, 3, 4].map((l) => <option key={l} value={l}>Level {l}</option>)}
              </Select>
            </div>
          </div>

          {cutoffConfig && (
            <div className={cn('mt-3 rounded-lg px-3.5 py-2.5 text-xs flex items-center gap-2', isPastCutoff ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600')}>
              {isPastCutoff ? <TriangleAlert size={14} className="shrink-0" /> : <Clock size={14} className="shrink-0" />}
              <span>
                Batas Closing periode {formatMonthLabel(year, month)}: <strong>{cutoffDate && formatDate(cutoffDate.toISOString())}</strong>.{' '}
                {isPastCutoff ? (
                  <strong>CUTOFF TERLEWAT</strong>
                ) : (
                  <>Sisa waktu: {daysLeft} hari.</>
                )}{' '}
                Mode: <strong className="capitalize">{cutoffConfig.mode}</strong>.
              </span>
              {pendingOverride && <Badge variant="purple" className="ml-auto shrink-0">Override Pending</Badge>}
            </div>
          )}

          {hasImbalance && (
            <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-600 flex items-center gap-2">
              <TriangleAlert size={15} className="shrink-0" />
              Trial Balance tidak seimbang — periksa baris validasi di bawah tabel.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/60 py-4 text-center">
            <p className="text-sm font-semibold text-slate-700 uppercase tracking-wide">{ORG_NAME}{consolidated && scopedNodeIds.length > 1 ? ' — Konsolidasi' : ` — ${node?.name}`}</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">Trial BALANCE</p>
            <p className="text-xs text-slate-400 mt-0.5">Periode {formatMonthLabel(year, month)}</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3">Kode Akun</th>
                  <th className="py-2.5 px-3">Nama Akun</th>
                  <th className="py-2.5 px-3 text-right">Saldo Awal</th>
                  <th className="py-2.5 px-3 text-right">Debet Mutasi</th>
                  <th className="py-2.5 px-3 text-right">Kredit Mutasi</th>
                  <th className="py-2.5 px-3 text-right">Neraca Saldo</th>
                  <th className="py-2.5 px-3 text-right">Debet Disesuaikan</th>
                  <th className="py-2.5 px-3 text-right">Kredit Disesuaikan</th>
                  <th className="py-2.5 px-3 text-right">Neraca Disesuaikan</th>
                </tr>
              </thead>
              <tbody>
                {visibleTree.map((n) => (
                  <TreeRow
                    key={n.coa.id}
                    node={n}
                    depth={0}
                    expanded={expanded}
                    onToggle={(id) => setExpanded((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })}
                    onDrill={(n) => { setDrillAccount(n); setPage(1) }}
                    filterType={filterType}
                    level={level}
                    closed={result.isClosed}
                    groupBy={groupBy}
                    nodeIds={scopedNodeIds}
                    year={year}
                    month={month}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              ['Saldo Awal [Aset vs (Kewajiban+SD)]', result.validations.openingBalance],
              ['Mutasi [Debet vs Kredit]', result.validations.mutasi],
              ['Penyesuaian [Debet vs Kredit]', result.validations.penyesuaian],
              ['Saldo Akhir [Aset vs (Kewajiban+SD)]', result.validations.closingBalance],
            ].map(([label, v]) => {
              const isBalance = Math.round(v.diff) === 0
              return (
                <div key={label} className={cn('flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm', isBalance ? 'bg-emerald-50' : 'bg-red-50')}>
                  <span className="text-slate-600">
                    <FileText size={13} className="inline mr-1.5 -mt-0.5 text-slate-400" />
                    {label}
                  </span>
                  <span className={cn('font-bold flex items-center gap-1.5', isBalance ? 'text-emerald-600' : 'text-red-600')}>
                    {isBalance ? <CircleCheck size={14} /> : <TriangleAlert size={14} />}
                    {isBalance ? 'BALANCE' : `SELISIH ${formatCurrency(Math.abs(v.diff))}`}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="text-[11px] text-slate-400 mt-3 space-y-0.5">
            <p>- Saldo awal diambil dari penutupan periode sebelumnya.</p>
            <p>- Warna <span className="text-emerald-600 font-medium bg-emerald-100 px-1 rounded">hijau</span> di Neraca Disesuaikan menunjukkan data sudah ditutup (Closing).</p>
            <p>- Warna <span className="text-pink-600 font-medium bg-pink-100 px-1 rounded">pink</span> di Neraca Disesuaikan menunjukkan data belum ditutup, masih dapat berubah.</p>
            <p>- Tombol "Closing" digunakan untuk menutup "Neraca Disesuaikan" menjadi saldo akhir per bulan/tahun/kantor.</p>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={!!drillAccount}
        onClose={() => setDrillAccount(null)}
        title={`Jurnal Akun ${drillAccount?.coa.account_name}`}
        description={`${consolidated && scopedNodeIds.length > 1 ? 'Konsolidasi' : node?.name} · ${formatMonthLabel(year, month)}`}
        size="xl"
      >
        {drillAccount && (
          <div>
            <div className="overflow-x-auto rounded-lg border border-slate-100 mb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                    <th className="py-2 px-3">Tanggal</th>
                    <th className="py-2 px-3">COA (Akun Lawan)</th>
                    <th className="py-2 px-3">Keterangan / Narasi</th>
                    <th className="py-2 px-3 text-right">Nominal</th>
                    <th className="py-2 px-3">COA Buku</th>
                  </tr>
                </thead>
                <tbody>
                  {drillPageData.map((tx) => {
                    const siblingLine = journalItems.find((ji) => ji.journal_id === tx.journal_id && ji.id !== tx.id)
                    return (
                      <tr key={tx.id} className="border-t border-slate-50">
                        <td className="py-2 px-3 text-slate-500">{formatDate(tx.journal.journal_date)}</td>
                        <td className="py-2 px-3 text-slate-600">{siblingLine ? `${getCoaById(siblingLine.coa_id)?.account_code} — ${getCoaById(siblingLine.coa_id)?.account_name}` : '—'}</td>
                        <td className="py-2 px-3 text-slate-500 text-xs">{tx.narration}</td>
                        <td className="py-2 px-3 text-right tabular font-medium">{formatCurrency(tx.debit || tx.credit)}</td>
                        <td className="py-2 px-3 font-mono text-xs text-blue-700">{tx.journal.journal_no}</td>
                      </tr>
                    )
                  })}
                  {drillPageData.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-400">Tidak ada transaksi periode ini.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>{drillTransactions.length} transaksi — Halaman {page} dari {drillTotalPages}</span>
                <Select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} className="w-24 h-7 text-xs">
                  <option value={50}>50 / hal</option>
                  <option value={100}>100 / hal</option>
                  <option value={250}>250 / hal</option>
                </Select>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <Button size="sm" variant="secondary" disabled={page >= drillTotalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={closingConfirm}
        onClose={() => setClosingConfirm(false)}
        title="Konfirmasi Tutup Buku"
        description={`Periode ${formatMonthLabel(year, month)} — ${node?.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setClosingConfirm(false)}>Batal</Button>
            <Button
              onClick={() => {
                try {
                  if (isPastCutoff && cutoffConfig?.mode === 'approval') {
                    if (!overrideReason.trim()) return setClosingError('Alasan override wajib diisi.')
                    requestCutoffOverride({ nodeId, year, month, reason: overrideReason })
                  } else {
                    closePeriod({ nodeId, year, month })
                  }
                  setClosingConfirm(false)
                } catch (e) {
                  setClosingError(e.message)
                }
              }}
            >
              {isPastCutoff && cutoffConfig?.mode === 'approval' ? 'Kirim Permintaan Override' : 'Konfirmasi Closing'}
            </Button>
          </>
        }
      >
        <ErrorBanner message={closingError} />
        <p className="text-sm text-slate-600 mb-3">
          {isPastCutoff
            ? 'Batas cutoff telah terlewat. Permintaan ini akan dikirim ke Super Admin untuk approval, beserta alasan wajib yang tercatat di Audit Trail.'
            : 'Seluruh jurnal periode ini akan terkunci. Neraca Disesuaikan menjadi saldo akhir final dan menjadi saldo awal periode berikutnya. Proses ini tercatat di Audit Trail.'}
        </p>
        {isPastCutoff && cutoffConfig?.mode === 'approval' && (
          <FormField label="Alasan Override" required>
            <Textarea value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder="cth. Menunggu rekap final donasi platform online" />
          </FormField>
        )}
      </Modal>
    </div>
  )
}
