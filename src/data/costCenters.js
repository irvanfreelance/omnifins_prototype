export const costCenters = [
  { id: 1, code: 'DIV-AMIL', name: 'Divisi Amil', parent_id: null, cc_level: 'divisi', is_active: true },
  { id: 2, code: 'DIV-OPS', name: 'Divisi Operasional & Umum', parent_id: null, cc_level: 'divisi', is_active: true },
  { id: 3, code: 'DEPT-PENGHIM', name: 'Departemen Penghimpunan (Fundraising)', parent_id: 1, cc_level: 'departemen', is_active: true },
  { id: 4, code: 'DEPT-PENYALUR', name: 'Departemen Penyaluran & Program', parent_id: 1, cc_level: 'departemen', is_active: true },
  { id: 5, code: 'DEPT-IT', name: 'Departemen IT & Sistem', parent_id: 2, cc_level: 'departemen', is_active: true },
  { id: 6, code: 'DEPT-KEU', name: 'Departemen Keuangan', parent_id: 2, cc_level: 'departemen', is_active: true },
]

export function getCostCenterById(id) {
  return costCenters.find((c) => c.id === id)
}
