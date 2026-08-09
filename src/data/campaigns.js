export const campaigns = [
  { id: 1, org_node_id: 1, fund_id: 2, program_id: 8, campaign_code: 'CMP-RMD1447', campaign_name: 'Ramadhan Berbagi 1447H', description: 'Kampanye penghimpunan zakat fitrah, infaq, dan buka puasa bersama.', target_amount: 300_000_000, start_date: '2026-02-01', end_date: '2026-03-25', status: 'closed' },
  { id: 2, org_node_id: 1, fund_id: 9, program_id: 5, campaign_code: 'CMP-BENCANA', campaign_name: 'Tanggap Darurat Gempa Cianjur', description: 'Penggalangan dana darurat untuk korban gempa Cianjur & sekitarnya.', target_amount: 250_000_000, start_date: '2026-02-05', end_date: '2026-10-31', status: 'active' },
  { id: 3, org_node_id: 1, fund_id: 5, program_id: 7, campaign_code: 'CMP-WAKAFSUMUR', campaign_name: 'Wakaf Sumur & Air Bersih', description: 'Pembangunan sumur wakaf produktif di daerah kekeringan.', target_amount: 150_000_000, start_date: '2026-04-01', end_date: '2026-12-31', status: 'active' },
  { id: 4, org_node_id: 1, fund_id: 8, program_id: 2, campaign_code: 'CMP-BEA2627', campaign_name: 'Beasiswa Tahun Ajaran 2026/2027', description: 'Penggalangan dana beasiswa untuk tahun ajaran baru.', target_amount: 200_000_000, start_date: '2026-06-01', end_date: '2026-08-31', status: 'active' },
]

export function getCampaignById(id) {
  return campaigns.find((c) => c.id === id)
}
