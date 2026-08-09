import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { DataTable } from '../../components/ui/DataTable'
import { RowMenu } from '../../components/ui/RowMenu'
import { Modal } from '../../components/ui/Modal'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { FormField, FormGrid, Input, Select } from '../../components/ui/Field'
import { useLedgerStore } from '../../store/useLedgerStore'
import { costCenters, getCostCenterById } from '../../data/costCenters'

const LEVEL_VARIANT = { divisi: 'blue', departemen: 'purple', proyek: 'amber', program: 'green' }

function emptyForm() {
  return { code: '', name: '', cc_level: 'departemen', parent_id: '' }
}

export default function CostCenterPage() {
  const version = useLedgerStore((s) => s.version)
  const addCostCenter = useLedgerStore((s) => s.addCostCenter)
  const updateCostCenter = useLedgerStore((s) => s.updateCostCenter)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState(null)

  const openEdit = (row) => { setEditing(row); setForm({ code: row.code, name: row.name, cc_level: row.cc_level, parent_id: row.parent_id || '' }); setError(null); setModalOpen(true) }
  const openAdd = () => { setEditing(null); setForm(emptyForm()); setError(null); setModalOpen(true) }

  const handleSave = () => {
    if (!form.code.trim() || !form.name.trim()) return setError('Kode & nama wajib diisi.')
    const fields = { code: form.code.trim(), name: form.name.trim(), cc_level: form.cc_level, parent_id: form.parent_id ? Number(form.parent_id) : null }
    if (editing) updateCostCenter(editing.id, fields)
    else addCostCenter(fields)
    setModalOpen(false)
  }

  const columns = [
    { header: 'Kode', accessor: 'code', cell: (r) => <span className="font-mono text-xs text-slate-500">{r.code}</span> },
    { header: 'Nama Cost Center', accessor: 'name', cell: (r) => <span className="font-medium text-slate-700">{r.name}</span> },
    { header: 'Induk', cell: (r) => (r.parent_id ? getCostCenterById(r.parent_id)?.name : <span className="text-slate-300">—</span>) },
    { header: 'Level', cell: (r) => <Badge variant={LEVEL_VARIANT[r.cc_level]}>{r.cc_level}</Badge> },
    { header: 'Status', cell: (r) => <Badge variant={r.is_active ? 'green' : 'slate'}>{r.is_active ? 'Aktif' : 'Nonaktif'}</Badge> },
    {
      header: '',
      className: 'text-right',
      cell: (r) => (
        <RowMenu items={[{ label: 'Edit', icon: Pencil, onClick: () => openEdit(r) }, { divider: true }, { label: 'Hapus', icon: Trash2, danger: true, onClick: () => {} }]} />
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Cost Center"
        description="Hierarki Divisi → Departemen → Proyek/Program untuk penandaan biaya"
        actions={<Button onClick={openAdd}><Plus size={15} /> Tambah Cost Center</Button>}
      />
      <Card>
        <CardContent className="pt-5">
          <DataTable columns={columns} data={costCenters} searchKeys={['code', 'name']} searchPlaceholder="Cari cost center..." key={version} />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Cost Center — ${editing.name}` : 'Tambah Cost Center'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button><Button onClick={handleSave}>Simpan</Button></>}
      >
        <ErrorBanner message={error} />
        <FormGrid>
          <FormField label="Kode" required><Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="cth. DEPT-HRD" /></FormField>
          <FormField label="Nama" required><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="cth. Departemen SDM" /></FormField>
          <FormField label="Level" required>
            <Select value={form.cc_level} onChange={(e) => setForm((f) => ({ ...f, cc_level: e.target.value }))}>
              <option value="divisi">Divisi</option>
              <option value="departemen">Departemen</option>
              <option value="proyek">Proyek</option>
              <option value="program">Program</option>
            </Select>
          </FormField>
          <FormField label="Induk (Parent)">
            <Select value={form.parent_id} onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}>
              <option value="">— Tanpa Induk —</option>
              {costCenters.filter((c) => c.id !== editing?.id).map((c) => (
                <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
              ))}
            </Select>
          </FormField>
        </FormGrid>
      </Modal>
    </div>
  )
}
