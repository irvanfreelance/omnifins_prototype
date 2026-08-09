import { useState } from 'react'
import { Plus, Pencil, Save, Network, UserPlus } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Pills } from '../components/ui/Tabs'
import { DataTable } from '../components/ui/DataTable'
import { RowMenu } from '../components/ui/RowMenu'
import { Modal } from '../components/ui/Modal'
import { FormField, FormGrid, Input, Select, Textarea } from '../components/ui/Field'
import { orgNodes, users, roles, getUserRole, getNodeById, closingCutoffConfig, ORG_NAME, ORG_FULL_NAME } from '../data'
import { formatDate } from '../lib/format'

const LEVEL_LABEL = { pusat: 'Pusat', wilayah: 'Wilayah', daerah: 'Daerah' }
const LEVEL_INDENT = { pusat: 0, wilayah: 1, daerah: 2 }

export default function SettingPage() {
  const [tab, setTab] = useState('profil')
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [nodeModalOpen, setNodeModalOpen] = useState(false)
  const [cutoffEdit, setCutoffEdit] = useState(null)

  const userColumns = [
    { header: 'Nama', cell: (r) => <span className="font-medium text-slate-700">{r.full_name}</span> },
    { header: 'Email', accessor: 'email' },
    { header: 'Node', cell: (r) => getNodeById(r.org_node_id)?.name },
    { header: 'Role', cell: (r) => <Badge variant="blue">{getUserRole(r.id)?.label}</Badge> },
    { header: 'Status', cell: (r) => <Badge variant={r.is_active ? 'green' : 'slate'}>{r.is_active ? 'Aktif' : 'Nonaktif'}</Badge> },
    { header: 'Login Terakhir', cell: (r) => formatDate(r.last_login_at) },
    { header: '', className: 'text-right', cell: () => <RowMenu items={[{ label: 'Edit', icon: Pencil, onClick: () => {} }]} /> },
  ]

  return (
    <div>
      <PageHeader title="Setting Sistem" description="Konfigurasi organisasi, hierarki node, user & role, dan aturan akuntansi" />

      <div className="mb-5">
        <Pills
          options={[
            { value: 'profil', label: 'Profil Organisasi' },
            { value: 'struktur', label: 'Struktur Organisasi' },
            { value: 'user', label: 'User & Role' },
            { value: 'cutoff', label: 'Konfigurasi Akuntansi' },
            { value: 'notifikasi', label: 'Notifikasi' },
          ]}
          active={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'profil' && (
        <Card>
          <CardHeader><div><CardTitle>Profil Organisasi</CardTitle><CardDescription>Identitas lembaga & konfigurasi entitas</CardDescription></div></CardHeader>
          <CardContent>
            <FormGrid>
              <FormField label="Nama Singkat"><Input defaultValue={ORG_NAME} /></FormField>
              <FormField label="Nama Lengkap"><Input defaultValue={ORG_FULL_NAME} /></FormField>
              <FormField label="Tipe Entitas"><Select defaultValue="ngo"><option value="ngo">Sosial / NGO (LAZ)</option><option value="business">Bisnis</option><option value="hybrid">Hybrid</option></Select></FormField>
              <FormField label="Standar PSAK"><Select defaultValue="PSAK109"><option value="PSAK109">PSAK 109 (Zakat)</option><option value="ISAK35">ISAK 35 (Nonlaba Umum)</option></Select></FormField>
              <FormField label="Email"><Input defaultValue="pusat@lazsinergi.org" /></FormField>
              <FormField label="Telepon"><Input defaultValue="022-1234567" /></FormField>
            </FormGrid>
            <FormField label="Alamat" className="mt-4"><Textarea defaultValue="Jl. Sinergi Raya No. 88, Bandung, Jawa Barat" /></FormField>
            <div className="mt-4"><Button><Save size={14} /> Simpan Perubahan</Button></div>
          </CardContent>
        </Card>
      )}

      {tab === 'struktur' && (
        <Card>
          <CardHeader>
            <div><CardTitle>Struktur Organisasi</CardTitle><CardDescription>Hierarki Pusat → Wilayah → Daerah (hingga 5 level)</CardDescription></div>
            <Button size="sm" onClick={() => setNodeModalOpen(true)}><Plus size={14} /> Tambah Node</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {orgNodes.map((n) => (
                <div key={n.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3.5 py-2.5 hover:bg-slate-50" style={{ marginLeft: `${LEVEL_INDENT[n.org_level] * 24}px` }}>
                  <Network size={14} className={n.org_level === 'pusat' ? 'text-blue-600' : n.org_level === 'wilayah' ? 'text-violet-500' : 'text-slate-400'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{n.name}</p>
                    <p className="text-xs text-slate-400">{n.short_code} · {n.email}</p>
                  </div>
                  <Badge variant="slate">{LEVEL_LABEL[n.org_level]}</Badge>
                  <Badge variant={n.is_active ? 'green' : 'slate'}>{n.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
                  <RowMenu items={[{ label: 'Edit', icon: Pencil, onClick: () => {} }, { label: 'Undang Admin', icon: UserPlus, onClick: () => {} }]} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'user' && (
        <Card>
          <CardHeader>
            <div><CardTitle>User & Role</CardTitle><CardDescription>Kelola pengguna dan scope akses hierarki (own/region/all)</CardDescription></div>
            <Button size="sm" onClick={() => setUserModalOpen(true)}><Plus size={14} /> Undang User</Button>
          </CardHeader>
          <CardContent>
            <DataTable columns={userColumns} data={users} searchKeys={['full_name', 'email']} searchPlaceholder="Cari user..." pageSize={8} />
          </CardContent>
        </Card>
      )}

      {tab === 'cutoff' && (
        <Card>
          <CardHeader><div><CardTitle>Konfigurasi Cutoff Tutup Buku</CardTitle><CardDescription>Batas waktu closing per node — Mode Strict / Approval</CardDescription></div></CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b text-left text-xs text-slate-500 uppercase">
                    <th className="py-2.5 px-4">Node</th>
                    <th className="py-2.5 px-4">Tanggal Cutoff</th>
                    <th className="py-2.5 px-4">Mode</th>
                    <th className="py-2.5 px-4">Override Role</th>
                    <th className="py-2.5 px-4">Berlaku Sejak</th>
                    <th className="py-2.5 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {closingCutoffConfig.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5 px-4 font-medium text-slate-700">{getNodeById(c.org_node_id)?.name}</td>
                      <td className="py-2.5 px-4">Tanggal {c.cutoff_day}</td>
                      <td className="py-2.5 px-4"><Badge variant={c.mode === 'strict' ? 'red' : 'amber'}>{c.mode === 'strict' ? 'Strict' : 'Approval'}</Badge></td>
                      <td className="py-2.5 px-4 text-slate-500">{c.override_role}</td>
                      <td className="py-2.5 px-4 text-slate-500">{formatDate(c.effective_from)}</td>
                      <td className="py-2.5 px-4 text-right"><Button size="sm" variant="ghost" onClick={() => setCutoffEdit(c)}><Pencil size={13} /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'notifikasi' && (
        <Card>
          <CardHeader><div><CardTitle>Preferensi Notifikasi</CardTitle><CardDescription>Channel notifikasi per jenis event</CardDescription></div></CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {[
                ['Approval Request', true, true, false],
                ['Pengingat LPJ Cash Advance', true, true, false],
                ['Saldo Rekening Rendah', true, false, true],
                ['Kwitansi Donasi', false, true, false],
                ['Pengingat Cutoff Closing (H-3 & H-1)', true, true, true],
                ['Budget Alert 80%', true, false, true],
              ].map(([label, wa, email, push]) => (
                <div key={label} className="flex items-center justify-between py-3 text-sm">
                  <span className="text-slate-600">{label}</span>
                  <div className="flex items-center gap-4">
                    {['WhatsApp', 'Email', 'Push'].map((ch, i) => (
                      <label key={ch} className="flex items-center gap-1.5 text-xs text-slate-500">
                        <input type="checkbox" defaultChecked={[wa, email, push][i]} className="h-3.5 w-3.5 rounded accent-blue-600" /> {ch}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4"><Button><Save size={14} /> Simpan Preferensi</Button></div>
          </CardContent>
        </Card>
      )}

      <Modal open={userModalOpen} onClose={() => setUserModalOpen(false)} title="Undang User Baru" footer={<><Button variant="secondary" onClick={() => setUserModalOpen(false)}>Batal</Button><Button onClick={() => setUserModalOpen(false)}>Kirim Undangan</Button></>}>
        <FormGrid>
          <FormField label="Nama Lengkap" required><Input /></FormField>
          <FormField label="Email" required><Input type="email" /></FormField>
          <FormField label="Node"><Select>{orgNodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</Select></FormField>
          <FormField label="Role"><Select>{roles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</Select></FormField>
          <FormField label="Scope Akses"><Select><option value="own">Own (node sendiri)</option><option value="region">Region (node + turunan)</option><option value="all">All (seluruh node)</option></Select></FormField>
        </FormGrid>
      </Modal>

      <Modal open={nodeModalOpen} onClose={() => setNodeModalOpen(false)} title="Tambah Node Organisasi" footer={<><Button variant="secondary" onClick={() => setNodeModalOpen(false)}>Batal</Button><Button onClick={() => setNodeModalOpen(false)}>Simpan Node</Button></>}>
        <FormGrid>
          <FormField label="Nama Node" required><Input /></FormField>
          <FormField label="Kode Singkat" required><Input placeholder="cth. DAE-CMH" /></FormField>
          <FormField label="Level" required><Select><option value="wilayah">Wilayah</option><option value="daerah">Daerah</option><option value="cabang">Cabang</option></Select></FormField>
          <FormField label="Induk (Parent)"><Select>{orgNodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}</Select></FormField>
        </FormGrid>
      </Modal>

      <Modal open={!!cutoffEdit} onClose={() => setCutoffEdit(null)} title="Edit Konfigurasi Cutoff" description={cutoffEdit && getNodeById(cutoffEdit.org_node_id)?.name} footer={<><Button variant="secondary" onClick={() => setCutoffEdit(null)}>Batal</Button><Button onClick={() => setCutoffEdit(null)}>Simpan</Button></>}>
        {cutoffEdit && (
          <FormGrid>
            <FormField label="Tanggal Cutoff (1-28)" required><Input type="number" min={1} max={28} defaultValue={cutoffEdit.cutoff_day} /></FormField>
            <FormField label="Mode" required><Select defaultValue={cutoffEdit.mode}><option value="strict">Strict</option><option value="approval">Approval</option></Select></FormField>
          </FormGrid>
        )}
        <p className="text-[11px] text-slate-400 mt-3">Perubahan akan tercatat di Audit Trail dengan nilai lama & baru (FR-CUTOFF-02).</p>
      </Modal>
    </div>
  )
}
