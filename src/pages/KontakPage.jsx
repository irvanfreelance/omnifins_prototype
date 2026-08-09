import { useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Phone, IdCard } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { DataTable } from '../components/ui/DataTable'
import { RowMenu } from '../components/ui/RowMenu'
import { Pills } from '../components/ui/Tabs'
import { Modal } from '../components/ui/Modal'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { FormField, FormGrid, Input, Select, Textarea } from '../components/ui/Field'
import { useLedgerStore } from '../store/useLedgerStore'
import { contacts, donations, ASNAF_LABEL, getFundById, getProgramById, getCampaignById, TODAY_Y } from '../data'
import { formatCurrency, formatDate } from '../lib/format'

const TYPE_LABEL = { donor: 'Donatur', mustahiq: 'Mustahiq', vendor: 'Vendor', partner: 'Mitra' }
const TIER_VARIANT = { regular: 'slate', silver: 'blue', gold: 'amber', platinum: 'purple' }

function emptyForm() {
  return { name: '', phone_wa: '', email: '', is_muzakki: 'false', donor_tier: 'regular', asnaf_category: 'fakir', npwp: '', notes: '' }
}

export default function KontakPage() {
  const [tab, setTab] = useState('donor')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [kartuDonatur, setKartuDonatur] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState(null)
  const version = useLedgerStore((s) => s.version)
  const addContact = useLedgerStore((s) => s.addContact)
  const updateContact = useLedgerStore((s) => s.updateContact)
  const deleteContact = useLedgerStore((s) => s.deleteContact)

  const filtered = contacts.filter((c) => c.contact_type === tab)
  const donorTotals = useMemo(() => {
    const map = new Map()
    for (const d of donations.filter((d) => d.status === 'posted')) map.set(d.donor_id, (map.get(d.donor_id) || 0) + d.amount)
    return map
  }, [version])

  const openEdit = (r) => {
    setEditing(r)
    setForm({ name: r.name, phone_wa: r.phone_wa || '', email: r.email || '', is_muzakki: r.is_muzakki ? 'true' : 'false', donor_tier: r.donor_tier || 'regular', asnaf_category: r.asnaf_category || 'fakir', npwp: r.npwp || '', notes: r.notes || '' })
    setError(null)
    setModalOpen(true)
  }
  const openAdd = () => { setEditing(null); setForm(emptyForm()); setError(null); setModalOpen(true) }

  const handleDelete = (r) => {
    deleteContact(r.id)
  }

  const handleSave = () => {
    if (!form.name.trim()) return setError('Nama wajib diisi.')
    const fields = {
      contact_type: tab,
      name: form.name.trim(),
      phone_wa: form.phone_wa || null,
      email: form.email || null,
      notes: form.notes || null,
      ...(tab === 'donor' ? { is_muzakki: form.is_muzakki === 'true', donor_tier: form.donor_tier } : {}),
      ...(tab === 'mustahiq' ? { asnaf_category: form.asnaf_category } : {}),
      ...(tab === 'vendor' || tab === 'partner' ? { npwp: form.npwp || null } : {}),
    }
    if (editing) updateContact(editing.id, fields)
    else addContact(fields)
    setModalOpen(false)
  }

  const commonActions = (r) => (
    <RowMenu items={[{ label: 'Edit', icon: Pencil, onClick: () => openEdit(r) }, { divider: true }, { label: 'Hapus', icon: Trash2, danger: true, onClick: () => handleDelete(r) }]} />
  )

  const columnsDonor = [
    { header: 'Nama Donatur', cell: (r) => <span className="font-medium text-slate-700">{r.name}</span> },
    { header: 'Kontak', cell: (r) => <span className="text-xs text-slate-500 flex items-center gap-1">{r.phone_wa && <><Phone size={11} /> {r.phone_wa}</>}</span> },
    { header: 'Jenis', cell: (r) => <Badge variant={r.is_muzakki ? 'green' : 'blue'}>{r.is_muzakki ? 'Muzakki' : 'Non-Muzakki'}</Badge> },
    { header: 'Tier', cell: (r) => <Badge variant={TIER_VARIANT[r.donor_tier]}>{r.donor_tier}</Badge> },
    { header: 'Total Donasi', className: 'text-right', headerClassName: 'text-right', cell: (r) => <span className="tabular font-medium">{formatCurrency(donorTotals.get(r.id) || 0, { compact: true })}</span> },
    {
      header: '',
      className: 'text-right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button size="sm" variant="ghost" title="Kartu Donatur" onClick={() => setKartuDonatur(r)}><IdCard size={14} /></Button>
          {commonActions(r)}
        </div>
      ),
    },
  ]
  const columnsMustahiq = [
    { header: 'Nama', cell: (r) => <span className="font-medium text-slate-700">{r.name}</span> },
    { header: 'Kontak', cell: (r) => <span className="text-xs text-slate-500">{r.phone_wa}</span> },
    { header: 'Kategori Asnaf', cell: (r) => <Badge variant="cyan">{ASNAF_LABEL[r.asnaf_category]}</Badge> },
    { header: 'Catatan', cell: (r) => <span className="text-xs text-slate-500 truncate max-w-[220px] block">{r.notes}</span> },
    { header: '', className: 'text-right', cell: (r) => commonActions(r) },
  ]
  const columnsVendorPartner = [
    { header: 'Nama', cell: (r) => <span className="font-medium text-slate-700">{r.name}</span> },
    { header: 'Email', cell: (r) => r.email || <span className="text-slate-300">—</span> },
    { header: 'Kontak', cell: (r) => <span className="text-xs text-slate-500">{r.phone_wa}</span> },
    { header: 'NPWP', cell: (r) => r.npwp || <span className="text-slate-300">—</span> },
    { header: 'Catatan', cell: (r) => <span className="text-xs text-slate-500 truncate max-w-[220px] block">{r.notes}</span> },
    { header: '', className: 'text-right', cell: (r) => commonActions(r) },
  ]

  const columns = tab === 'donor' ? columnsDonor : tab === 'mustahiq' ? columnsMustahiq : columnsVendorPartner

  return (
    <div>
      <PageHeader
        title="Donatur & Mitra"
        description="Database kontak unified — Donatur, Mustahiq, Vendor, dan Mitra Program"
        actions={<Button onClick={openAdd}><Plus size={15} /> Tambah Kontak</Button>}
      />
      <Card>
        <CardContent className="pt-5">
          <div className="mb-4">
            <Pills
              options={['donor', 'mustahiq', 'vendor', 'partner'].map((v) => ({ value: v, label: `${TYPE_LABEL[v]} (${contacts.filter((c) => c.contact_type === v).length})` }))}
              active={tab}
              onChange={setTab}
            />
          </div>
          <DataTable key={version} columns={columns} data={filtered} searchKeys={['name', 'phone_wa']} searchPlaceholder="Cari nama / no. HP..." pageSize={10} />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Kontak — ${editing.name}` : `Tambah ${TYPE_LABEL[tab]}`}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button><Button onClick={handleSave}>Simpan</Button></>}
      >
        <ErrorBanner message={error} />
        <FormGrid>
          <FormField label="Nama" required className="sm:col-span-2"><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></FormField>
          <FormField label="No. WhatsApp"><Input value={form.phone_wa} onChange={(e) => setForm((f) => ({ ...f, phone_wa: e.target.value }))} /></FormField>
          <FormField label="Email"><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></FormField>
          {tab === 'donor' && (
            <>
              <FormField label="Jenis Donatur">
                <Select value={form.is_muzakki} onChange={(e) => setForm((f) => ({ ...f, is_muzakki: e.target.value }))}><option value="true">Muzakki</option><option value="false">Non-Muzakki</option></Select>
              </FormField>
              <FormField label="Tier">
                <Select value={form.donor_tier} onChange={(e) => setForm((f) => ({ ...f, donor_tier: e.target.value }))}><option value="regular">Regular</option><option value="silver">Silver</option><option value="gold">Gold</option><option value="platinum">Platinum</option></Select>
              </FormField>
            </>
          )}
          {tab === 'mustahiq' && (
            <FormField label="Kategori Asnaf">
              <Select value={form.asnaf_category} onChange={(e) => setForm((f) => ({ ...f, asnaf_category: e.target.value }))}>{Object.entries(ASNAF_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
            </FormField>
          )}
          {(tab === 'vendor' || tab === 'partner') && <FormField label="NPWP"><Input value={form.npwp} onChange={(e) => setForm((f) => ({ ...f, npwp: e.target.value }))} /></FormField>}
        </FormGrid>
        <FormField label="Catatan" className="mt-4"><Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></FormField>
      </Modal>

      <Modal open={!!kartuDonatur} onClose={() => setKartuDonatur(null)} title="Kartu Donatur" description={kartuDonatur?.name} size="lg">
        {kartuDonatur && <KartuDonaturContent donor={kartuDonatur} />}
      </Modal>
    </div>
  )
}

function KartuDonaturContent({ donor }) {
  const history = donations
    .filter((d) => d.donor_id === donor.id)
    .sort((a, b) => new Date(b.donation_date) - new Date(a.donation_date))
  const posted = history.filter((d) => d.status === 'posted')
  const totalAllTime = posted.reduce((s, d) => s + d.amount, 0)
  const totalYTD = posted.filter((d) => d.donation_date.startsWith(`${TODAY_Y}-`)).reduce((s, d) => s + d.amount, 0)
  const programsSupported = Array.from(new Set(posted.filter((d) => d.program_id).map((d) => d.program_id))).map(getProgramById)
  const campaignsSupported = Array.from(new Set(posted.filter((d) => d.campaign_id).map((d) => d.campaign_id))).map(getCampaignById)

  return (
    <div>
      <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
        <div className={`h-14 w-14 rounded-full flex items-center justify-center text-white text-lg font-semibold shrink-0 ${donor.is_muzakki ? 'bg-emerald-500' : 'bg-blue-500'}`}>
          {donor.name.split(' ').slice(0, 2).map((s) => s[0]).join('')}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-800">{donor.name}</p>
          <p className="text-xs text-slate-400">{donor.phone_wa || 'Tidak ada kontak'} {donor.email ? `· ${donor.email}` : ''}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Badge variant={donor.is_muzakki ? 'green' : 'blue'}>{donor.is_muzakki ? 'Muzakki' : 'Non-Muzakki'}</Badge>
            <Badge variant={TIER_VARIANT[donor.donor_tier]}>{donor.donor_tier}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 py-5">
        <div>
          <p className="text-xs text-slate-400">Total Donasi (Sepanjang Waktu)</p>
          <p className="text-lg font-semibold text-slate-800 tabular mt-0.5">{formatCurrency(totalAllTime, { compact: true })}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Total Donasi YTD {TODAY_Y}</p>
          <p className="text-lg font-semibold text-slate-800 tabular mt-0.5">{formatCurrency(totalYTD, { compact: true })}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Jumlah Transaksi</p>
          <p className="text-lg font-semibold text-slate-800 tabular mt-0.5">{posted.length}</p>
        </div>
      </div>

      <div className="pb-5">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Program yang Pernah Didukung</p>
        <div className="flex flex-wrap gap-1.5">
          {programsSupported.length === 0 && <span className="text-sm text-slate-400">Belum ada donasi yang ditandai ke program tertentu.</span>}
          {programsSupported.map((p) => p && <Badge key={p.id} variant="purple">{p.program_name}</Badge>)}
          {campaignsSupported.map((c) => c && <Badge key={`c${c.id}`} variant="cyan">{c.campaign_name}</Badge>)}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Histori Transaksi</p>
        <div className="rounded-lg border border-slate-100 divide-y divide-slate-50 max-h-64 overflow-y-auto">
          {history.slice(0, 20).map((d) => (
            <div key={d.id} className="flex items-center justify-between px-3.5 py-2.5 text-sm">
              <div>
                <p className="text-slate-700 font-medium">{getFundById(d.fund_id)?.fund_name}</p>
                <p className="text-xs text-slate-400">{formatDate(d.donation_date)}</p>
              </div>
              <div className="text-right">
                <p className="font-medium tabular text-slate-700">{formatCurrency(d.amount)}</p>
                <StatusBadge status={d.status} />
              </div>
            </div>
          ))}
          {history.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">Belum ada histori donasi.</p>}
        </div>
        {history.length > 20 && <p className="text-[11px] text-slate-400 mt-2">Menampilkan 20 transaksi terbaru dari {history.length} total.</p>}
      </div>
    </div>
  )
}
