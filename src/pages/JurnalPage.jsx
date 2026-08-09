import { useMemo, useState } from 'react'
import { Plus, Eye, Undo2, Trash2 } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { Pills } from '../components/ui/Tabs'
import { Modal } from '../components/ui/Modal'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { FormField, Input, Select, Textarea } from '../components/ui/Field'
import { useScopedNodeIds } from '../lib/scope'
import { useLedgerStore } from '../store/useLedgerStore'
import { journals, journalItems, getCoaById, getNodeById, getUserById, coa, TODAY_Y, TODAY_M, TODAY_D } from '../data'
import { formatCurrency, formatDate } from '../lib/format'

const TYPE_LABEL = { umum: 'Umum', penerimaan: 'Penerimaan', pengeluaran: 'Pengeluaran', penyesuaian: 'Penyesuaian', penutup: 'Penutup', pembalik: 'Pembalik', transfer: 'Transfer', internode: 'Antar-Node' }
const TYPE_VARIANT = { umum: 'slate', penerimaan: 'green', pengeluaran: 'red', penyesuaian: 'amber', penutup: 'purple', pembalik: 'cyan', transfer: 'blue', internode: 'purple' }
const todayStr = `${TODAY_Y}-${String(TODAY_M).padStart(2, '0')}-${String(TODAY_D).padStart(2, '0')}`

function emptyLine() {
  return { coa_id: '', debit: '', credit: '' }
}

export default function JurnalPage() {
  const nodeIds = useScopedNodeIds()
  const version = useLedgerStore((s) => s.version)
  const createManualJournal = useLedgerStore((s) => s.createManualJournal)
  const reverseJournal = useLedgerStore((s) => s.reverseJournal)

  const [tab, setTab] = useState('semua')
  const [typeFilter, setTypeFilter] = useState('all')
  const [detail, setDetail] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [glCoa, setGlCoa] = useState(null)
  const [lines, setLines] = useState([emptyLine(), emptyLine()])
  const [date, setDate] = useState(todayStr)
  const [description, setDescription] = useState('')
  const [error, setError] = useState(null)
  const [reverseTarget, setReverseTarget] = useState(null)
  const [reverseReason, setReverseReason] = useState('')
  const [reverseError, setReverseError] = useState(null)

  const scoped = useMemo(() => journals.filter((j) => nodeIds.includes(j.org_node_id)).sort((a, b) => new Date(b.journal_date) - new Date(a.journal_date) || b.id - a.id), [nodeIds, version])
  const filtered = typeFilter === 'all' ? scoped : scoped.filter((j) => j.journal_type === typeFilter)

  const leaves = coa.filter((c) => !c.is_group)
  const glEntries = useMemo(() => {
    if (!glCoa) return []
    const journalById = new Map(journals.map((j) => [j.id, j]))
    return journalItems
      .filter((ji) => ji.coa_id === Number(glCoa) && nodeIds.includes(ji.org_node_id))
      .map((ji) => ({ ...ji, journal: journalById.get(ji.journal_id) }))
      .filter((ji) => ji.journal)
      .sort((a, b) => new Date(a.journal.journal_date) - new Date(b.journal.journal_date))
      .reduce((acc, ji) => {
        const prevBalance = acc.length ? acc[acc.length - 1].balance : 0
        const acct = getCoaById(Number(glCoa))
        const delta = acct.normal_balance === 'debit' ? ji.debit - ji.credit : ji.credit - ji.debit
        acc.push({ ...ji, balance: prevBalance + delta })
        return acc
      }, [])
  }, [glCoa, nodeIds, version])

  const columns = [
    { header: 'No. Jurnal', cell: (r) => <span className="font-mono text-xs text-blue-700">{r.journal_no}</span> },
    { header: 'Tanggal', cell: (r) => formatDate(r.journal_date) },
    { header: 'Tipe', cell: (r) => <Badge variant={TYPE_VARIANT[r.journal_type]}>{TYPE_LABEL[r.journal_type]}</Badge> },
    { header: 'Deskripsi', cell: (r) => <span className="truncate max-w-[240px] block text-slate-600">{r.description}</span> },
    { header: 'Node', cell: (r) => <span className="text-xs text-slate-400">{getNodeById(r.org_node_id)?.short_code}</span> },
    { header: 'Debit = Kredit', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular font-medium">{formatCurrency(r.total_debit)}</span> },
    { header: 'Status', cell: (r) => (r.is_posted ? (r.is_reversed ? <Badge variant="purple">Dibalik</Badge> : <StatusBadge status="posted" />) : <StatusBadge status="draft" />) },
    { header: 'Lock', cell: (r) => (r.is_locked ? <Badge variant="slate">🔒 Locked</Badge> : <Badge variant="green">Terbuka</Badge>) },
    {
      header: '',
      className: 'text-right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setDetail(r)}><Eye size={13} /></Button>
          {r.is_posted && !r.is_locked && !r.is_reversed && r.journal_type !== 'pembalik' && (
            <Button size="sm" variant="ghost" title="Jurnal Pembalik" onClick={() => { setReverseTarget(r); setReverseReason(''); setReverseError(null) }}><Undo2 size={13} /></Button>
          )}
        </div>
      ),
    },
  ]

  const debitTotal = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
  const creditTotal = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
  const balanced = debitTotal === creditTotal && debitTotal > 0

  const updateLine = (i, field, value) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)))
  }

  const resetForm = () => {
    setLines([emptyLine(), emptyLine()])
    setDate(todayStr)
    setDescription('')
    setError(null)
  }

  const handleSubmit = () => {
    if (!description.trim()) return setError('Deskripsi jurnal wajib diisi.')
    if (lines.some((l) => !l.coa_id)) return setError('Semua baris harus memilih akun.')
    try {
      createManualJournal({
        nodeId: nodeIds[0] || 1,
        date,
        description,
        lines: lines.filter((l) => Number(l.debit) > 0 || Number(l.credit) > 0).map((l) => ({ coa_id: Number(l.coa_id), debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
      })
      setAddOpen(false)
      resetForm()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleReverse = () => {
    if (!reverseReason.trim()) return setReverseError('Alasan jurnal pembalik wajib diisi.')
    try {
      reverseJournal({ journalId: reverseTarget.id, reason: reverseReason })
      setReverseTarget(null)
    } catch (e) {
      setReverseError(e.message)
    }
  }

  return (
    <div>
      <PageHeader
        title="Jurnal"
        description="Jurnal Umum, Otomatis, Berulang, Pembalik & Penyesuaian — Buku Besar drill-down"
        actions={<Button onClick={() => { resetForm(); setAddOpen(true) }}><Plus size={15} /> Jurnal Umum</Button>}
      />

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Pills options={[{ value: 'semua', label: 'Semua Jurnal' }, { value: 'gl', label: 'Buku Besar (Drill-down)' }]} active={tab} onChange={setTab} />
            {tab === 'semua' && (
              <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-48">
                <option value="all">Semua Tipe</option>
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </Select>
            )}
            {tab === 'gl' && (
              <Select value={glCoa || ''} onChange={(e) => setGlCoa(e.target.value)} className="w-72">
                <option value="">— Pilih Akun COA —</option>
                {leaves.map((c) => <option key={c.id} value={c.id}>{c.account_code} — {c.account_name}</option>)}
              </Select>
            )}
          </div>

          {tab === 'semua' && <DataTable columns={columns} data={filtered} searchKeys={['journal_no', 'description']} searchPlaceholder="Cari no. jurnal..." pageSize={10} />}

          {tab === 'gl' && (
            <>
              {!glCoa && <p className="text-sm text-slate-400 py-10 text-center">Pilih akun COA untuk melihat Buku Besar.</p>}
              {glCoa && (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                        <th className="py-2.5 px-4">Tanggal</th>
                        <th className="py-2.5 px-4">No. Jurnal</th>
                        <th className="py-2.5 px-4">Narasi</th>
                        <th className="py-2.5 px-4 text-right">Debit</th>
                        <th className="py-2.5 px-4 text-right">Kredit</th>
                        <th className="py-2.5 px-4 text-right">Saldo Berjalan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {glEntries.map((e) => (
                        <tr key={e.id} className="border-b border-slate-50 last:border-0">
                          <td className="py-2 px-4 text-slate-500">{formatDate(e.journal.journal_date)}</td>
                          <td className="py-2 px-4 font-mono text-xs text-blue-700">{e.journal.journal_no}</td>
                          <td className="py-2 px-4 text-slate-600 truncate max-w-[220px]">{e.narration}</td>
                          <td className="py-2 px-4 text-right tabular">{e.debit > 0 ? formatCurrency(e.debit) : ''}</td>
                          <td className="py-2 px-4 text-right tabular">{e.credit > 0 ? formatCurrency(e.credit) : ''}</td>
                          <td className="py-2 px-4 text-right tabular font-medium">{formatCurrency(e.balance)}</td>
                        </tr>
                      ))}
                      {glEntries.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-slate-400">Tidak ada transaksi pada akun ini.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Jurnal Umum"
        description="Entri manual multi-baris — validasi Debit = Kredit sebelum simpan"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button disabled={!balanced} onClick={handleSubmit}>Simpan Jurnal</Button>
          </>
        }
      >
        <ErrorBanner message={error} />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <FormField label="Tanggal Jurnal" required><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
          <FormField label="Deskripsi" required><Input placeholder="Keterangan jurnal" value={description} onChange={(e) => setDescription(e.target.value)} /></FormField>
        </div>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_120px_32px] gap-2 items-center">
              <Select value={line.coa_id} onChange={(e) => updateLine(i, 'coa_id', e.target.value)}>
                <option value="">— Pilih Akun —</option>
                {leaves.map((c) => <option key={c.id} value={c.id}>{c.account_code} — {c.account_name}</option>)}
              </Select>
              <Input type="number" placeholder="Debit" value={line.debit} onChange={(e) => updateLine(i, 'debit', e.target.value)} />
              <Input type="number" placeholder="Kredit" value={line.credit} onChange={(e) => updateLine(i, 'credit', e.target.value)} />
              <button onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => setLines((prev) => [...prev, emptyLine()])} className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700">
          + Tambah Baris
        </button>
        <div className={`mt-4 flex items-center justify-between rounded-lg px-3 py-2.5 text-sm ${balanced ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          <span>Total Debit: <strong className="tabular">{formatCurrency(debitTotal)}</strong> · Total Kredit: <strong className="tabular">{formatCurrency(creditTotal)}</strong></span>
          <span className="font-semibold">{balanced ? 'BALANCE' : `SELISIH ${formatCurrency(Math.abs(debitTotal - creditTotal))}`}</span>
        </div>
      </Modal>

      <Modal
        open={!!reverseTarget}
        onClose={() => setReverseTarget(null)}
        title="Jurnal Pembalik"
        description={reverseTarget?.journal_no}
        footer={<><Button variant="secondary" onClick={() => setReverseTarget(null)}>Batal</Button><Button variant="danger" onClick={handleReverse}>Buat Jurnal Pembalik</Button></>}
      >
        <ErrorBanner message={reverseError} />
        <p className="text-sm text-slate-600 mb-3">
          Jurnal asal tidak dapat diedit/dihapus (Business Rule Audit Immutability). Sistem akan membuat jurnal baru dengan debit/kredit terbalik, tertanggal hari ini.
        </p>
        <FormField label="Alasan Pembalikan" required>
          <Textarea value={reverseReason} onChange={(e) => setReverseReason(e.target.value)} placeholder="cth. Salah input akun / nominal" />
        </FormField>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.journal_no} description={detail?.description} size="lg">
        {detail && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
              <div><p className="text-xs text-slate-400 mb-0.5">Tanggal</p><p className="font-medium">{formatDate(detail.journal_date)}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Tipe</p><Badge variant={TYPE_VARIANT[detail.journal_type]}>{TYPE_LABEL[detail.journal_type]}</Badge></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Dibuat oleh</p><p className="font-medium">{getUserById(detail.created_by)?.full_name}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Diposting oleh</p><p className="font-medium">{detail.posted_by ? getUserById(detail.posted_by)?.full_name : '—'}</p></div>
            </div>
            {detail.is_reversed && <Badge variant="purple" className="mb-3">Jurnal ini telah dibalik (Jurnal Pembalik)</Badge>}
            {detail.reverse_of_id && <Badge variant="cyan" className="mb-3">Jurnal pembalik dari #{journals.find((j) => j.id === detail.reverse_of_id)?.journal_no}</Badge>}
            <div className="overflow-x-auto rounded-lg border border-slate-100">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs text-slate-500 uppercase">
                    <th className="py-2 px-3">Akun</th>
                    <th className="py-2 px-3">Narasi</th>
                    <th className="py-2 px-3 text-right">Debit</th>
                    <th className="py-2 px-3 text-right">Kredit</th>
                  </tr>
                </thead>
                <tbody>
                  {journalItems.filter((ji) => ji.journal_id === detail.id).map((ji) => (
                    <tr key={ji.id} className="border-t border-slate-50">
                      <td className="py-2 px-3 text-slate-700">{getCoaById(ji.coa_id)?.account_code} — {getCoaById(ji.coa_id)?.account_name}</td>
                      <td className="py-2 px-3 text-slate-500 text-xs">{ji.narration}</td>
                      <td className="py-2 px-3 text-right tabular">{ji.debit > 0 ? formatCurrency(ji.debit) : ''}</td>
                      <td className="py-2 px-3 text-right tabular">{ji.credit > 0 ? formatCurrency(ji.credit) : ''}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 font-semibold">
                    <td colSpan={2} className="py-2 px-3 text-right text-xs text-slate-500">TOTAL</td>
                    <td className="py-2 px-3 text-right tabular">{formatCurrency(detail.total_debit)}</td>
                    <td className="py-2 px-3 text-right tabular">{formatCurrency(detail.total_credit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
