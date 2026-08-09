export const programs = [
  { id: 1, org_node_id: 1, fund_id: 7, cost_center_id: 4, program_code: 'KES-2026', program_name: 'Program Kesehatan Gratis 2026', description: 'Layanan kesehatan gratis & bantuan biaya berobat bagi mustahiq fakir/miskin.', pic_user_id: 6, target_amount: 500_000_000, period_start: '2026-01-01', period_end: '2026-12-31', status: 'active' },
  { id: 2, org_node_id: 1, fund_id: 8, cost_center_id: 4, program_code: 'BEA-2026', program_name: 'Program Beasiswa Yatim & Dhuafa 2026', description: 'Beasiswa pendidikan untuk anak yatim dan keluarga dhuafa.', pic_user_id: 6, target_amount: 300_000_000, period_start: '2026-01-01', period_end: '2026-12-31', status: 'active' },
  { id: 3, org_node_id: 4, fund_id: 3, cost_center_id: 3, program_code: 'INFAQ-MAJ', program_name: 'Program Infaq Masjid Bersinar', description: 'Penghimpunan infaq rutin jamaah Masjid Bersinar Bandung.', pic_user_id: 6, target_amount: 150_000_000, period_start: '2026-01-01', period_end: '2026-12-31', status: 'active' },
  { id: 4, org_node_id: 1, fund_id: 1, cost_center_id: 4, program_code: 'ZM-DIST', program_name: 'Program Zakat Maal Reguler', description: 'Penyaluran rutin zakat maal ke 8 asnaf.', pic_user_id: 6, target_amount: 1_000_000_000, period_start: '2026-01-01', period_end: '2026-12-31', status: 'active' },
  { id: 5, org_node_id: 1, fund_id: 9, cost_center_id: 4, program_code: 'BENCANA-2026', program_name: 'Program Tanggap Bencana Gempa Cianjur', description: 'Bantuan darurat & recovery pasca gempa wilayah Cianjur & sekitarnya.', pic_user_id: 8, target_amount: 250_000_000, period_start: '2026-02-01', period_end: '2026-10-31', status: 'active' },
  { id: 6, org_node_id: 1, fund_id: 10, cost_center_id: 4, program_code: 'DAKWAH-2026', program_name: 'Program Dakwah & Fisabilillah', description: 'Dukungan operasional dai, pesantren, dan kegiatan syiar.', pic_user_id: 10, target_amount: 180_000_000, period_start: '2026-01-01', period_end: '2026-12-31', status: 'active' },
  { id: 7, org_node_id: 1, fund_id: 5, cost_center_id: 4, program_code: 'WAKAF-PROD', program_name: 'Program Wakaf Produktif', description: 'Pengelolaan aset wakaf produktif (kios, lahan) untuk manfaat berkelanjutan.', pic_user_id: 6, target_amount: 400_000_000, period_start: '2026-01-01', period_end: '2026-12-31', status: 'active' },
  { id: 8, org_node_id: 1, fund_id: 2, cost_center_id: 4, program_code: 'ZF-1447H', program_name: 'Program Zakat Fitrah Ramadhan 1447H', description: 'Penyaluran zakat fitrah menjelang Idul Fitri 1447H.', pic_user_id: 6, target_amount: 220_000_000, period_start: '2026-02-10', period_end: '2026-03-25', status: 'closed' },
]

export function getProgramById(id) {
  return programs.find((p) => p.id === id)
}
