export const roles = [
  { id: 1, role_name: 'super_admin', label: 'Super Admin', description: 'Akses penuh seluruh sistem & node', is_system: true },
  { id: 2, role_name: 'admin_org', label: 'Admin Organisasi', description: 'Kelola node, master data, dan user', is_system: true },
  { id: 3, role_name: 'finance', label: 'Finance & Accounting', description: 'Input transaksi, posting jurnal, tutup buku', is_system: true },
  { id: 4, role_name: 'manager', label: 'Manager / Ketua', description: 'Approval transaksi & pantau kinerja', is_system: true },
  { id: 5, role_name: 'amil', label: 'Amil / Program Officer', description: 'Kelola donasi, distribusi, & program', is_system: true },
  { id: 6, role_name: 'viewer', label: 'Auditor / Viewer', description: 'Akses baca & audit trail', is_system: true },
]

export const permissions = [
  { id: 1, perm_code: 'org.manage', module: 'setting', description: 'Kelola struktur organisasi' },
  { id: 2, perm_code: 'user.manage', module: 'setting', description: 'Kelola user & role' },
  { id: 3, perm_code: 'coa.manage', module: 'master', description: 'Kelola Chart of Accounts' },
  { id: 4, perm_code: 'master.manage', module: 'master', description: 'Kelola master data (fund, program, kontak)' },
  { id: 5, perm_code: 'register.create', module: 'transaksi', description: 'Buat register transaksi' },
  { id: 6, perm_code: 'register.approve', module: 'transaksi', description: 'Approve register transaksi' },
  { id: 7, perm_code: 'journal.post', module: 'jurnal', description: 'Posting jurnal ke buku besar' },
  { id: 8, perm_code: 'closing.execute', module: 'closing', description: 'Eksekusi tutup buku' },
  { id: 9, perm_code: 'closing.override', module: 'closing', description: 'Override cutoff tutup buku' },
  { id: 10, perm_code: 'budget.manage', module: 'rapb', description: 'Kelola RAPB / anggaran' },
  { id: 11, perm_code: 'donation.manage', module: 'sosial', description: 'Kelola donasi & distribusi' },
  { id: 12, perm_code: 'report.view', module: 'laporan', description: 'Lihat laporan keuangan' },
  { id: 13, perm_code: 'report.export', module: 'laporan', description: 'Export laporan ke PDF/Excel' },
  { id: 14, perm_code: 'audit.view', module: 'audit', description: 'Lihat Audit Trail' },
  { id: 15, perm_code: 'consolidation.view', module: 'laporan', description: 'Lihat laporan konsolidasi multi-node' },
]

export const rolePermissions = [
  ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map((p) => ({ role_id: 1, permission_id: p })),
  ...[2,3,4,5,6,7,8,10,11,12,13,14,15].map((p) => ({ role_id: 2, permission_id: p })),
  ...[5,7,8,10,11,12,13].map((p) => ({ role_id: 3, permission_id: p })),
  ...[6,12,13,15].map((p) => ({ role_id: 4, permission_id: p })),
  ...[5,11,12,13].map((p) => ({ role_id: 5, permission_id: p })),
  ...[12,13,14].map((p) => ({ role_id: 6, permission_id: p })),
]

export function getRoleById(id) {
  return roles.find((r) => r.id === id)
}

export function roleHasPermission(roleId, permCode) {
  const perm = permissions.find((p) => p.perm_code === permCode)
  if (!perm) return false
  return rolePermissions.some((rp) => rp.role_id === roleId && rp.permission_id === perm.id)
}
