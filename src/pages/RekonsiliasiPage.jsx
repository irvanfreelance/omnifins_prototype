import { useMemo, useState } from 'react'
import { CheckCircle2, AlertCircle, BookPlus, Download } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/StatCard'
import { Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { FormField, FormGrid, Input } from '../components/ui/Field'
import { useScopedNodeIds } from '../lib/scope'
import { useLedgerStore } from '../store/useLedgerStore'
import { bankAccounts, bankStatements, reconMatches, journalItems, journals, coa, getCoaById } from '../data'
import { formatCurrency, formatDate } from '../lib/format'

const leafCoaOptions = coa.filter((c) => !c.is_group && c.account_type !== 'asset')

export default function RekonsiliasiPage() {
  const nodeIds = useScopedNodeIds()
  const version = useLedgerStore((s) => s.version)
  const createJournalFromStatement = useLedgerStore((s) => s.createJournalFromStatement)
  const scopedAccounts = useMemo(() => bankAccounts.filter((a) => nodeIds.includes(a.org_node_id) && a.account_type !== 'kas'), [nodeIds, version])
  const [accId, setAccId] = useState(scopedAccounts[0]?.id)
  const [journalModal, setJournalModal] = useState(null)
  const [counterCoaId, setCounterCoaId] = useState('')
  const [journalDesc, setJournalDesc] = useState('')
  const [journalError, setJournalError] = useState(null)

  const account = bankAccounts.find((a) => a.id === Number(accId)) || scopedAccounts[0]
  const statements = useMemo(
    () => bankStatements.filter((s) => s.bank_account_id === account?.id).sort((a, b) => new Date(b.txn_date) - new Date(a.txn_date)),
    [account?.id, version]
  )

  const matchInfo = (stmt) => {
    const match = reconMatches.find((m) => m.bank_statement_id === stmt.id)
    if (!match) return null
    const ji = journalItems.find((j) => j.id === match.journal_item_id)
    const journal = ji ? journals.find((j) => j.id === ji.journal_id) : null
    return { match, ji, journal }
  }

  const matched = statements.filter((s) => s.status === 'matched').length
  const unmatched = statements.filter((s) => s.status === 'unmatched').length
  const matchRate = statements.length ? Math.round((matched / statements.length) * 100) : 0

  return (
    <div>
      <PageHeader
        title="Rekonsiliasi Bank"
        description="Auto-matching mutasi bank vs jurnal sistem — toleransi nominal & tanggal"
        actions={
          <>
            <Select value={accId} onChange={(e) => setAccId(e.target.value)} className="w-64">
              {scopedAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_name} — {a.account_no}</option>)}
            </Select>
            <Button variant="secondary"><Download size={15} /> Export</Button>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Matching Rate" value={`${matchRate}%`} icon={CheckCircle2} tone="green" sub={`${matched} dari ${statements.length} mutasi`} />
        <StatCard label="Belum Cocok (Unmatched)" value={unmatched} icon={AlertCircle} tone="amber" />
        <StatCard label="Saldo Rekening Saat Ini" value={formatCurrency(account?.current_balance || 0, { compact: true })} tone="blue" />
      </div>

      <Card>
        <CardContent className="pt-5">
          <p className="text-xs font-medium text-slate-500 mb-3">Tampilan 2 Kolom: Bank Statement (Impor) vs System Ledger</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  <th className="py-2.5 px-4">Tanggal</th>
                  <th className="py-2.5 px-4">Bank Statement</th>
                  <th className="py-2.5 px-4 text-right">Nominal</th>
                  <th className="py-2.5 px-4">Confidence</th>
                  <th className="py-2.5 px-4">System Ledger (Jurnal)</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {statements.map((s) => {
                  const info = matchInfo(s)
                  return (
                    <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 text-slate-500">{formatDate(s.txn_date)}</td>
                      <td className="py-2.5 px-4">
                        <p className="text-slate-700 truncate max-w-[220px]">{s.description}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{s.source_ref}</p>
                      </td>
                      <td className={`py-2.5 px-4 text-right tabular font-medium ${s.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(s.amount)}</td>
                      <td className="py-2.5 px-4">
                        {info?.match ? (
                          <Badge variant={info.match.confidence_pct >= 90 ? 'green' : 'amber'}>{info.match.confidence_pct}%</Badge>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        {info?.journal ? (
                          <span className="font-mono text-xs text-blue-700">{info.journal.journal_no}</span>
                        ) : (
                          <span className="text-slate-300 text-xs">Belum ada</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4"><StatusBadge status={s.status} /></td>
                      <td className="py-2.5 px-4 text-right">
                        {s.status === 'unmatched' && (
                          <Button size="sm" variant="secondary" onClick={() => { setJournalModal(s); setCounterCoaId(''); setJournalDesc(s.description || ''); setJournalError(null) }}><BookPlus size={12} /> Jurnal</Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {statements.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-slate-400">Belum ada mutasi bank untuk rekening ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={!!journalModal}
        onClose={() => setJournalModal(null)}
        title="Buat Jurnal dari Mutasi Bank"
        description={journalModal?.description}
        footer={<><Button variant="secondary" onClick={() => setJournalModal(null)}>Batal</Button><Button onClick={() => {
          if (!counterCoaId) return setJournalError('Akun lawan wajib dipilih.')
          try {
            createJournalFromStatement(journalModal.id, { coaId: Number(counterCoaId), description: journalDesc })
            setJournalModal(null)
          } catch (e) { setJournalError(e.message) }
        }}>Simpan Jurnal</Button></>}
      >
        {journalModal && (
          <>
            <ErrorBanner message={journalError} />
            <FormGrid>
              <FormField label="Tanggal"><Input type="date" defaultValue={journalModal.txn_date} disabled /></FormField>
              <FormField label="Nominal"><Input type="number" defaultValue={Math.abs(journalModal.amount)} disabled /></FormField>
              <FormField label="Akun Lawan" required className="sm:col-span-2">
                <Select value={counterCoaId} onChange={(e) => setCounterCoaId(e.target.value)}>
                  <option value="">— Pilih Akun COA —</option>
                  {leafCoaOptions.map((c) => <option key={c.id} value={c.id}>{c.account_code} — {c.account_name}</option>)}
                </Select>
              </FormField>
              <FormField label="Keterangan" className="sm:col-span-2">
                <Input value={journalDesc} onChange={(e) => setJournalDesc(e.target.value)} />
              </FormField>
            </FormGrid>
            <p className="text-[11px] text-slate-400 mt-3">
              {journalModal.amount >= 0 ? 'Dana masuk: Debit Rekening Bank / Kredit akun lawan.' : 'Dana keluar: Debit akun lawan / Kredit Rekening Bank.'}
            </p>
          </>
        )}
      </Modal>
    </div>
  )
}
