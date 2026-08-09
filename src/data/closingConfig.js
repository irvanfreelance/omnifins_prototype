export const closingCutoffConfig = [
  { id: 1, org_node_id: 1, cutoff_day: 5, mode: 'approval', override_role: 'super_admin', effective_from: '2026-01-01', created_by: 1 },
  { id: 2, org_node_id: 2, cutoff_day: 5, mode: 'strict', override_role: 'super_admin', effective_from: '2026-01-01', created_by: 1 },
  { id: 3, org_node_id: 3, cutoff_day: 5, mode: 'strict', override_role: 'super_admin', effective_from: '2026-01-01', created_by: 1 },
  { id: 4, org_node_id: 4, cutoff_day: 3, mode: 'strict', override_role: 'super_admin', effective_from: '2026-01-01', created_by: 3 },
  { id: 5, org_node_id: 5, cutoff_day: 3, mode: 'strict', override_role: 'super_admin', effective_from: '2026-01-01', created_by: 3 },
  { id: 6, org_node_id: 6, cutoff_day: 5, mode: 'strict', override_role: 'super_admin', effective_from: '2026-01-01', created_by: 4 },
]

export function getCutoffConfig(nodeId) {
  return closingCutoffConfig.find((c) => c.org_node_id === nodeId)
}
