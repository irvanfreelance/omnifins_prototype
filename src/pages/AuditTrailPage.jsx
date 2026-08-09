import { useMemo, useState } from 'react'
import { Eye, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { StatCard } from '../components/ui/StatCard'
import { DataTable } from '../components/ui/DataTable'
import { Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { useScopedNodeIds } from '../lib/scope'
import { auditLogs, getUserById, getNodeById } from '../data'
import { formatDate } from '../lib/format'

const ACTION_VARIANT = { CREATE: 'blue', UPDATE: 'amber', DELETE: 'red', POST: 'green', CLOSE: 'purple', OVERRIDE_REQUEST: 'amber', OVERRIDE_APPROVE: 'green', LOGIN: 'slate' }

export default function AuditTrailPage() {
  const nodeIds = useScopedNodeIds()
  const [actionFilter, setActionFilter] = useState('all')
  const [detail, setDetail] = useState(null)

  const scoped = useMemo(() => auditLogs.filter((a) => nodeIds.includes(a.org_node_id)), [nodeIds])
  const filtered = actionFilter === 'all' ? scoped : scoped.filter((a) => a.action === actionFilter)
  const actions = Array.from(new Set(scoped.map((a) => a.action)))

  const columns = [
    { header: 'Waktu', cell: (r) => formatDate(r.created_at, { withTime: true }) },
    { header: 'User', cell: (r) => getUserById(r.user_id)?.full_name || 'System' },
    { header: 'Aksi', cell: (r) => <Badge variant={ACTION_VARIANT[r.action] || 'slate'}>{r.action}</Badge> },
    { header: 'Entitas', cell: (r) => <span className="text-slate-600">{r.entity_type} #{r.entity_id}</span> },
    { header: 'Node', cell: (r) => <span className="text-xs text-slate-400">{getNodeById(r.org_node_id)?.short_code}</span> },
    { header: 'IP Address', cell: (r) => <span className="font-mono text-xs text-slate-400">{r.ip_address}</span> },
    { header: '', className: 'text-right', cell: (r) => <Button size="sm" variant="ghost" onClick={() => setDetail(r)}><Eye size={13} /></Button> },
  ]

  return (
    <div>
      <PageHeader title="Log Aktivitas (Audit Trail)" description="Seluruh aksi signifikan tercatat otomatis — immutable, retensi minimum 7 tahun" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Log Tercatat" value={scoped.length} icon={ShieldCheck} tone="blue" />
        <StatCard label="Aksi Posting Jurnal" value={scoped.filter((a) => a.action === 'POST').length} tone="green" />
        <StatCard label="Aksi Closing / Override" value={scoped.filter((a) => ['CLOSE', 'OVERRIDE_REQUEST', 'OVERRIDE_APPROVE'].includes(a.action)).length} tone="purple" />
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="mb-4">
            <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="w-56">
              <option value="all">Semua Aksi</option>
              {actions.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </div>
          <DataTable columns={columns} data={filtered} searchable={false} pageSize={12} />
        </CardContent>
      </Card>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detail Log Aktivitas" size="md">
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-slate-400">Waktu</p><p className="font-medium">{formatDate(detail.created_at, { withTime: true })}</p></div>
              <div><p className="text-xs text-slate-400">User</p><p className="font-medium">{getUserById(detail.user_id)?.full_name}</p></div>
              <div><p className="text-xs text-slate-400">Aksi</p><Badge variant={ACTION_VARIANT[detail.action]}>{detail.action}</Badge></div>
              <div><p className="text-xs text-slate-400">Entitas</p><p className="font-medium">{detail.entity_type} #{detail.entity_id}</p></div>
            </div>
            {detail.after_json && (
              <div>
                <p className="text-xs text-slate-400 mb-1">Data (after_json)</p>
                <pre className="rounded-lg bg-slate-50 p-3 text-xs overflow-x-auto text-slate-600">{JSON.stringify(JSON.parse(detail.after_json), null, 2)}</pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
