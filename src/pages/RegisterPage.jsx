import { useMemo, useState } from 'react'
import { Plus, Eye, Copy, Paperclip } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { RowMenu } from '../components/ui/RowMenu'
import { Modal } from '../components/ui/Modal'
import { Pills } from '../components/ui/Tabs'
import { FormField, FormGrid, Input, Select, Textarea } from '../components/ui/Field'
import { useScopedNodeIds } from '../lib/scope'
import { registers, getNodeById, getUserById, getFundById, getProgramById, getContactById, journals } from '../data'
import { formatCurrency, formatDate } from '../lib/format'

const TYPE_LABEL = {
  donasi: 'Donasi',
  distribusi: 'Distribusi',
  jurnal_umum: 'Jurnal Umum',
  transfer: 'Transfer',
  ca_pencairan: 'CA Pencairan',
  ca_ljp: 'CA LPJ',
  pengeluaran: 'Pengeluaran',
  penerimaan: 'Penerimaan',
}
const TYPE_VARIANT = { donasi: 'green', distribusi: 'amber', jurnal_umum: 'slate', transfer: 'purple', ca_pencairan: 'cyan', ca_ljp: 'cyan', pengeluaran: 'red', penerimaan: 'blue' }

export default function RegisterPage() {
  const nodeIds = useScopedNodeIds()
  const [typeFilter, setTypeFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [detail, setDetail] = useState(null)

  const scoped = useMemo(
    () => registers.filter((r) => nodeIds.includes(r.org_node_id)).sort((a, b) => new Date(b.txn_date) - new Date(a.txn_date) || b.id - a.id),
    [nodeIds]
  )
  const filtered = typeFilter === 'all' ? scoped : scoped.filter((r) => r.register_type === typeFilter)

  const typeOptions = [
    { value: 'all', label: `Semua (${scoped.length})` },
    ...Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label: `${label} (${scoped.filter((r) => r.register_type === value).length})` })).filter((o) => !o.label.endsWith('(0)')),
  ]

  const columns = [
    { header: 'No. Register', cell: (r) => <span className="font-mono text-xs text-blue-700">{r.register_no}</span> },
    { header: 'Tipe', cell: (r) => <Badge variant={TYPE_VARIANT[r.register_type]}>{TYPE_LABEL[r.register_type]}</Badge> },
    { header: 'Tanggal', cell: (r) => formatDate(r.txn_date) },
    { header: 'Deskripsi', cell: (r) => <span className="text-slate-600 line-clamp-1 max-w-[220px] block truncate">{r.description}</span> },
    { header: 'Node', cell: (r) => <span className="text-xs text-slate-400">{getNodeById(r.org_node_id)?.short_code}</span> },
    { header: 'Nominal', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular font-medium">{formatCurrency(r.total_amount)}</span> },
    { header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
    {
      header: '',
      className: 'text-right',
      cell: (r) => (
        <RowMenu items={[{ label: 'Lihat Detail', icon: Eye, onClick: () => setDetail(r) }, { label: 'Duplikat', icon: Copy, onClick: () => {} }]} />
      ),
    },
  ]

  const relatedJournal = detail ? journals.find((j) => j.register_id === detail.id) : null

  return (
    <div>
      <PageHeader
        title="Register Transaksi"
        description="Antrian dokumen seluruh transaksi (Penerimaan, Pengeluaran, Jurnal) sebelum posting — FR-REG"
        actions={<Button onClick={() => setAddOpen(true)}><Plus size={15} /> Buat Register</Button>}
      />

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4 overflow-x-auto">
            <Pills options={typeOptions} active={typeFilter} onChange={setTypeFilter} />
          </div>
          <DataTable
            columns={columns}
            data={filtered}
            searchKeys={['register_no', 'description']}
            searchPlaceholder="Cari no. register / deskripsi..."
            onRowClick={setDetail}
            pageSize={10}
          />
        </CardContent>
      </Card>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Buat Register Baru"
        description="Nomor register akan digenerate otomatis sesuai format TRX/YYYY/MM/NNNN"
        footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Batal</Button><Button onClick={() => setAddOpen(false)}>Simpan sebagai Draft</Button></>}
      >
        <FormGrid>
          <FormField label="Tipe Register" required>
            <Select defaultValue="jurnal_umum">
              {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </FormField>
          <FormField label="Tanggal Transaksi" required><Input type="date" /></FormField>
          <FormField label="Cost Center"><Select><option>Divisi Amil</option><option>Divisi Operasional & Umum</option></Select></FormField>
          <FormField label="Program / Fund"><Select><option>— Pilih Program —</option></Select></FormField>
        </FormGrid>
        <FormField label="Deskripsi" className="mt-4"><Textarea placeholder="Keterangan transaksi..." /></FormField>
        <FormField label="Lampiran" className="mt-4">
          <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 py-6 text-sm text-slate-400 hover:border-blue-300 hover:text-blue-500 cursor-pointer transition-colors">
            <Paperclip size={15} /> Unggah foto/PDF (wajib untuk transaksi di atas limit)
          </div>
        </FormField>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.register_no} description={detail && TYPE_LABEL[detail.register_type]} size="lg">
        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div><p className="text-xs text-slate-400 mb-0.5">Status</p><StatusBadge status={detail.status} /></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Tanggal</p><p className="font-medium text-slate-700">{formatDate(detail.txn_date)}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Nominal</p><p className="font-medium text-slate-700 tabular">{formatCurrency(detail.total_amount)}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Node</p><p className="font-medium text-slate-700">{getNodeById(detail.org_node_id)?.name}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Fund</p><p className="font-medium text-slate-700">{detail.fund_id ? getFundById(detail.fund_id)?.fund_name : '—'}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Program</p><p className="font-medium text-slate-700">{detail.program_id ? getProgramById(detail.program_id)?.program_name : '—'}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Kontak</p><p className="font-medium text-slate-700">{detail.contact_id ? getContactById(detail.contact_id)?.name : '—'}</p></div>
              <div><p className="text-xs text-slate-400 mb-0.5">Dibuat oleh</p><p className="font-medium text-slate-700">{getUserById(detail.created_by)?.full_name}</p></div>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Deskripsi</p>
              <p className="text-sm text-slate-600">{detail.description}</p>
            </div>
            {relatedJournal && (
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500 mb-1">Jurnal Terkait</p>
                <p className="text-sm font-mono text-blue-700">{relatedJournal.journal_no}</p>
                <p className="text-xs text-slate-400 mt-0.5">Total Debit/Kredit: {formatCurrency(relatedJournal.total_debit)}</p>
              </div>
            )}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500 mb-2">Lifecycle</p>
              <div className="flex items-center gap-1 text-xs">
                {['draft', 'submitted', 'approved', 'posted'].map((s, i) => {
                  const order = ['draft', 'submitted', 'approved', 'posted']
                  const passed = order.indexOf(detail.status) >= i || detail.status === 'posted'
                  return (
                    <div key={s} className="flex items-center gap-1 flex-1">
                      <div className={`h-1.5 flex-1 rounded-full ${passed ? 'bg-blue-500' : 'bg-slate-100'}`} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
