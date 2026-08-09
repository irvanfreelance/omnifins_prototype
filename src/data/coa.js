// Chart of Accounts — PSAK 109 / ISAK 35 template, shared across all nodes (owner: Pusat, org_node_id=1)
// account_type: asset | liability | equity | revenue | expense | fund_balance
export const coa = [
  // ===== LEVEL 1 =====
  { id: 1, account_code: '1', account_name: 'Aset', account_type: 'asset', normal_balance: 'debit', parent_id: null, coa_level: 1, coa_path: '/1', is_group: true },
  { id: 2, account_code: '2', account_name: 'Kewajiban', account_type: 'liability', normal_balance: 'credit', parent_id: null, coa_level: 1, coa_path: '/2', is_group: true },
  { id: 3, account_code: '3', account_name: 'Saldo Dana', account_type: 'fund_balance', normal_balance: 'credit', parent_id: null, coa_level: 1, coa_path: '/3', is_group: true },
  { id: 4, account_code: '4', account_name: 'Penerimaan', account_type: 'revenue', normal_balance: 'credit', parent_id: null, coa_level: 1, coa_path: '/4', is_group: true },
  { id: 5, account_code: '5', account_name: 'Penyaluran Dana', account_type: 'expense', normal_balance: 'debit', parent_id: null, coa_level: 1, coa_path: '/5', is_group: true },

  // ===== LEVEL 2 =====
  { id: 10, account_code: '1.01', account_name: 'Aset Lancar', account_type: 'asset', normal_balance: 'debit', parent_id: 1, coa_level: 2, coa_path: '/1/10', is_group: true },
  { id: 11, account_code: '1.02', account_name: 'Aset Tidak Lancar', account_type: 'asset', normal_balance: 'debit', parent_id: 1, coa_level: 2, coa_path: '/1/11', is_group: true },
  { id: 20, account_code: '2.01', account_name: 'Kewajiban Jangka Pendek', account_type: 'liability', normal_balance: 'credit', parent_id: 2, coa_level: 2, coa_path: '/2/20', is_group: true },
  { id: 30, account_code: '3.01', account_name: 'Dana Tidak Terikat', account_type: 'fund_balance', normal_balance: 'credit', parent_id: 3, coa_level: 2, coa_path: '/3/30', is_group: false },
  { id: 31, account_code: '3.02', account_name: 'Dana Terikat Sementara', account_type: 'fund_balance', normal_balance: 'credit', parent_id: 3, coa_level: 2, coa_path: '/3/31', is_group: false },
  { id: 32, account_code: '3.03', account_name: 'Dana Terikat Permanen', account_type: 'fund_balance', normal_balance: 'credit', parent_id: 3, coa_level: 2, coa_path: '/3/32', is_group: false },
  { id: 40, account_code: '4.01', account_name: 'Penerimaan Zakat', account_type: 'revenue', normal_balance: 'credit', parent_id: 4, coa_level: 2, coa_path: '/4/40', is_group: true },
  { id: 41, account_code: '4.02', account_name: 'Penerimaan Infaq / Sedekah / Wakaf', account_type: 'revenue', normal_balance: 'credit', parent_id: 4, coa_level: 2, coa_path: '/4/41', is_group: true },
  { id: 42, account_code: '4.03', account_name: 'Penerimaan Dana Amil', account_type: 'revenue', normal_balance: 'credit', parent_id: 4, coa_level: 2, coa_path: '/4/42', is_group: false },
  { id: 43, account_code: '4.04', account_name: 'Penerimaan Lain-lain', account_type: 'revenue', normal_balance: 'credit', parent_id: 4, coa_level: 2, coa_path: '/4/43', is_group: false },
  { id: 50, account_code: '5.01', account_name: 'Penyaluran Fakir Miskin', account_type: 'expense', normal_balance: 'debit', parent_id: 5, coa_level: 2, coa_path: '/5/50', is_group: true },
  { id: 51, account_code: '5.02', account_name: 'Penyaluran Fisabilillah & Program', account_type: 'expense', normal_balance: 'debit', parent_id: 5, coa_level: 2, coa_path: '/5/51', is_group: true },
  { id: 52, account_code: '5.03', account_name: 'Biaya Operasional Amil', account_type: 'expense', normal_balance: 'debit', parent_id: 5, coa_level: 2, coa_path: '/5/52', is_group: true },

  // ===== LEVEL 3 =====
  { id: 100, account_code: '1.01.01', account_name: 'Kas', account_type: 'asset', normal_balance: 'debit', parent_id: 10, coa_level: 3, coa_path: '/1/10/100', is_group: true },
  { id: 101, account_code: '1.01.02', account_name: 'Bank', account_type: 'asset', normal_balance: 'debit', parent_id: 10, coa_level: 3, coa_path: '/1/10/101', is_group: true },
  { id: 102, account_code: '1.01.03', account_name: 'Piutang', account_type: 'asset', normal_balance: 'debit', parent_id: 10, coa_level: 3, coa_path: '/1/10/102', is_group: true },
  { id: 110, account_code: '1.02.01', account_name: 'Aset Tetap', account_type: 'asset', normal_balance: 'debit', parent_id: 11, coa_level: 3, coa_path: '/1/11/110', is_group: false },
  { id: 111, account_code: '1.02.02', account_name: 'Akumulasi Penyusutan Aset Tetap', account_type: 'asset', normal_balance: 'credit', parent_id: 11, coa_level: 3, coa_path: '/1/11/111', is_group: false },
  { id: 200, account_code: '2.01.01', account_name: 'Utang kepada Mitra / Vendor', account_type: 'liability', normal_balance: 'credit', parent_id: 20, coa_level: 3, coa_path: '/2/20/200', is_group: false },
  { id: 201, account_code: '2.01.02', account_name: 'Titipan Dana Pihak Ketiga', account_type: 'liability', normal_balance: 'credit', parent_id: 20, coa_level: 3, coa_path: '/2/20/201', is_group: false },
  { id: 400, account_code: '4.01.001', account_name: 'Penerimaan Zakat Maal', account_type: 'revenue', normal_balance: 'credit', parent_id: 40, coa_level: 3, coa_path: '/4/40/400', is_group: false },
  { id: 401, account_code: '4.01.002', account_name: 'Penerimaan Zakat Fitrah', account_type: 'revenue', normal_balance: 'credit', parent_id: 40, coa_level: 3, coa_path: '/4/40/401', is_group: false },
  { id: 410, account_code: '4.02.001', account_name: 'Penerimaan Infaq', account_type: 'revenue', normal_balance: 'credit', parent_id: 41, coa_level: 3, coa_path: '/4/41/410', is_group: false },
  { id: 411, account_code: '4.02.002', account_name: 'Penerimaan Sedekah', account_type: 'revenue', normal_balance: 'credit', parent_id: 41, coa_level: 3, coa_path: '/4/41/411', is_group: false },
  { id: 412, account_code: '4.02.003', account_name: 'Penerimaan Wakaf', account_type: 'revenue', normal_balance: 'credit', parent_id: 41, coa_level: 3, coa_path: '/4/41/412', is_group: false },
  { id: 413, account_code: '4.02.004', account_name: 'Penerimaan Donasi Program Terikat', account_type: 'revenue', normal_balance: 'credit', parent_id: 41, coa_level: 3, coa_path: '/4/41/413', is_group: false },
  { id: 420, account_code: '4.03.001', account_name: 'Hak Amil dari Zakat', account_type: 'revenue', normal_balance: 'credit', parent_id: 42, coa_level: 3, coa_path: '/4/42/420', is_group: false },
  { id: 430, account_code: '4.04.001', account_name: 'Bagi Hasil / Jasa Giro Bank Syariah', account_type: 'revenue', normal_balance: 'credit', parent_id: 43, coa_level: 3, coa_path: '/4/43/430', is_group: false },
  { id: 500, account_code: '5.01.001', account_name: 'Penyaluran Fakir', account_type: 'expense', normal_balance: 'debit', parent_id: 50, coa_level: 3, coa_path: '/5/50/500', is_group: false },
  { id: 501, account_code: '5.01.002', account_name: 'Penyaluran Miskin', account_type: 'expense', normal_balance: 'debit', parent_id: 50, coa_level: 3, coa_path: '/5/50/501', is_group: false },
  { id: 510, account_code: '5.02.001', account_name: 'Penyaluran Beasiswa Pendidikan', account_type: 'expense', normal_balance: 'debit', parent_id: 51, coa_level: 3, coa_path: '/5/51/510', is_group: false },
  { id: 511, account_code: '5.02.002', account_name: 'Penyaluran Kesehatan', account_type: 'expense', normal_balance: 'debit', parent_id: 51, coa_level: 3, coa_path: '/5/51/511', is_group: false },
  { id: 512, account_code: '5.02.003', account_name: 'Penyaluran Fisabilillah', account_type: 'expense', normal_balance: 'debit', parent_id: 51, coa_level: 3, coa_path: '/5/51/512', is_group: false },
  { id: 513, account_code: '5.02.004', account_name: 'Penyaluran Muallaf', account_type: 'expense', normal_balance: 'debit', parent_id: 51, coa_level: 3, coa_path: '/5/51/513', is_group: false },
  { id: 514, account_code: '5.02.005', account_name: 'Penyaluran Ibnu Sabil', account_type: 'expense', normal_balance: 'debit', parent_id: 51, coa_level: 3, coa_path: '/5/51/514', is_group: false },
  { id: 515, account_code: '5.02.006', account_name: 'Penyaluran Gharim', account_type: 'expense', normal_balance: 'debit', parent_id: 51, coa_level: 3, coa_path: '/5/51/515', is_group: false },
  { id: 516, account_code: '5.02.007', account_name: 'Penyaluran Riqab', account_type: 'expense', normal_balance: 'debit', parent_id: 51, coa_level: 3, coa_path: '/5/51/516', is_group: false },
  { id: 520, account_code: '5.03.001', account_name: 'Biaya Gaji & Tunjangan Amil', account_type: 'expense', normal_balance: 'debit', parent_id: 52, coa_level: 3, coa_path: '/5/52/520', is_group: false },
  { id: 521, account_code: '5.03.002', account_name: 'Biaya Operasional Kantor', account_type: 'expense', normal_balance: 'debit', parent_id: 52, coa_level: 3, coa_path: '/5/52/521', is_group: false },
  { id: 522, account_code: '5.03.003', account_name: 'Biaya Listrik, Air & Internet', account_type: 'expense', normal_balance: 'debit', parent_id: 52, coa_level: 3, coa_path: '/5/52/522', is_group: false },
  { id: 523, account_code: '5.03.004', account_name: 'Biaya Transportasi & Sosialisasi', account_type: 'expense', normal_balance: 'debit', parent_id: 52, coa_level: 3, coa_path: '/5/52/523', is_group: false },
  { id: 524, account_code: '5.03.005', account_name: 'Biaya Penyusutan Aset Tetap', account_type: 'expense', normal_balance: 'debit', parent_id: 52, coa_level: 3, coa_path: '/5/52/524', is_group: false },
  { id: 525, account_code: '5.03.006', account_name: 'Biaya Cetak & Publikasi', account_type: 'expense', normal_balance: 'debit', parent_id: 52, coa_level: 3, coa_path: '/5/52/525', is_group: false },
  { id: 526, account_code: '5.03.007', account_name: 'Kerugian Pelepasan Aset Tetap', account_type: 'expense', normal_balance: 'debit', parent_id: 52, coa_level: 3, coa_path: '/5/52/526', is_group: false },

  // ===== LEVEL 4 — Kas & Bank leaf (linked 1:1 to bank_accounts) =====
  { id: 1001, account_code: '1.01.01.001', account_name: 'Kas Kecil Pusat', account_type: 'asset', normal_balance: 'debit', parent_id: 100, coa_level: 4, coa_path: '/1/10/100/1001', is_group: false },
  { id: 1002, account_code: '1.01.01.002', account_name: 'Kas Kecil Daerah Bandung', account_type: 'asset', normal_balance: 'debit', parent_id: 100, coa_level: 4, coa_path: '/1/10/100/1002', is_group: false },
  { id: 1003, account_code: '1.01.01.003', account_name: 'Kas Kecil Daerah Garut', account_type: 'asset', normal_balance: 'debit', parent_id: 100, coa_level: 4, coa_path: '/1/10/100/1003', is_group: false },
  { id: 1004, account_code: '1.01.01.004', account_name: 'Kas Kecil Daerah Semarang', account_type: 'asset', normal_balance: 'debit', parent_id: 100, coa_level: 4, coa_path: '/1/10/100/1004', is_group: false },
  { id: 1010, account_code: '1.01.02.001', account_name: 'BRI Penerimaan 3305', account_type: 'asset', normal_balance: 'debit', parent_id: 101, coa_level: 4, coa_path: '/1/10/101/1010', is_group: false },
  { id: 1011, account_code: '1.01.02.002', account_name: 'BSI Penerimaan 5859', account_type: 'asset', normal_balance: 'debit', parent_id: 101, coa_level: 4, coa_path: '/1/10/101/1011', is_group: false },
  { id: 1012, account_code: '1.01.02.003', account_name: 'Bank Mandiri Operasional 0012', account_type: 'asset', normal_balance: 'debit', parent_id: 101, coa_level: 4, coa_path: '/1/10/101/1012', is_group: false },
  { id: 1013, account_code: '1.01.02.004', account_name: 'BCA Syariah SMB 0354333999', account_type: 'asset', normal_balance: 'debit', parent_id: 101, coa_level: 4, coa_path: '/1/10/101/1013', is_group: false },
  { id: 1014, account_code: '1.01.02.005', account_name: 'BSI Daerah Bandung 7198', account_type: 'asset', normal_balance: 'debit', parent_id: 101, coa_level: 4, coa_path: '/1/10/101/1014', is_group: false },
  { id: 1015, account_code: '1.01.02.006', account_name: 'BRI Daerah Garut 9876', account_type: 'asset', normal_balance: 'debit', parent_id: 101, coa_level: 4, coa_path: '/1/10/101/1015', is_group: false },
  { id: 1016, account_code: '1.01.02.007', account_name: 'Bank Mandiri Daerah Semarang 4521', account_type: 'asset', normal_balance: 'debit', parent_id: 101, coa_level: 4, coa_path: '/1/10/101/1016', is_group: false },
  { id: 1020, account_code: '1.01.03.001', account_name: 'Piutang Karyawan / Cash Advance', account_type: 'asset', normal_balance: 'debit', parent_id: 102, coa_level: 4, coa_path: '/1/10/102/1020', is_group: false },
]

export function getCoaById(id) {
  return coa.find((c) => c.id === id)
}

export function getCoaChildren(parentId) {
  return coa.filter((c) => c.parent_id === parentId)
}

export function getCoaLeaves() {
  return coa.filter((c) => !c.is_group)
}

export function buildCoaTree() {
  const map = new Map(coa.map((c) => [c.id, { ...c, children: [] }]))
  const roots = []
  for (const node of map.values()) {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id).children.push(node)
    } else if (!node.parent_id) {
      roots.push(node)
    }
  }
  return roots
}

export function getCoaAncestors(id) {
  const chain = []
  let current = getCoaById(id)
  while (current?.parent_id) {
    current = getCoaById(current.parent_id)
    if (current) chain.unshift(current)
  }
  return chain
}
