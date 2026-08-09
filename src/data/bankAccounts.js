// current_balance is computed by the generator from journal_items after transactions are built.
export const bankAccountsSeed = [
  { id: 1, org_node_id: 1, coa_id: 1010, bank_name: 'Bank BRI', account_no: '3305-01-234567-80', account_name: 'LAZ Sinergi — Penerimaan', account_type: 'tabungan', opening_balance: 120_000_000, min_balance: 50_000_000 },
  { id: 2, org_node_id: 1, coa_id: 1011, bank_name: 'BSI', account_no: '7123456859', account_name: 'LAZ Sinergi Pusat', account_type: 'tabungan', opening_balance: 85_000_000, min_balance: 30_000_000 },
  { id: 3, org_node_id: 1, coa_id: 1012, bank_name: 'Bank Mandiri', account_no: '132-00-0012345-6', account_name: 'LAZ Sinergi Operasional', account_type: 'giro', opening_balance: 210_000_000, min_balance: 100_000_000 },
  { id: 4, org_node_id: 1, coa_id: 1013, bank_name: 'BCA Syariah', account_no: '0354333999', account_name: 'LAZ Sinergi SMB', account_type: 'tabungan', opening_balance: 65_000_000, min_balance: 25_000_000 },
  { id: 5, org_node_id: 4, coa_id: 1014, bank_name: 'BSI', account_no: '7198765432', account_name: 'LAZ Sinergi Daerah Bandung', account_type: 'tabungan', opening_balance: 40_000_000, min_balance: 10_000_000 },
  { id: 6, org_node_id: 5, coa_id: 1015, bank_name: 'Bank BRI', account_no: '3305-01-987654-30', account_name: 'LAZ Sinergi Daerah Garut', account_type: 'tabungan', opening_balance: 25_000_000, min_balance: 5_000_000 },
  { id: 7, org_node_id: 6, coa_id: 1016, bank_name: 'Bank Mandiri', account_no: '132-00-4521678-9', account_name: 'LAZ Sinergi Daerah Semarang', account_type: 'tabungan', opening_balance: 22_000_000, min_balance: 5_000_000 },
  { id: 8, org_node_id: 1, coa_id: 1001, bank_name: 'Kas Internal', account_no: 'KAS-PUSAT', account_name: 'Kas Kecil Pusat', account_type: 'kas', opening_balance: 5_000_000, min_balance: 1_000_000 },
  { id: 9, org_node_id: 4, coa_id: 1002, bank_name: 'Kas Internal', account_no: 'KAS-BDG', account_name: 'Kas Kecil Daerah Bandung', account_type: 'kas', opening_balance: 3_000_000, min_balance: 500_000 },
  { id: 10, org_node_id: 5, coa_id: 1003, bank_name: 'Kas Internal', account_no: 'KAS-GRT', account_name: 'Kas Kecil Daerah Garut', account_type: 'kas', opening_balance: 2_000_000, min_balance: 500_000 },
  { id: 11, org_node_id: 6, coa_id: 1004, bank_name: 'Kas Internal', account_no: 'KAS-SMG', account_name: 'Kas Kecil Daerah Semarang', account_type: 'kas', opening_balance: 2_000_000, min_balance: 500_000 },
]
