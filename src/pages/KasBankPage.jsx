import { useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { Plus, ArrowLeftRight, Landmark, Wallet, TriangleAlert } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { Modal } from '../components/ui/Modal'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { FormField, FormGrid, Input, Select, Textarea } from '../components/ui/Field'
import { useScopedNodeIds } from '../lib/scope'
import { useLedgerStore } from '../store/useLedgerStore'
import { bankAccounts, journals, journalItems, getNodeById, getCoaById, TODAY_Y, TODAY_M, TODAY_D } from '../data'
import { formatCurrency, formatDate } from '../lib/format'
import { CATEGORICAL, CHART_INK, STATUS } from '../lib/chartColors'

const todayStr = `${TODAY_Y}-${String(TODAY_M).padStart(2, '0')}-${String(TODAY_D).padStart(2, '0')}`
function emptyTransfer() {
  return { fromAccId: '', toAccId: '', amount: '', date: todayStr, description: '' }
}

export default function KasBankPage() {
  const nodeIds = useScopedNodeIds()
  const version = useLedgerStore((s) => s.version)
  const transferFunds = useLedgerStore((s) => s.transferFunds)
  const [transferOpen, setTransferOpen] = useState(false)
  const [selectedAcc, setSelectedAcc] = useState(null)
  const [transferForm, setTransferForm] = useState(emptyTransfer())
  const [transferError, setTransferError] = useState(null)

  const scopedAccounts = useMemo(() => bankAccounts.filter((a) => nodeIds.includes(a.org_node_id)), [nodeIds, version])
  const totalBalance = scopedAccounts.reduce((s, a) => s + a.current_balance, 0)
  const lowBalanceAccounts = scopedAccounts.filter((a) => a.current_balance < a.min_balance * 1.3)

  const chartData = scopedAccounts.map((a) => ({ name: a.account_name.length > 16 ? a.account_name.slice(0, 14) + '…' : a.account_name, saldo: a.current_balance, min: a.min_balance }))

  const mutations = useMemo(() => {
    const cashCoaIds = new Set(bankAccounts.map((a) => a.coa_id))
    const journalById = new Map(journals.map((j) => [j.id, j]))
    return journalItems
      .filter((ji) => cashCoaIds.has(ji.coa_id) && nodeIds.includes(ji.org_node_id))
      .map((ji) => ({ ...ji, journal: journalById.get(ji.journal_id) }))
      .filter((ji) => ji.journal)
      .sort((a, b) => new Date(b.journal.journal_date) - new Date(a.journal.journal_date) || b.journal_id - a.journal_id)
      .slice(0, 200)
  }, [nodeIds, version])

  const filteredMutations = selectedAcc ? mutations.filter((m) => m.coa_id === selectedAcc.coa_id) : mutations

  const columns = [
    { header: 'Tanggal', cell: (r) => formatDate(r.journal.journal_date) },
    { header: 'Rekening', cell: (r) => bankAccounts.find((a) => a.coa_id === r.coa_id)?.account_name },
    { header: 'Keterangan', cell: (r) => <span className="truncate max-w-[260px] block text-slate-600">{r.narration || r.journal.description}</span> },
    { header: 'No. Jurnal', cell: (r) => <span className="font-mono text-[11px] text-blue-700">{r.journal.journal_no}</span> },
    { header: 'Debit', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular text-emerald-600">{r.debit > 0 ? formatCurrency(r.debit) : ''}</span> },
    { header: 'Kredit', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular text-red-500">{r.credit > 0 ? formatCurrency(r.credit) : ''}</span> },
  ]

  return (
    <div>
      <PageHeader
        title="Kas & Bank"
        description="Saldo real-time seluruh rekening bank & kas kecil (Imprest System)"
        actions={<Button onClick={() => { setTransferForm(emptyTransfer()); setTransferError(null); setTransferOpen(true) }}><ArrowLeftRight size={15} /> Transfer Antar Rekening</Button>}
      />

      {lowBalanceAccounts.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-2.5 text-sm text-amber-700">
          <TriangleAlert size={16} className="shrink-0" />
          <span><strong>{lowBalanceAccounts.length} rekening</strong> mendekati/di bawah saldo minimum: {lowBalanceAccounts.map((a) => a.account_name).join(', ')}.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {scopedAccounts.map((a) => (
          <button key={a.id} onClick={() => setSelectedAcc(selectedAcc?.id === a.id ? null : a)} className="text-left">
            <Card className={`p-4 h-full transition-shadow hover:shadow-md ${selectedAcc?.id === a.id ? 'ring-2 ring-blue-400' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${a.account_type === 'kas' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                  {a.account_type === 'kas' ? <Wallet size={15} /> : <Landmark size={15} />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500 truncate">{a.bank_name}</p>
                  <p className="text-[11px] text-slate-400 truncate font-mono">{a.account_no}</p>
                </div>
              </div>
              <p className="text-lg font-semibold text-slate-800 tabular">{formatCurrency(a.current_balance, { compact: true })}</p>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{a.account_name} · {getNodeById(a.org_node_id)?.short_code}</p>
              {a.current_balance < a.min_balance && <Badge variant="red" className="mt-1.5">Di bawah minimum</Badge>}
            </Card>
          </button>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader><div><CardTitle>Saldo per Rekening</CardTitle><CardDescription>Dibandingkan dengan threshold saldo minimum</CardDescription></div></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: CHART_INK.muted }} axisLine={{ stroke: CHART_INK.axis }} tickLine={false} interval={0} angle={-15} textAnchor="end" height={55} />
              <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} tick={{ fontSize: 10, fill: CHART_INK.muted }} axisLine={false} tickLine={false} width={65} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="saldo" name="Saldo" radius={[4, 4, 0, 0]} maxBarSize={28}>
                {chartData.map((d, i) => <Cell key={i} fill={d.saldo < d.min ? STATUS.critical : CATEGORICAL[0]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Riwayat Mutasi {selectedAcc ? `— ${selectedAcc.account_name}` : ''}</CardTitle>
            <CardDescription>{selectedAcc ? 'Klik kartu rekening lagi untuk menampilkan semua mutasi' : 'Klik salah satu kartu rekening di atas untuk memfilter'}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filteredMutations} searchable={false} rowKey={(r) => r.id} pageSize={10} />
        </CardContent>
      </Card>

      <Modal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Transfer Antar Rekening"
        description="Sistem otomatis membuat jurnal transfer: Debit Rek. Tujuan / Kredit Rek. Asal"
        footer={<><Button variant="secondary" onClick={() => setTransferOpen(false)}>Batal</Button><Button onClick={() => {
          if (!transferForm.fromAccId || !transferForm.toAccId) return setTransferError('Rekening asal & tujuan wajib dipilih.')
          if (!transferForm.amount || Number(transferForm.amount) <= 0) return setTransferError('Nominal harus lebih dari 0.')
          const fromAcc = bankAccounts.find((a) => a.id === Number(transferForm.fromAccId))
          const toAcc = bankAccounts.find((a) => a.id === Number(transferForm.toAccId))
          try {
            transferFunds({ nodeId: fromAcc.org_node_id, fromCoaId: fromAcc.coa_id, toCoaId: toAcc.coa_id, amount: Number(transferForm.amount), date: transferForm.date, description: transferForm.description || `Transfer ${fromAcc.account_name} → ${toAcc.account_name}` })
            setTransferOpen(false)
          } catch (e) { setTransferError(e.message) }
        }}>Proses Transfer</Button></>}
      >
        <ErrorBanner message={transferError} />
        <FormGrid>
          <FormField label="Rekening Asal" required>
            <Select value={transferForm.fromAccId} onChange={(e) => setTransferForm((f) => ({ ...f, fromAccId: e.target.value }))}>
              <option value="">— Pilih Rekening —</option>
              {scopedAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_name} — {formatCurrency(a.current_balance, { compact: true })}</option>)}
            </Select>
          </FormField>
          <FormField label="Rekening Tujuan" required>
            <Select value={transferForm.toAccId} onChange={(e) => setTransferForm((f) => ({ ...f, toAccId: e.target.value }))}>
              <option value="">— Pilih Rekening —</option>
              {scopedAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_name}</option>)}
            </Select>
          </FormField>
          <FormField label="Nominal" required><Input type="number" placeholder="Rp" value={transferForm.amount} onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))} /></FormField>
          <FormField label="Tanggal" required><Input type="date" value={transferForm.date} onChange={(e) => setTransferForm((f) => ({ ...f, date: e.target.value }))} /></FormField>
        </FormGrid>
        <FormField label="Keterangan" className="mt-4"><Textarea placeholder="cth. Pemindahan dana operasional bulanan" value={transferForm.description} onChange={(e) => setTransferForm((f) => ({ ...f, description: e.target.value }))} /></FormField>
      </Modal>
    </div>
  )
}
