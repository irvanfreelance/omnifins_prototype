export const funds = [
  { id: 1, fund_code: 'ZM', fund_name: 'Dana Zakat Maal', fund_type: 'restricted', zakat_type: 'zakat_maal', hard_lock: true, is_active: true, coa_saldo_id: 32 },
  { id: 2, fund_code: 'ZF', fund_name: 'Dana Zakat Fitrah', fund_type: 'restricted', zakat_type: 'zakat_fitrah', hard_lock: true, is_active: true, coa_saldo_id: 32 },
  { id: 3, fund_code: 'INF', fund_name: 'Dana Infaq', fund_type: 'temporarily_restricted', zakat_type: 'infaq', hard_lock: false, is_active: true, coa_saldo_id: 31 },
  { id: 4, fund_code: 'SDK', fund_name: 'Dana Sedekah', fund_type: 'unrestricted', zakat_type: 'sedekah', hard_lock: false, is_active: true, coa_saldo_id: 30 },
  { id: 5, fund_code: 'WKF', fund_name: 'Dana Wakaf', fund_type: 'restricted', zakat_type: 'wakaf', hard_lock: true, is_active: true, coa_saldo_id: 32 },
  { id: 6, fund_code: 'AMIL', fund_name: 'Dana Amil / Operasional', fund_type: 'unrestricted', zakat_type: null, hard_lock: false, is_active: true, coa_saldo_id: 30 },
  { id: 7, fund_code: 'PROG-KES', fund_name: 'Dana Program Kesehatan', fund_type: 'restricted', zakat_type: 'infaq', hard_lock: true, is_active: true, coa_saldo_id: 31 },
  { id: 8, fund_code: 'PROG-BEA', fund_name: 'Dana Program Beasiswa', fund_type: 'restricted', zakat_type: 'infaq', hard_lock: true, is_active: true, coa_saldo_id: 31 },
  { id: 9, fund_code: 'PROG-BENCANA', fund_name: 'Dana Tanggap Bencana', fund_type: 'restricted', zakat_type: 'infaq', hard_lock: true, is_active: true, coa_saldo_id: 31 },
  { id: 10, fund_code: 'PROG-DAI', fund_name: 'Dana Dakwah & Fisabilillah', fund_type: 'restricted', zakat_type: 'infaq', hard_lock: true, is_active: true, coa_saldo_id: 31 },
]

export function getFundById(id) {
  return funds.find((f) => f.id === id)
}

export const FUND_TYPE_LABEL = {
  restricted: 'Terikat Permanen',
  temporarily_restricted: 'Terikat Sementara',
  unrestricted: 'Tidak Terikat',
}
