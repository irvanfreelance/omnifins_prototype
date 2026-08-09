import { useMemo, useState } from 'react'
import { ChevronRight, ChevronDown, Plus, Folder, FileText, Pencil, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { RowMenu } from '../../components/ui/RowMenu'
import { Modal } from '../../components/ui/Modal'
import { ErrorBanner } from '../../components/ui/ErrorBanner'
import { FormField, FormGrid, Input, Select, Textarea } from '../../components/ui/Field'
import { useLedgerStore } from '../../store/useLedgerStore'
import { buildCoaTree, coa } from '../../data/coa'
import { journalItems } from '../../data'
import { cn } from '../../lib/utils'

const TYPE_LABEL = { asset: 'Aset', liability: 'Kewajiban', equity: 'Ekuitas', revenue: 'Penerimaan', expense: 'Penyaluran', fund_balance: 'Saldo Dana' }
const TYPE_VARIANT = { asset: 'blue', liability: 'red', equity: 'purple', revenue: 'green', expense: 'amber', fund_balance: 'cyan' }

function emptyForm() {
  return { account_code: '', account_name: '', account_type: 'expense', normal_balance: 'debit', parent_id: '', is_group: 'leaf', description: '' }
}

function formFromNode(node) {
  return {
    account_code: node.account_code,
    account_name: node.account_name,
    account_type: node.account_type,
    normal_balance: node.normal_balance,
    parent_id: node.parent_id || '',
    is_group: node.is_group ? 'group' : 'leaf',
    description: node.description || '',
  }
}

function Row({ node, depth, expanded, onToggle, onEdit, lockedIds }) {
  const hasChildren = node.children?.length > 0
  const isExpanded = expanded.has(node.id)
  const isLocked = lockedIds.has(node.id)
  return (
    <>
      <tr className="border-b border-slate-50 hover:bg-slate-50/70 group">
        <td className="py-2 px-4">
          <div className="flex items-center gap-1.5" style={{ paddingLeft: `${depth * 20}px` }}>
            {hasChildren ? (
              <button onClick={() => onToggle(node.id)} className="text-slate-400 hover:text-slate-600">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-3.5" />
            )}
            {node.is_group ? <Folder size={14} className="text-amber-500" /> : <FileText size={13} className="text-slate-400" />}
            <span className="font-mono text-xs text-slate-500">{node.account_code}</span>
          </div>
        </td>
        <td className="py-2 px-4">
          <span className={cn('text-sm', node.is_group ? 'font-semibold text-slate-700' : 'text-slate-600')}>{node.account_name}</span>
        </td>
        <td className="py-2 px-4"><Badge variant={TYPE_VARIANT[node.account_type]}>{TYPE_LABEL[node.account_type]}</Badge></td>
        <td className="py-2 px-4 text-xs text-slate-500 capitalize">{node.normal_balance === 'debit' ? 'Debit' : 'Kredit'}</td>
        <td className="py-2 px-4 text-xs text-slate-500">Level {node.coa_level}</td>
        <td className="py-2 px-4 flex items-center gap-1.5">
          <Badge variant={node.is_group ? 'slate' : 'green'}>{node.is_group ? 'Grup' : 'Leaf (bisa dijurnal)'}</Badge>
          {isLocked && <Badge variant="amber">Terkunci</Badge>}
        </td>
        <td className="py-2 px-4 text-right opacity-0 group-hover:opacity-100 transition-opacity">
          <RowMenu items={[{ label: 'Edit', icon: Pencil, onClick: () => onEdit(node) }, { divider: true }, { label: 'Hapus', icon: Trash2, danger: true, onClick: () => {} }]} />
        </td>
      </tr>
      {hasChildren && isExpanded && node.children.map((child) => (
        <Row key={child.id} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} onEdit={onEdit} lockedIds={lockedIds} />
      ))}
    </>
  )
}

export default function CoaPage() {
  const version = useLedgerStore((s) => s.version)
  const addCoaAccount = useLedgerStore((s) => s.addCoaAccount)
  const updateCoaAccount = useLedgerStore((s) => s.updateCoaAccount)
  const tree = useMemo(() => buildCoaTree(), [version])
  const allIds = useMemo(() => coa.map((c) => c.id), [version])
  const lockedIds = useMemo(() => new Set(journalItems.map((ji) => ji.coa_id)), [version])
  const [expanded, setExpanded] = useState(new Set(allIds))
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState(null)
  const editingLocked = editing ? lockedIds.has(editing.id) : false

  const toggle = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const openAdd = () => {
    setEditing(null)
    setForm(emptyForm())
    setError(null)
    setModalOpen(true)
  }
  const openEdit = (node) => {
    setEditing(node)
    setForm(formFromNode(node))
    setError(null)
    setModalOpen(true)
  }

  const handleSave = () => {
    const name = form.account_name.trim()
    if (!name) return setError('Nama akun wajib diisi.')
    const nameTaken = (excludeId) => coa.some((c) => c.id !== excludeId && c.account_name.trim().toLowerCase() === name.toLowerCase())
    if (editing) {
      try {
        if (editingLocked) {
          if (nameTaken(editing.id)) return setError('Nama akun sudah digunakan oleh akun lain.')
          updateCoaAccount(editing.id, { account_name: name, description: form.description })
        } else {
          if (!form.account_code.trim()) return setError('Kode akun wajib diisi.')
          if (nameTaken(editing.id)) return setError('Nama akun sudah digunakan oleh akun lain.')
          updateCoaAccount(editing.id, {
            account_code: form.account_code,
            account_name: name,
            account_type: form.account_type,
            normal_balance: form.normal_balance,
            parent_id: form.parent_id || null,
            is_group: form.is_group,
            description: form.description,
          })
        }
        setModalOpen(false)
      } catch (e) {
        setError(e.message)
      }
      return
    }
    if (!form.account_code.trim()) return setError('Kode akun wajib diisi.')
    if (coa.some((c) => c.account_code === form.account_code.trim())) return setError('Kode akun sudah digunakan.')
    if (nameTaken(null)) return setError('Nama akun sudah digunakan oleh akun lain.')
    try {
      addCoaAccount({ ...form, account_name: name, parent_id: form.parent_id || null })
      setModalOpen(false)
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div>
      <PageHeader
        title="Chart of Account (COA)"
        description="Struktur akun PSAK 109 / ISAK 35 — hingga 6 level, kode akun terkunci setelah ada transaksi"
        actions={
          <>
            <Button variant="secondary" onClick={() => setExpanded(new Set(allIds))}>Expand All</Button>
            <Button variant="secondary" onClick={() => setExpanded(new Set())}>Collapse All</Button>
            <Button onClick={openAdd}><Plus size={15} /> Tambah Akun</Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <th className="py-2.5 px-4">Kode Akun</th>
                <th className="py-2.5 px-4">Nama Akun</th>
                <th className="py-2.5 px-4">Tipe</th>
                <th className="py-2.5 px-4">Normal Balance</th>
                <th className="py-2.5 px-4">Level</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {tree.map((root) => (
                <Row key={root.id} node={root} depth={0} expanded={expanded} onToggle={toggle} onEdit={openEdit} lockedIds={lockedIds} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit Akun — ${editing.account_name}` : 'Tambah Akun COA'}
        description={editingLocked ? 'Akun ini sudah punya transaksi — kode, tipe, normal balance & struktur dikunci demi integritas laporan.' : 'Perubahan pada akun yang sudah bertransaksi akan dikunci otomatis'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Batal</Button>
            <Button onClick={handleSave}>{editing ? 'Simpan Perubahan' : 'Simpan Akun'}</Button>
          </>
        }
      >
        <ErrorBanner message={error} />
        {editingLocked && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
            Akun ini sudah dipakai dalam jurnal. Hanya nama & deskripsi yang dapat diubah — kode akun, tipe, normal balance, dan struktur akun terkunci agar riwayat laporan tidak rusak.
          </p>
        )}
        <FormGrid>
          <FormField label="Kode Akun" required>
            <Input disabled={editingLocked} value={form.account_code} onChange={(e) => setForm((f) => ({ ...f, account_code: e.target.value }))} placeholder="cth. 5.03.008" />
          </FormField>
          <FormField label="Nama Akun" required>
            <Input value={form.account_name} onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))} placeholder="cth. Biaya Konsumsi Kegiatan" />
          </FormField>
          <FormField label="Tipe Akun" required>
            <Select disabled={editingLocked} value={form.account_type} onChange={(e) => setForm((f) => ({ ...f, account_type: e.target.value }))}>
              <option value="asset">Aset</option>
              <option value="liability">Kewajiban</option>
              <option value="fund_balance">Saldo Dana</option>
              <option value="revenue">Penerimaan</option>
              <option value="expense">Penyaluran / Beban</option>
            </Select>
          </FormField>
          <FormField label="Normal Balance" required>
            <Select disabled={editingLocked} value={form.normal_balance} onChange={(e) => setForm((f) => ({ ...f, normal_balance: e.target.value }))}>
              <option value="debit">Debit</option>
              <option value="credit">Kredit</option>
            </Select>
          </FormField>
          <FormField label="Akun Induk (Parent)">
            <Select disabled={editingLocked} value={form.parent_id} onChange={(e) => setForm((f) => ({ ...f, parent_id: e.target.value }))}>
              <option value="">— Tanpa Induk (Level 1) —</option>
              {coa.filter((c) => c.is_group && c.id !== editing?.id).map((c) => (
                <option key={c.id} value={c.id}>{c.account_code} — {c.account_name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Tipe Baris">
            <Select disabled={editingLocked} value={form.is_group} onChange={(e) => setForm((f) => ({ ...f, is_group: e.target.value }))}>
              <option value="group">Grup (folder, tidak bisa dijurnal)</option>
              <option value="leaf">Leaf (bisa dijurnal langsung)</option>
            </Select>
          </FormField>
        </FormGrid>
        <FormField label="Deskripsi" className="mt-4">
          <Textarea placeholder="Catatan penggunaan akun ini (opsional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </FormField>
      </Modal>
    </div>
  )
}
