export const ORG_NAME = 'LAZ Sinergi'
export const ORG_FULL_NAME = 'Lembaga Amil Zakat Sinergi Prima'

export const orgNodes = [
  {
    id: 1,
    name: 'LAZ Sinergi — Kantor Pusat',
    short_code: 'PUSAT',
    org_level: 'pusat',
    parent_id: null,
    org_path: '/1',
    entity_type: 'ngo',
    psak_standard: 'PSAK109',
    address: 'Jl. Sinergi Raya No. 88, Bandung, Jawa Barat',
    phone: '022-1234567',
    email: 'pusat@lazsinergi.org',
    is_active: true,
  },
  {
    id: 2,
    name: 'Wilayah Jawa Barat',
    short_code: 'WIL-JBR',
    org_level: 'wilayah',
    parent_id: 1,
    org_path: '/1/2',
    entity_type: 'ngo',
    psak_standard: 'PSAK109',
    address: 'Jl. Asia Afrika No. 10, Bandung',
    phone: '022-2345678',
    email: 'jabar@lazsinergi.org',
    is_active: true,
  },
  {
    id: 3,
    name: 'Wilayah Jawa Tengah',
    short_code: 'WIL-JTG',
    org_level: 'wilayah',
    parent_id: 1,
    org_path: '/1/3',
    entity_type: 'ngo',
    psak_standard: 'PSAK109',
    address: 'Jl. Pemuda No. 5, Semarang',
    phone: '024-3456789',
    email: 'jateng@lazsinergi.org',
    is_active: true,
  },
  {
    id: 4,
    name: 'Daerah Bandung',
    short_code: 'DAE-BDG',
    org_level: 'daerah',
    parent_id: 2,
    org_path: '/1/2/4',
    entity_type: 'ngo',
    psak_standard: 'PSAK109',
    address: 'Jl. Dago No. 20, Bandung',
    phone: '022-4567890',
    email: 'bandung@lazsinergi.org',
    is_active: true,
  },
  {
    id: 5,
    name: 'Daerah Garut',
    short_code: 'DAE-GRT',
    org_level: 'daerah',
    parent_id: 2,
    org_path: '/1/2/5',
    entity_type: 'ngo',
    psak_standard: 'PSAK109',
    address: 'Jl. Ahmad Yani No. 7, Garut',
    phone: '0262-5678901',
    email: 'garut@lazsinergi.org',
    is_active: true,
  },
  {
    id: 6,
    name: 'Daerah Semarang',
    short_code: 'DAE-SMG',
    org_level: 'daerah',
    parent_id: 3,
    org_path: '/1/3/6',
    entity_type: 'ngo',
    psak_standard: 'PSAK109',
    address: 'Jl. Pandanaran No. 15, Semarang',
    phone: '024-6789012',
    email: 'semarang@lazsinergi.org',
    is_active: true,
  },
]

export const PRODUCING_NODE_IDS = [1, 4, 5, 6] // Pusat + 3 Daerah transact directly
export const WILAYAH_NODE_IDS = [2, 3]

export function getNodeById(id) {
  return orgNodes.find((n) => n.id === id)
}

export function getChildNodeIds(nodeId, includeSelf = true) {
  const result = includeSelf ? [nodeId] : []
  const stack = [nodeId]
  while (stack.length) {
    const current = stack.pop()
    for (const n of orgNodes) {
      if (n.parent_id === current) {
        result.push(n.id)
        stack.push(n.id)
      }
    }
  }
  return result
}

export function getNodePath(nodeId) {
  const path = []
  let current = getNodeById(nodeId)
  while (current) {
    path.unshift(current)
    current = current.parent_id ? getNodeById(current.parent_id) : null
  }
  return path
}
