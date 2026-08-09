import { roles } from './roles'

export const users = [
  { id: 1, org_node_id: 1, full_name: 'Ahmad Fauzi Nugroho', email: 'ahmad.fauzi@lazsinergi.org', phone_wa: '081111111101', role_id: 1, is_active: true, last_login_at: '2026-08-08T07:42:00+07:00', avatar_color: '#2563EB' },
  { id: 2, org_node_id: 1, full_name: 'Siti Rahayu Wulandari', email: 'siti.rahayu@lazsinergi.org', phone_wa: '081111111102', role_id: 3, is_active: true, last_login_at: '2026-08-08T08:10:00+07:00', avatar_color: '#059669' },
  { id: 3, org_node_id: 2, full_name: 'Budi Santoso', email: 'budi.santoso@lazsinergi.org', phone_wa: '081111111103', role_id: 2, is_active: true, last_login_at: '2026-08-07T16:20:00+07:00', avatar_color: '#7C3AED' },
  { id: 4, org_node_id: 3, full_name: 'Rina Marlina', email: 'rina.marlina@lazsinergi.org', phone_wa: '081111111104', role_id: 2, is_active: true, last_login_at: '2026-08-06T09:00:00+07:00', avatar_color: '#DB2777' },
  { id: 5, org_node_id: 4, full_name: 'Dewi Kurniawati', email: 'dewi.kurniawati@lazsinergi.org', phone_wa: '081111111105', role_id: 3, is_active: true, last_login_at: '2026-08-08T08:05:00+07:00', avatar_color: '#0891B2' },
  { id: 6, org_node_id: 4, full_name: 'Rizqi Berliandie Ramadhan', email: 'rizqi.berliandie@lazsinergi.org', phone_wa: '081111111106', role_id: 5, is_active: true, last_login_at: '2026-08-08T07:55:00+07:00', avatar_color: '#D97706' },
  { id: 7, org_node_id: 5, full_name: 'Hendra Gunawan', email: 'hendra.gunawan@lazsinergi.org', phone_wa: '081111111107', role_id: 3, is_active: true, last_login_at: '2026-08-05T11:30:00+07:00', avatar_color: '#4F46E5' },
  { id: 8, org_node_id: 5, full_name: 'Yusuf Maulana', email: 'yusuf.maulana@lazsinergi.org', phone_wa: '081111111108', role_id: 5, is_active: true, last_login_at: '2026-08-07T14:12:00+07:00', avatar_color: '#B91C1C' },
  { id: 9, org_node_id: 6, full_name: 'Fajar Ramadhan', email: 'fajar.ramadhan@lazsinergi.org', phone_wa: '081111111109', role_id: 3, is_active: true, last_login_at: '2026-08-04T10:44:00+07:00', avatar_color: '#0D9488' },
  { id: 10, org_node_id: 6, full_name: 'Nur Kholis Majid', email: 'nur.kholis@lazsinergi.org', phone_wa: '081111111110', role_id: 5, is_active: true, last_login_at: '2026-08-07T13:00:00+07:00', avatar_color: '#9333EA' },
  { id: 11, org_node_id: 1, full_name: 'Dr. Taufiq Rahman Hakim', email: 'taufiq.rahman@lazsinergi.org', phone_wa: '081111111111', role_id: 4, is_active: true, last_login_at: '2026-08-08T06:50:00+07:00', avatar_color: '#1D4ED8' },
  { id: 12, org_node_id: 1, full_name: 'Andi Prasetyo', email: 'andi.prasetyo@lazsinergi.org', phone_wa: '081111111112', role_id: 6, is_active: true, last_login_at: '2026-08-01T09:00:00+07:00', avatar_color: '#64748B' },
]

export const userRoles = [
  { id: 1, user_id: 1, role_id: 1, org_node_id: 1, scope_type: 'all', scope_node_ids: [1, 2, 3, 4, 5, 6] },
  { id: 2, user_id: 2, role_id: 3, org_node_id: 1, scope_type: 'own', scope_node_ids: [1] },
  { id: 3, user_id: 3, role_id: 2, org_node_id: 2, scope_type: 'region', scope_node_ids: [2, 4, 5] },
  { id: 4, user_id: 4, role_id: 2, org_node_id: 3, scope_type: 'region', scope_node_ids: [3, 6] },
  { id: 5, user_id: 5, role_id: 3, org_node_id: 4, scope_type: 'own', scope_node_ids: [4] },
  { id: 6, user_id: 6, role_id: 5, org_node_id: 4, scope_type: 'own', scope_node_ids: [4] },
  { id: 7, user_id: 7, role_id: 3, org_node_id: 5, scope_type: 'own', scope_node_ids: [5] },
  { id: 8, user_id: 8, role_id: 5, org_node_id: 5, scope_type: 'own', scope_node_ids: [5] },
  { id: 9, user_id: 9, role_id: 3, org_node_id: 6, scope_type: 'own', scope_node_ids: [6] },
  { id: 10, user_id: 10, role_id: 5, org_node_id: 6, scope_type: 'own', scope_node_ids: [6] },
  { id: 11, user_id: 11, role_id: 4, org_node_id: 1, scope_type: 'all', scope_node_ids: [1, 2, 3, 4, 5, 6] },
  { id: 12, user_id: 12, role_id: 6, org_node_id: 1, scope_type: 'all', scope_node_ids: [1, 2, 3, 4, 5, 6] },
]

// The prototype's logged-in identity: Super Admin, scope = all nodes.
export const CURRENT_USER_ID = 1

export function getUserById(id) {
  return users.find((u) => u.id === id)
}

export function getUserRole(userId) {
  const user = getUserById(userId)
  return user ? roles.find((r) => r.id === user.role_id) : null
}

export function getUserScope(userId) {
  return userRoles.find((r) => r.user_id === userId)
}
