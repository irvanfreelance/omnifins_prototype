import { makeRng } from './rng'
import { orgNodes, PRODUCING_NODE_IDS } from './orgNodes'
import { coa, getCoaById } from './coa'
import { funds, getFundById } from './funds'
import { programs } from './programs'
import { campaigns } from './campaigns'
import { costCenters } from './costCenters'
import { bankAccountsSeed } from './bankAccounts'
import { contacts } from './contacts'
import { assetsSeed } from './assetsSeed'
import { closingCutoffConfig } from './closingConfig'
import { users } from './users'

export const TODAY = new Date(2026, 7, 8) // 8 Agustus 2026
export const TODAY_Y = 2026
export const TODAY_M = 8
export const TODAY_D = 8

const rng = makeRng(1337)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function pad(n, len = 2) {
  return String(n).padStart(len, '0')
}
function ymd(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`
}
function isRamadhan(y, m) {
  return (y === 2025 && m === 3) || (y === 2026 && m === 2) || (y === 2026 && m === 3)
}
function monthRange() {
  const out = []
  let y = 2025,
    m = 1
  while (y < TODAY_Y || (y === TODAY_Y && m <= TODAY_M)) {
    out.push({ year: y, month: m, isCurrent: y === TODAY_Y && m === TODAY_M })
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return out
}
function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate()
}
function randomDayInMonth(y, m) {
  const maxDay = y === TODAY_Y && m === TODAY_M ? TODAY_D : daysInMonth(y, m)
  return rng.int(1, Math.max(1, maxDay))
}

const revenueCoaByFund = { 1: 400, 2: 401, 3: 410, 4: 411, 5: 412, 6: 420, 7: 413, 8: 413, 9: 413, 10: 413 }
const fundBalanceCoaByType = { restricted: 32, temporarily_restricted: 31, unrestricted: 30 }

function expenseCoaFor(program, asnaf) {
  if (program?.program_code === 'KES-2026') return 511
  if (program?.program_code === 'BEA-2026') return 510
  if (program?.program_code === 'DAKWAH-2026') return 512
  if (program?.program_code === 'WAKAF-PROD') return 512
  const map = { fakir: 500, miskin: 501, fisabilillah: 512, muallaf: 513, ibnu_sabil: 514, gharim: 515, riqab: 516, amil: 520 }
  return map[asnaf] || 501
}

const NODE_BANK = {
  1: { banks: [1, 2, 3, 4], kas: 8 },
  4: { banks: [5], kas: 9 },
  5: { banks: [6], kas: 10 },
  6: { banks: [7], kas: 11 },
}
function bankAccountFor(nodeId, rand = true) {
  const cfg = NODE_BANK[nodeId]
  if (!cfg) return NODE_BANK[1].banks[0]
  if (rand && cfg.banks.length > 1) return rng.pick(cfg.banks)
  return cfg.banks[0]
}
function coaIdForBankAccount(bankAccountId) {
  const acc = bankAccountsSeed.find((b) => b.id === bankAccountId)
  return acc?.coa_id
}

// ---------------------------------------------------------------------------
// ID sequencers
// ---------------------------------------------------------------------------
let _id = { register: 0, journal: 0, ji: 0, donation: 0, distribution: 0, ca: 0, caItem: 0, bs: 0, recon: 0, depr: 0, notif: 0, audit: 0, internode: 0, approvalFlow: 0, closingPeriod: 0 }
const nextId = (key) => ++_id[key]

const seqCounters = new Map()
function nextSeq(nodeId, prefix, y, m) {
  const key = `${nodeId}-${prefix}-${y}-${m}`
  const n = (seqCounters.get(key) || 0) + 1
  seqCounters.set(key, n)
  return n
}
function regNo(nodeId, y, m) {
  return `TRX/${y}/${pad(m)}/${pad(nextSeq(nodeId, 'TRX', y, m), 4)}`
}
function jrnNo(nodeId, y, m) {
  return `JRN/${y}/${pad(m)}/${pad(nextSeq(nodeId, 'JRN', y, m), 4)}`
}
function caNo(nodeId, y, m) {
  return `CA/${y}/${pad(m)}/${pad(nextSeq(nodeId, 'CA', y, m), 3)}`
}

// ---------------------------------------------------------------------------
// Output collections
// ---------------------------------------------------------------------------
const registers = []
const journals = []
const journalItems = []
const donations = []
const distributions = []
const cashAdvances = []
const caItems = []
const bankStatements = []
const reconMatches = []
const assetDepreciations = []
const notifications = []
const auditLogs = []
const internodeTransfers = []

// Running balances (fund_balance / revenue / expense lines only — see design note)
const fundLedger = new Map(funds.map((f) => [f.id, 0]))
function fundAvailable(fundId) {
  return fundLedger.get(fundId) || 0
}
function bumpFund(fundId, delta) {
  fundLedger.set(fundId, (fundLedger.get(fundId) || 0) + delta)
}

function financeUserFor(nodeId) {
  const u = users.find((u) => u.org_node_id === nodeId && u.role_id === 3)
  return u ? u.id : 2
}
function amilUserFor(nodeId) {
  const u = users.find((u) => u.org_node_id === nodeId && u.role_id === 5)
  return u ? u.id : financeUserFor(nodeId)
}
function managerUserId() {
  return 11
}
function adminOrgFor(nodeId) {
  const node = orgNodes.find((n) => n.id === nodeId)
  if (node?.org_level === 'pusat') return 1
  // find ancestor wilayah admin
  let current = node
  while (current?.parent_id) {
    current = orgNodes.find((n) => n.id === current.parent_id)
    if (current?.org_level === 'wilayah') {
      const admin = users.find((u) => u.org_node_id === current.id && u.role_id === 2)
      if (admin) return admin.id
    }
  }
  return 1
}

// ---------------------------------------------------------------------------
// Core journal writer — ensures debit = credit, tags fund/program/cc consistently
// ---------------------------------------------------------------------------
function writeJournal({ nodeId, registerId, date, y, m, description, journalType, createdBy, postedBy, lines, isPosted = true, isLocked = false }) {
  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0)
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0)
  if (Math.round(totalDebit) !== Math.round(totalCredit)) {
    throw new Error(`Unbalanced journal: ${description} (D${totalDebit} != C${totalCredit})`)
  }
  const journalId = nextId('journal')
  journals.push({
    id: journalId,
    org_node_id: nodeId,
    register_id: registerId,
    journal_no: jrnNo(nodeId, y, m),
    journal_date: date,
    period_year: y,
    period_month: m,
    description,
    journal_type: journalType,
    is_posted: isPosted,
    posted_at: isPosted ? `${date}T${pad(rng.int(8, 16))}:${pad(rng.int(0, 59))}:00+07:00` : null,
    posted_by: isPosted ? postedBy : null,
    is_reversed: false,
    reverse_of_id: null,
    is_locked: isLocked,
    total_debit: totalDebit,
    total_credit: totalCredit,
    created_by: createdBy,
  })
  lines.forEach((l, idx) => {
    const jiId = nextId('ji')
    journalItems.push({
      id: jiId,
      journal_id: journalId,
      org_node_id: nodeId,
      coa_id: l.coa_id,
      cost_center_id: l.cost_center_id || null,
      fund_id: l.fund_id || null,
      program_id: l.program_id || null,
      debit: l.debit || 0,
      credit: l.credit || 0,
      narration: l.narration,
      line_order: idx + 1,
    })
    if (l.fund_id) {
      const acc = getCoaById(l.coa_id)
      if (['revenue', 'expense', 'fund_balance'].includes(acc?.account_type)) {
        bumpFund(l.fund_id, (l.credit || 0) - (l.debit || 0))
      }
    }
  })
  return journalId
}

// ---------------------------------------------------------------------------
// PHASE 1 — Monthly donations
// ---------------------------------------------------------------------------
const DONATION_VOLUME = { 1: [10, 18], 4: [6, 12], 5: [4, 8], 6: [4, 8] }
const FUND_WEIGHTS_NORMAL = [
  { item: 1, weight: 14 }, // ZM
  { item: 3, weight: 28 }, // INF
  { item: 4, weight: 22 }, // SDK
  { item: 5, weight: 7 }, // WKF
  { item: 6, weight: 8 }, // AMIL
  { item: 7, weight: 6 }, // PROG-KES
  { item: 9, weight: 5 }, // BENCANA
  { item: 8, weight: 6 }, // BEA
  { item: 10, weight: 4 }, // DAKWAH
]
const FUND_WEIGHTS_RAMADHAN = [
  { item: 1, weight: 34 },
  { item: 2, weight: 20 }, // ZF only meaningful near Ramadhan
  { item: 3, weight: 22 },
  { item: 4, weight: 10 },
  { item: 5, weight: 5 },
  { item: 6, weight: 4 },
  { item: 9, weight: 5 },
]
const CHANNELS = [
  { item: 'transfer', weight: 40 },
  { item: 'qris', weight: 18 },
  { item: 'cash', weight: 12 },
  { item: 'platform_online', weight: 15 },
  { item: 'gopay', weight: 6 },
  { item: 'dana', weight: 5 },
  { item: 'shopeepay', weight: 4 },
]
const TIER_RANGE = {
  regular: [50_000, 500_000],
  silver: [300_000, 2_000_000],
  gold: [1_000_000, 15_000_000],
  platinum: [5_000_000, 100_000_000],
}

function programForFund(fundId) {
  return programs.find((p) => p.fund_id === fundId && p.status !== 'closed') || programs.find((p) => p.fund_id === fundId)
}
function campaignForDonation(fundId, y, m) {
  const active = campaigns.filter((c) => c.fund_id === fundId)
  if (!active.length) return null
  const inRange = active.find((c) => {
    const s = new Date(c.start_date)
    const e = c.end_date ? new Date(c.end_date) : new Date(2030, 0, 1)
    const d = new Date(y, m - 1, 15)
    return d >= s && d <= e
  })
  return rng.bool(0.5) ? inRange?.id || null : null
}

function generateDonationsForMonth(y, m) {
  for (const nodeId of PRODUCING_NODE_IDS) {
    const [minN, maxN] = DONATION_VOLUME[nodeId]
    let count = rng.int(minN, maxN)
    if (isRamadhan(y, m)) count = Math.round(count * 1.7)
    const donorPool = contacts.filter((c) => c.contact_type === 'donor' && c.org_node_id === nodeId)
    if (!donorPool.length) continue

    for (let i = 0; i < count; i++) {
      const donor = rng.pick(donorPool)
      const fundId = rng.pickWeighted(isRamadhan(y, m) ? FUND_WEIGHTS_RAMADHAN : FUND_WEIGHTS_NORMAL)
      const fund = getFundById(fundId)
      const program = programForFund(fundId)
      const range = TIER_RANGE[donor.donor_tier] || TIER_RANGE.regular
      const amount = rng.round(rng.int(range[0], range[1]), 5000)
      const channel = donor.name.startsWith('Anonim Online') ? 'platform_online' : rng.pickWeighted(CHANNELS)
      const day = randomDayInMonth(y, m)
      const date = ymd(y, m, day)
      const isCurrentMonth = y === TODAY_Y && m === TODAY_M
      const statusRoll = rng.float()
      let status = 'posted'
      if (isCurrentMonth) {
        status = statusRoll < 0.62 ? 'posted' : statusRoll < 0.82 ? 'approved' : statusRoll < 0.94 ? 'submitted' : 'draft'
      }
      const isPosted = status === 'posted'
      const bankAccId = channel === 'cash' ? NODE_BANK[nodeId].kas : bankAccountFor(nodeId)
      const coaCash = coaIdForBankAccount(bankAccId)
      const revCoa = revenueCoaByFund[fundId]
      const campaignId = campaignForDonation(fundId, y, m)

      const registerId = nextId('register')
      registers.push({
        id: registerId,
        org_node_id: nodeId,
        register_no: regNo(nodeId, y, m),
        register_type: 'donasi',
        status,
        total_amount: amount,
        cost_center_id: 3,
        fund_id: fundId,
        program_id: program?.id || null,
        contact_id: donor.id,
        bank_account_id: bankAccId,
        description: `Penerimaan ${fund.fund_name} — ${donor.name}`,
        txn_date: date,
        created_by: amilUserFor(nodeId),
        submitted_at: `${date}T09:00:00+07:00`,
        approved_by: isPosted || status === 'approved' ? adminOrgFor(nodeId) : null,
        approved_at: isPosted || status === 'approved' ? `${date}T10:00:00+07:00` : null,
        posted_by: isPosted ? financeUserFor(nodeId) : null,
        posted_at: isPosted ? `${date}T11:00:00+07:00` : null,
        is_locked: isPosted && !isCurrentMonth,
      })

      let journalId = null
      if (isPosted) {
        journalId = writeJournal({
          nodeId,
          registerId,
          date,
          y,
          m,
          description: `Penerimaan ${fund.fund_name} — ${donor.name}`,
          journalType: 'penerimaan',
          createdBy: amilUserFor(nodeId),
          postedBy: financeUserFor(nodeId),
          lines: [
            { coa_id: coaCash, debit: amount, credit: 0, narration: `Penerimaan via ${channel}`, fund_id: null },
            { coa_id: revCoa, debit: 0, credit: amount, narration: `${fund.fund_name} — ${donor.name}`, fund_id: fundId, program_id: program?.id, cost_center_id: 3 },
          ],
        })
      }

      const donationId = nextId('donation')
      donations.push({
        id: donationId,
        org_node_id: nodeId,
        register_id: registerId,
        donor_id: donor.id,
        campaign_id: campaignId,
        fund_id: fundId,
        program_id: program?.id || null,
        donation_date: date,
        amount,
        channel,
        payment_ref: `${channel.toUpperCase()}-${y}${pad(m)}${pad(day)}-${pad(i + 1, 3)}`,
        bank_account_id: bankAccId,
        receipt_no: isPosted ? `RCP/${y}/${pad(m)}/${pad(donationId, 4)}` : null,
        receipt_sent_at: isPosted ? `${date}T12:00:00+07:00` : null,
        is_anonymous: donor.name.startsWith('Anonim'),
        journal_id: journalId,
        status,
        created_by: amilUserFor(nodeId),
      })
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 2 — Monthly Hak Amil reallocation (non-cash, fund-balance only)
// ---------------------------------------------------------------------------
function generateHakAmilRealloc(y, m) {
  const sourceFundIds = [1, 2, 3, 4, 5]
  const monthDonationsByFund = new Map()
  for (const d of donations) {
    if (d.status !== 'posted') continue
    const [dy, dm] = d.donation_date.split('-').map(Number)
    if (dy === y && dm === m && sourceFundIds.includes(d.fund_id)) {
      monthDonationsByFund.set(d.fund_id, (monthDonationsByFund.get(d.fund_id) || 0) + d.amount)
    }
  }
  const lines = []
  let total = 0
  for (const fundId of sourceFundIds) {
    const collected = monthDonationsByFund.get(fundId) || 0
    if (collected <= 0) continue
    const skim = Math.round((collected * 0.11) / 1000) * 1000
    if (skim <= 0) continue
    const fund = getFundById(fundId)
    lines.push({
      coa_id: fundBalanceCoaByType[fund.fund_type],
      debit: skim,
      credit: 0,
      narration: `Alokasi hak amil dari ${fund.fund_name}`,
      fund_id: fundId,
    })
    total += skim
  }
  if (!lines.length) return
  lines.push({ coa_id: 30, debit: 0, credit: total, narration: 'Alokasi hak amil ke Dana Operasional Amil', fund_id: 6 })
  const date = ymd(y, m, daysInMonth(y, m))
  writeJournal({
    nodeId: 1,
    registerId: null,
    date,
    y,
    m,
    description: `Alokasi Hak Amil ${pad(m)}/${y} (5% dari total penerimaan zakat & infaq)`,
    journalType: 'penyesuaian',
    createdBy: 2,
    postedBy: 1,
    lines,
    isLocked: !(y === TODAY_Y && m === TODAY_M),
  })
}

// ---------------------------------------------------------------------------
// PHASE 3 — Monthly distributions
// ---------------------------------------------------------------------------
const DIST_PROGRAMS = [1, 2, 3, 4, 5, 6, 7, 8] // program ids eligible for monthly distribution
const DIST_VOLUME = { 1: [4, 8], 4: [2, 5], 5: [1, 4], 6: [1, 4] }

function generateDistributionsForMonth(y, m) {
  for (const nodeId of PRODUCING_NODE_IDS) {
    const [minN, maxN] = DIST_VOLUME[nodeId]
    let count = rng.int(minN, maxN)
    const localMustahiq = contacts.filter((c) => c.contact_type === 'mustahiq' && (c.org_node_id === nodeId || c.org_node_id === 1))
    if (!localMustahiq.length) continue

    for (let i = 0; i < count; i++) {
      const program = programs.find((p) => p.id === rng.pick(DIST_PROGRAMS))
      if (!program) continue
      // Skip ZF program outside its active window
      if (program.program_code === 'ZF-1447H' && !(y === 2026 && (m === 2 || m === 3))) continue
      if (program.program_code === 'BENCANA-2026' && new Date(y, m - 1, 1) < new Date(2026, 1, 1)) continue

      const fund = getFundById(program.fund_id)
      const available = fundAvailable(fund.id)
      if (available < 200_000) continue

      const baseAmt = rng.round(rng.int(300_000, 6_000_000), 10000)
      const amount = Math.min(baseAmt, Math.floor(available * 0.85))
      if (amount < 100_000) continue

      const recipient = rng.pick(localMustahiq)
      const asnaf = recipient.asnaf_category || 'miskin'
      const distType = rng.pickWeighted([
        { item: 'transfer', weight: 55 },
        { item: 'cash', weight: 25 },
        { item: 'natura', weight: 15 },
        { item: 'voucher', weight: 5 },
      ])
      const day = randomDayInMonth(y, m)
      const date = ymd(y, m, day)
      const isCurrentMonth = y === TODAY_Y && m === TODAY_M
      const statusRoll = rng.float()
      let status = 'posted'
      if (isCurrentMonth) {
        status = statusRoll < 0.55 ? 'posted' : statusRoll < 0.78 ? 'approved' : statusRoll < 0.93 ? 'submitted' : 'draft'
      }
      const isPosted = status === 'posted'
      const bankAccId = distType === 'cash' ? NODE_BANK[nodeId].kas : bankAccountFor(nodeId)
      const coaCash = coaIdForBankAccount(bankAccId)
      const expCoa = expenseCoaFor(program, asnaf)

      const registerId = nextId('register')
      registers.push({
        id: registerId,
        org_node_id: nodeId,
        register_no: regNo(nodeId, y, m),
        register_type: 'distribusi',
        status,
        total_amount: amount,
        cost_center_id: program.cost_center_id,
        fund_id: fund.id,
        program_id: program.id,
        contact_id: recipient.id,
        bank_account_id: bankAccId,
        description: `Distribusi ${program.program_name} — ${recipient.name}`,
        txn_date: date,
        created_by: amilUserFor(nodeId),
        submitted_at: `${date}T09:00:00+07:00`,
        approved_by: isPosted || status === 'approved' ? managerUserId() : null,
        approved_at: isPosted || status === 'approved' ? `${date}T13:00:00+07:00` : null,
        posted_by: isPosted ? financeUserFor(nodeId) : null,
        posted_at: isPosted ? `${date}T14:00:00+07:00` : null,
        is_locked: isPosted && !isCurrentMonth,
      })

      let journalId = null
      if (isPosted) {
        journalId = writeJournal({
          nodeId,
          registerId,
          date,
          y,
          m,
          description: `Distribusi ${program.program_name} — ${recipient.name}`,
          journalType: 'pengeluaran',
          createdBy: amilUserFor(nodeId),
          postedBy: financeUserFor(nodeId),
          lines: [
            { coa_id: expCoa, debit: amount, credit: 0, narration: `Penyaluran kepada ${recipient.name}`, fund_id: fund.id, program_id: program.id, cost_center_id: program.cost_center_id },
            { coa_id: coaCash, debit: 0, credit: amount, narration: `Pembayaran via ${distType}`, fund_id: null },
          ],
        })
      }

      const distributionId = nextId('distribution')
      distributions.push({
        id: distributionId,
        org_node_id: nodeId,
        register_id: registerId,
        program_id: program.id,
        fund_id: fund.id,
        recipient_id: recipient.id,
        dist_date: date,
        amount,
        dist_type: distType,
        asnaf_category: asnaf,
        bank_account_id: bankAccId,
        payment_ref: distType === 'transfer' ? `TF-${y}${pad(m)}${pad(day)}-${pad(distributionId, 3)}` : null,
        sk_no: `SK/DIST/${y}/${pad(m)}/${pad(distributionId, 3)}`,
        berita_acara_url: isPosted ? `/docs/ba-${distributionId}.pdf` : null,
        natura_desc: distType === 'natura' ? rng.pick(['Sembako 1 paket', 'Kursi roda', 'Alat tulis sekolah', 'Selimut & pakaian layak pakai', 'Paket gizi balita']) : null,
        natura_value: distType === 'natura' ? amount : null,
        notes: null,
        journal_id: journalId,
        status,
        created_by: amilUserFor(nodeId),
      })
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 4 — Monthly operational expenses (Gaji, Operasional, Listrik, dst.)
// ---------------------------------------------------------------------------
const OPEX_TEMPLATE = {
  1: [
    { coa: 520, cc: 6, label: 'Gaji & Tunjangan Amil Pusat', range: [13_000_000, 16_000_000], monthly: true },
    { coa: 521, cc: 2, label: 'Biaya Operasional Kantor Pusat', range: [2_200_000, 3_800_000], monthly: true },
    { coa: 522, cc: 2, label: 'Listrik, Air & Internet Kantor Pusat', range: [1_000_000, 1_800_000], monthly: true },
    { coa: 523, cc: 4, label: 'Transportasi & Sosialisasi Program', range: [900_000, 2_600_000], monthly: true },
    { coa: 525, cc: 3, label: 'Cetak & Publikasi Materi Kampanye', range: [300_000, 1_500_000], monthly: false },
  ],
  4: [
    { coa: 520, cc: 6, label: 'Gaji & Tunjangan Amil Daerah Bandung', range: [4_500_000, 5_800_000], monthly: true },
    { coa: 521, cc: 2, label: 'Biaya Operasional Kantor Daerah Bandung', range: [800_000, 1_400_000], monthly: true },
    { coa: 522, cc: 2, label: 'Listrik, Air & Internet Daerah Bandung', range: [350_000, 650_000], monthly: true },
    { coa: 523, cc: 4, label: 'Transportasi Amil Daerah Bandung', range: [300_000, 1_000_000], monthly: false },
  ],
  5: [
    { coa: 520, cc: 6, label: 'Gaji & Tunjangan Amil Daerah Garut', range: [3_000_000, 3_800_000], monthly: true },
    { coa: 521, cc: 2, label: 'Biaya Operasional Kantor Daerah Garut', range: [500_000, 900_000], monthly: true },
    { coa: 522, cc: 2, label: 'Listrik, Air & Internet Daerah Garut', range: [200_000, 400_000], monthly: true },
    { coa: 523, cc: 4, label: 'Transportasi Amil Daerah Garut', range: [200_000, 700_000], monthly: false },
  ],
  6: [
    { coa: 520, cc: 6, label: 'Gaji & Tunjangan Amil Daerah Semarang', range: [3_100_000, 3_900_000], monthly: true },
    { coa: 521, cc: 2, label: 'Biaya Operasional Kantor Daerah Semarang', range: [500_000, 950_000], monthly: true },
    { coa: 522, cc: 2, label: 'Listrik, Air & Internet Daerah Semarang', range: [200_000, 420_000], monthly: true },
    { coa: 523, cc: 4, label: 'Transportasi Amil Daerah Semarang', range: [200_000, 700_000], monthly: false },
  ],
}

function generateOpexForMonth(y, m) {
  const isCurrentMonth = y === TODAY_Y && m === TODAY_M
  for (const nodeId of PRODUCING_NODE_IDS) {
    for (const tpl of OPEX_TEMPLATE[nodeId]) {
      if (!tpl.monthly && !rng.bool(0.55)) continue
      const available = fundAvailable(6)
      if (available < 500_000) continue
      let amount = rng.round(rng.int(tpl.range[0], tpl.range[1]), 5000)
      amount = Math.min(amount, Math.floor(available * 0.92))
      if (amount < 100_000) continue

      const day = tpl.coa === 520 ? Math.min(25, daysInMonth(y, m)) : randomDayInMonth(y, m)
      const finalDay = isCurrentMonth ? Math.min(day, TODAY_D) : day
      const date = ymd(y, m, finalDay)
      const status = isCurrentMonth && rng.bool(0.15) ? 'submitted' : 'posted'
      const isPosted = status === 'posted'
      const bankAccId = bankAccountFor(nodeId, false)
      const coaCash = coaIdForBankAccount(bankAccId)

      const registerId = nextId('register')
      registers.push({
        id: registerId,
        org_node_id: nodeId,
        register_no: regNo(nodeId, y, m),
        register_type: 'pengeluaran',
        status,
        total_amount: amount,
        cost_center_id: tpl.cc,
        fund_id: 6,
        program_id: null,
        contact_id: null,
        bank_account_id: bankAccId,
        description: tpl.label,
        txn_date: date,
        created_by: financeUserFor(nodeId),
        submitted_at: `${date}T09:00:00+07:00`,
        approved_by: isPosted ? managerUserId() : null,
        approved_at: isPosted ? `${date}T10:30:00+07:00` : null,
        posted_by: isPosted ? financeUserFor(nodeId) : null,
        posted_at: isPosted ? `${date}T11:00:00+07:00` : null,
        is_locked: isPosted && !isCurrentMonth,
      })

      if (isPosted) {
        writeJournal({
          nodeId,
          registerId,
          date,
          y,
          m,
          description: tpl.label,
          journalType: 'pengeluaran',
          createdBy: financeUserFor(nodeId),
          postedBy: financeUserFor(nodeId),
          lines: [
            { coa_id: tpl.coa, debit: amount, credit: 0, narration: tpl.label, fund_id: 6, cost_center_id: tpl.cc },
            { coa_id: coaCash, debit: 0, credit: amount, narration: 'Pembayaran operasional', fund_id: null },
          ],
        })
      }
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 5 — Cash Advances
// ---------------------------------------------------------------------------
const CA_PURPOSES = [
  'Operasional Event Sosialisasi ZIS',
  'Perjalanan Dinas Survey Mustahiq',
  'Kegiatan Edukasi Zakat di Sekolah',
  'Operasional Pembagian Paket Sembako',
  'Perlengkapan Kegiatan Santunan',
  'Biaya Koordinasi dengan Mitra Program',
]
const CA_ITEM_DESC = [
  { label: 'Sewa tempat kegiatan', coa: 521 },
  { label: 'Konsumsi peserta / panitia', coa: 521 },
  { label: 'Bahan presentasi & ATK', coa: 525 },
  { label: 'Transportasi panitia', coa: 523 },
  { label: 'Dokumentasi kegiatan', coa: 525 },
]

function generateCashAdvancesForMonth(y, m) {
  const isCurrentMonth = y === TODAY_Y && m === TODAY_M
  for (const nodeId of PRODUCING_NODE_IDS) {
    const count = rng.int(1, 3)
    for (let i = 0; i < count; i++) {
      const requester = rng.pick(users.filter((u) => u.org_node_id === nodeId))
      const amountReq = rng.round(rng.int(500_000, 5_000_000), 50000)
      const needDay = randomDayInMonth(y, m)
      const needDate = ymd(y, m, needDay)

      let status, amountDisbursed, amountRealized, amountReturned
      const monthsAgo = (TODAY_Y - y) * 12 + (TODAY_M - m)
      if (monthsAgo >= 2) {
        status = 'settled'
        amountDisbursed = amountReq
        amountRealized = rng.round(Math.round(amountReq * rng.int(85, 100) / 100), 10000)
        amountReturned = Math.max(0, amountDisbursed - amountRealized)
      } else if (monthsAgo === 1) {
        const roll = rng.float()
        status = roll < 0.7 ? 'settled' : roll < 0.9 ? 'ljp_submitted' : 'disbursed'
        amountDisbursed = amountReq
        amountRealized = status === 'settled' ? rng.round(Math.round(amountReq * rng.int(85, 100) / 100), 10000) : status === 'ljp_submitted' ? rng.round(Math.round(amountReq * 0.9), 10000) : 0
        amountReturned = status === 'settled' ? Math.max(0, amountDisbursed - amountRealized) : 0
      } else {
        const roll = rng.float()
        status = roll < 0.3 ? 'draft' : roll < 0.5 ? 'submitted' : roll < 0.7 ? 'approved' : roll < 0.9 ? 'disbursed' : 'ljp_submitted'
        amountDisbursed = ['disbursed', 'ljp_submitted'].includes(status) ? amountReq : 0
        amountRealized = status === 'ljp_submitted' ? rng.round(Math.round(amountReq * 0.88), 10000) : 0
        amountReturned = 0
      }
      if (amountRealized > 0) {
        const cap = Math.max(0, Math.floor(fundAvailable(6) * 0.9))
        const cappedRealized = Math.min(amountRealized, cap)
        amountReturned += Math.max(0, amountRealized - cappedRealized)
        amountRealized = cappedRealized
      }

      const registerId = nextId('register')
      const regDate = needDate
      registers.push({
        id: registerId,
        org_node_id: nodeId,
        register_no: regNo(nodeId, y, m),
        register_type: 'ca_pencairan',
        status: ['disbursed', 'ljp_submitted', 'settled'].includes(status) ? 'posted' : status === 'approved' ? 'approved' : status,
        total_amount: amountDisbursed || amountReq,
        cost_center_id: 2,
        fund_id: 6,
        program_id: null,
        contact_id: null,
        bank_account_id: bankAccountFor(nodeId, false),
        description: `Pencairan CA — ${requester.full_name}`,
        txn_date: regDate,
        created_by: requester.id,
        submitted_at: `${regDate}T09:00:00+07:00`,
        approved_by: status !== 'draft' && status !== 'submitted' ? managerUserId() : null,
        approved_at: status !== 'draft' && status !== 'submitted' ? `${regDate}T11:00:00+07:00` : null,
        posted_by: ['disbursed', 'ljp_submitted', 'settled'].includes(status) ? financeUserFor(nodeId) : null,
        posted_at: ['disbursed', 'ljp_submitted', 'settled'].includes(status) ? `${regDate}T14:00:00+07:00` : null,
        is_locked: false,
      })

      let disbJournalId = null
      if (['disbursed', 'ljp_submitted', 'settled'].includes(status)) {
        const bankAccId = bankAccountFor(nodeId, false)
        disbJournalId = writeJournal({
          nodeId,
          registerId,
          date: regDate,
          y,
          m,
          description: `Pencairan Cash Advance — ${requester.full_name}`,
          journalType: 'pengeluaran',
          createdBy: requester.id,
          postedBy: financeUserFor(nodeId),
          lines: [
            { coa_id: 1020, debit: amountDisbursed, credit: 0, narration: `Piutang CA — ${requester.full_name}`, fund_id: 6, cost_center_id: 2 },
            { coa_id: coaIdForBankAccount(bankAccId), debit: 0, credit: amountDisbursed, narration: 'Pencairan CA', fund_id: null },
          ],
        })
      }

      const caId = nextId('ca')
      let items = []
      if (['ljp_submitted', 'settled'].includes(status) && amountRealized > 0) {
        const nItems = Math.max(1, Math.min(4, Math.floor(amountRealized / 10000)))
        const shares = Array.from({ length: nItems }, () => rng.int(70, 130))
        const shareTotal = shares.reduce((s, v) => s + v, 0)
        let remaining = amountRealized
        shares.forEach((share, k) => {
          const isLast = k === nItems - 1
          const amt = isLast ? remaining : Math.min(remaining, Math.max(1000, Math.round((amountRealized * share) / shareTotal / 1000) * 1000))
          remaining -= amt
          const desc = rng.pick(CA_ITEM_DESC)
          items.push({ id: nextId('caItem'), ca_id: caId, coa_id: desc.coa, description: `${desc.label} — ${requester.full_name}`, amount: amt })
        })
        items = items.filter((it) => it.amount > 0)
        if (!items.length) {
          items.push({ id: nextId('caItem'), ca_id: caId, coa_id: rng.pick(CA_ITEM_DESC).coa, description: `Realisasi kegiatan — ${requester.full_name}`, amount: amountRealized })
        }
      }
      items.forEach((it) => caItems.push(it))

      let settleJournalId = null
      if (status === 'settled') {
        const settleLines = []
        // group ca_items by coa for cleaner journal
        const byCoa = new Map()
        for (const it of items) byCoa.set(it.coa_id, (byCoa.get(it.coa_id) || 0) + it.amount)
        for (const [coaId, amt] of byCoa) {
          settleLines.push({ coa_id: coaId, debit: amt, credit: 0, narration: 'Realisasi LPJ Cash Advance', fund_id: 6, cost_center_id: 2 })
        }
        if (amountRealized > 0) {
          settleLines.push({ coa_id: 1020, debit: 0, credit: amountRealized, narration: 'Pelunasan Piutang CA (realisasi)', fund_id: 6, cost_center_id: 2 })
        }
        const cleanLines = settleLines
        if (amountReturned > 0) {
          const kasCoa = coaIdForBankAccount(NODE_BANK[nodeId].kas)
          cleanLines.push({ coa_id: kasCoa, debit: amountReturned, credit: 0, narration: 'Pengembalian sisa CA ke kas', fund_id: null })
          cleanLines.push({ coa_id: 1020, debit: 0, credit: amountReturned, narration: 'Pelunasan Piutang CA (sisa dikembalikan)', fund_id: 6, cost_center_id: 2 })
        }
        const settleDate = ymd(y, m, Math.min(needDay + rng.int(5, 15), daysInMonth(y, m)))
        settleJournalId = writeJournal({
          nodeId,
          registerId,
          date: settleDate,
          y,
          m,
          description: `Realisasi LPJ Cash Advance — ${requester.full_name}`,
          journalType: 'pengeluaran',
          createdBy: requester.id,
          postedBy: financeUserFor(nodeId),
          lines: cleanLines,
        })
      }

      cashAdvances.push({
        id: caId,
        org_node_id: nodeId,
        register_id: registerId,
        requested_by: requester.id,
        cost_center_id: 2,
        fund_id: 6,
        program_id: null,
        ca_no: caNo(nodeId, y, m),
        purpose: rng.pick(CA_PURPOSES),
        amount_requested: amountReq,
        amount_disbursed: amountDisbursed,
        amount_realized: amountRealized,
        amount_returned: amountReturned,
        status,
        need_date: needDate,
        disbursed_at: amountDisbursed ? `${needDate}T14:00:00+07:00` : null,
        ljp_submitted_at: ['ljp_submitted', 'settled'].includes(status) ? ymd(y, m, Math.min(needDay + rng.int(3, 10), daysInMonth(y, m))) : null,
        settled_at: status === 'settled' ? ymd(y, m, Math.min(needDay + rng.int(5, 15), daysInMonth(y, m))) : null,
        disb_journal_id: disbJournalId,
        settle_journal_id: settleJournalId,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 6 — Assets & Depreciation
// ---------------------------------------------------------------------------
const WINDOW_START_Y = 2025
const WINDOW_START_M = 1

// 6a. Pure depreciation schedule (monthly straight-line, from purchase to today).
// Rows before the simulation window are kept for book-value/master-data purposes
// but are NOT posted as journals — they are folded into the opening balance instead.
function generateAssetDepreciationData() {
  for (const asset of assetsSeed) {
    if (asset.depr_method === 'NONE') continue
    const [py, pm] = asset.purchase_date.split('-').map(Number)
    let bookValue = asset.purchase_value
    const monthlyDepr = Math.round(((asset.purchase_value - asset.salvage_value) / asset.useful_life_months) / 100) * 100
    let y = py,
      m = pm
    m++ // depreciation starts the month after purchase
    if (m > 12) { m = 1; y++ }
    let monthsElapsed = 0
    const disposedAt = asset.disposed_date ? asset.disposed_date.split('-').map(Number) : null

    while ((y < TODAY_Y || (y === TODAY_Y && m <= TODAY_M)) && monthsElapsed < asset.useful_life_months) {
      if (disposedAt && (y > disposedAt[0] || (y === disposedAt[0] && m > disposedAt[1]))) break
      bookValue = Math.max(asset.salvage_value, bookValue - monthlyDepr)
      assetDepreciations.push({
        id: nextId('depr'),
        asset_id: asset.id,
        period_year: y,
        period_month: m,
        depr_amount: monthlyDepr,
        book_value_after: bookValue,
      })
      monthsElapsed++
      m++
      if (m > 12) { m = 1; y++ }
    }
  }
}

function accumDeprAsOf(assetId, y, m) {
  const k = periodKeyLocal(y, m)
  return assetDepreciations
    .filter((d) => d.asset_id === assetId && periodKeyLocal(d.period_year, d.period_month) <= k)
    .reduce((s, d) => s + d.depr_amount, 0)
}
function periodKeyLocal(y, m) {
  return y * 100 + m
}

// 6b. Opening balance journal per producing node, dated the day before the window
// starts — folds in pre-window cash balances and pre-window fixed-asset position
// so the balance sheet identity (Aset = Kewajiban + Saldo Dana) holds from day one.
function generateOpeningBalances() {
  const openingDate = '2024-12-31'
  for (const nodeId of PRODUCING_NODE_IDS) {
    const lines = []
    let totalDebit = 0
    const nodeBankAccounts = bankAccountsSeed.filter((b) => b.org_node_id === nodeId)
    for (const acc of nodeBankAccounts) {
      if (acc.opening_balance > 0) {
        lines.push({ coa_id: acc.coa_id, debit: acc.opening_balance, credit: 0, narration: `Saldo awal ${acc.account_name}`, fund_id: null })
        totalDebit += acc.opening_balance
      }
    }
    const preWindowAssets = assetsSeed.filter((a) => a.org_node_id === nodeId && new Date(a.purchase_date) < new Date(2025, 0, 1))
    let grossPre = 0
    let accumPre = 0
    for (const asset of preWindowAssets) {
      grossPre += asset.purchase_value
      accumPre += asset.depr_method === 'NONE' ? 0 : accumDeprAsOf(asset.id, WINDOW_START_Y - 1, 12)
    }
    if (grossPre > 0) {
      lines.push({ coa_id: 110, debit: grossPre, credit: 0, narration: 'Saldo awal aset tetap (perolehan sebelum periode simulasi)', fund_id: null })
      totalDebit += grossPre
    }
    let totalCredit = 0
    if (accumPre > 0) {
      lines.push({ coa_id: 111, debit: 0, credit: accumPre, narration: 'Saldo awal akumulasi penyusutan', fund_id: null })
      totalCredit += accumPre
    }
    const plug = totalDebit - totalCredit
    if (plug > 0) {
      lines.push({ coa_id: 30, debit: 0, credit: plug, narration: 'Saldo dana awal (ekuitas kumulatif sebelum periode simulasi OmniFin)', fund_id: 6 })
      totalCredit += plug
    }
    if (!lines.length) continue
    writeJournal({
      nodeId,
      registerId: null,
      date: openingDate,
      y: WINDOW_START_Y - 1,
      m: 12,
      description: `Saldo Awal Migrasi ke OmniFin — ${orgNodes.find((n) => n.id === nodeId).name}`,
      journalType: 'umum',
      createdBy: 1,
      postedBy: 1,
      lines,
      isLocked: true,
    })
  }
}

// 6c. Acquisitions that happen inside the simulation window get their own journal.
function generateAssetAcquisitionsInWindow() {
  for (const asset of assetsSeed) {
    const purchaseDate = new Date(asset.purchase_date)
    if (purchaseDate < new Date(WINDOW_START_Y, WINDOW_START_M - 1, 1)) continue
    const [y, m, d] = asset.purchase_date.split('-').map(Number)
    const bankAccId = bankAccountFor(asset.org_node_id, false)
    writeJournal({
      nodeId: asset.org_node_id,
      registerId: null,
      date: asset.purchase_date,
      y,
      m,
      description: `Pembelian Aset Tetap — ${asset.asset_name}`,
      journalType: 'umum',
      createdBy: financeUserFor(asset.org_node_id),
      postedBy: financeUserFor(asset.org_node_id),
      lines: [
        { coa_id: 110, debit: asset.purchase_value, credit: 0, narration: `Perolehan ${asset.asset_name}`, fund_id: null, cost_center_id: asset.cost_center_id },
        { coa_id: coaIdForBankAccount(bankAccId), debit: 0, credit: asset.purchase_value, narration: 'Pembayaran pembelian aset', fund_id: null },
      ],
      isLocked: y < TODAY_Y || (y === TODAY_Y && m < TODAY_M),
    })
  }
}

// 6d. Disposals that happen inside the simulation window (write-off / gain-loss).
function generateAssetDisposalsInWindow() {
  for (const asset of assetsSeed) {
    if (asset.status !== 'disposed' || !asset.disposed_date) continue
    const disposedDate = new Date(asset.disposed_date)
    if (disposedDate < new Date(WINDOW_START_Y, WINDOW_START_M - 1, 1)) continue
    const [y, m] = asset.disposed_date.split('-').map(Number)
    const accumAtDisposal = asset.depr_method === 'NONE' ? 0 : accumDeprAsOf(asset.id, y, m)
    const bookValueAtDisposal = Math.max(0, asset.purchase_value - accumAtDisposal)
    const lines = [{ coa_id: 111, debit: accumAtDisposal, credit: 0, narration: `Hapus akumulasi penyusutan — ${asset.asset_name}`, fund_id: null }]
    if (bookValueAtDisposal > 0) {
      lines.push({ coa_id: 526, debit: bookValueAtDisposal, credit: 0, narration: `Kerugian pelepasan — ${asset.asset_name} (${asset.disposal_note || 'dihapusbukukan'})`, fund_id: 6, cost_center_id: asset.cost_center_id })
    }
    lines.push({ coa_id: 110, debit: 0, credit: asset.purchase_value, narration: `Penghapusan aset — ${asset.asset_name}`, fund_id: null })
    writeJournal({
      nodeId: asset.org_node_id,
      registerId: null,
      date: asset.disposed_date,
      y,
      m,
      description: `Pelepasan Aset Tetap — ${asset.asset_name}`,
      journalType: 'penyesuaian',
      createdBy: financeUserFor(asset.org_node_id),
      postedBy: financeUserFor(asset.org_node_id),
      lines,
      isLocked: y < TODAY_Y || (y === TODAY_Y && m < TODAY_M),
    })
  }
}

// 6e. Monthly aggregate depreciation journal per node — window periods only.
function generateAssetDepreciationJournals() {
  for (const { year: y, month: m } of monthRange()) {
    const nodeAmounts = new Map()
    for (const asset of assetsSeed) {
      const row = assetDepreciations.find((d) => d.asset_id === asset.id && d.period_year === y && d.period_month === m)
      if (row) nodeAmounts.set(asset.org_node_id, (nodeAmounts.get(asset.org_node_id) || 0) + row.depr_amount)
    }
    for (const [nodeId, amt] of nodeAmounts) {
      if (amt <= 0) continue
      const date = ymd(y, m, daysInMonth(y, m))
      const isCurrentMonth = y === TODAY_Y && m === TODAY_M
      writeJournal({
        nodeId,
        registerId: null,
        date,
        y,
        m,
        description: `Jurnal Penyusutan Aset Tetap ${pad(m)}/${y}`,
        journalType: 'penyesuaian',
        createdBy: financeUserFor(nodeId),
        postedBy: financeUserFor(nodeId),
        lines: [
          { coa_id: 524, debit: amt, credit: 0, narration: 'Beban penyusutan bulanan', fund_id: 6, cost_center_id: 5 },
          { coa_id: 111, debit: 0, credit: amt, narration: 'Akumulasi penyusutan aset tetap', fund_id: null },
        ],
        isLocked: !isCurrentMonth,
      })
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 7 — Bank statements & reconciliation (last 3 months only)
// ---------------------------------------------------------------------------
function generateBankStatements() {
  const recentMonths = monthRange().slice(-3)
  const cashCoaIds = new Set(bankAccountsSeed.filter((b) => b.account_type !== 'kas').map((b) => b.coa_id))

  for (const { year: y, month: m } of recentMonths) {
    const relevantJournals = journals.filter((j) => j.period_year === y && j.period_month === m && j.is_posted)
    for (const j of relevantJournals) {
      const cashLines = journalItems.filter((ji) => ji.journal_id === j.id && cashCoaIds.has(ji.coa_id))
      for (const line of cashLines) {
        if (!rng.bool(0.93)) continue // ~7% lag not yet imported
        const bankAcc = bankAccountsSeed.find((b) => b.coa_id === line.coa_id)
        if (!bankAcc) continue
        const amount = line.debit > 0 ? line.debit : -line.credit
        const isMatched = rng.bool(0.9)
        const bsId = nextId('bs')
        bankStatements.push({
          id: bsId,
          bank_account_id: bankAcc.id,
          org_node_id: j.org_node_id,
          txn_date: j.journal_date,
          amount,
          description: (j.description || '').toUpperCase().slice(0, 80),
          source_ref: `${bankAcc.bank_name.replace(/\s/g, '').toUpperCase().slice(0, 4)}-${j.journal_date.replaceAll('-', '')}-${pad(bsId, 3)}`,
          balance_after: null,
          import_batch_id: `IMP-${y}${pad(m)}-${bankAcc.id}`,
          status: isMatched ? 'matched' : 'unmatched',
        })
        if (isMatched) {
          reconMatches.push({
            id: nextId('recon'),
            bank_statement_id: bsId,
            journal_item_id: line.id,
            match_type: rng.bool(0.75) ? 'auto' : 'manual',
            confidence_pct: rng.int(88, 99),
            matched_by: rng.bool(0.75) ? null : 2,
            matched_at: `${j.journal_date}T${pad(rng.int(8, 17))}:00:00+07:00`,
          })
        }
      }
    }
  }

  // Inject a handful of genuine "unmatched" anomalies for the reconciliation demo
  const anomalies = [
    { bankAccId: 3, y: 2026, m: 7, day: 28, amount: 5_000_000, desc: 'TRF ANONIM SEDEKAH TANPA KETERANGAN' },
    { bankAccId: 1, y: 2026, m: 8, day: 3, amount: 1_250_000, desc: 'TRF QRIS MERCHANT ZAKAT ONLINE' },
    { bankAccId: 5, y: 2026, m: 8, day: 5, amount: 750_000, desc: 'TRF DANA MASUK BELUM TERIDENTIFIKASI' },
    { bankAccId: 3, y: 2026, m: 8, day: 6, amount: -150_000, desc: 'BIAYA ADMIN BANK BULANAN' },
  ]
  for (const a of anomalies) {
    const bankAcc = bankAccountsSeed.find((b) => b.id === a.bankAccId)
    bankStatements.push({
      id: nextId('bs'),
      bank_account_id: a.bankAccId,
      org_node_id: bankAcc.org_node_id,
      txn_date: ymd(a.y, a.m, a.day),
      amount: a.amount,
      description: a.desc,
      source_ref: `${bankAcc.bank_name.replace(/\s/g, '').toUpperCase().slice(0, 4)}-${a.y}${pad(a.m)}${pad(a.day)}-ANM`,
      balance_after: null,
      import_batch_id: `IMP-${a.y}${pad(a.m)}-${a.bankAccId}`,
      status: a.desc.includes('ADMIN') ? 'excluded' : 'unmatched',
    })
  }
}

// ---------------------------------------------------------------------------
// PHASE 8 — Closing periods & cutoff override
// ---------------------------------------------------------------------------
const closingPeriods = []
const closingOverrideLog = []

function generateClosingPeriods() {
  for (const node of orgNodes) {
    for (const { year: y, month: m } of monthRange()) {
      const id = nextId('closingPeriod')
      const isBeforeJuly2026 = y < 2026 || (y === 2026 && m <= 6)
      const status = isBeforeJuly2026 ? 'closed' : 'open'
      const closeY = m === 12 ? y + 1 : y
      const closeM = m === 12 ? 1 : m + 1
      closingPeriods.push({
        id,
        org_node_id: node.id,
        period_year: y,
        period_month: m,
        status,
        closed_by: status === 'closed' ? financeUserFor(PRODUCING_NODE_IDS.includes(node.id) ? node.id : 1) : null,
        closed_at: status === 'closed' ? `${ymd(closeY, closeM, Math.min(3, daysInMonth(closeY, closeM)))}T16:00:00+07:00` : null,
      })
    }
  }
  closingOverrideLog.push({
    id: 1,
    org_node_id: 1,
    period_year: 2026,
    period_month: 7,
    requested_by: 2,
    requested_at: '2026-08-06T10:15:00+07:00',
    approved_by: null,
    approved_at: null,
    status: 'pending',
    reason: 'Menunggu rekap final donasi platform online (Kitabisa & Tokopedia Salam) yang baru masuk awal Agustus.',
    rejection_note: null,
  })
  closingOverrideLog.push({
    id: 2,
    org_node_id: 4,
    period_year: 2026,
    period_month: 2,
    requested_by: 5,
    requested_at: '2026-03-04T09:00:00+07:00',
    approved_by: 1,
    approved_at: '2026-03-04T15:30:00+07:00',
    status: 'approved',
    reason: 'Volume donasi Ramadhan tinggi, rekap manual donasi tunai perlu waktu tambahan.',
    rejection_note: null,
  })
}

// ---------------------------------------------------------------------------
// PHASE 9 — Internode transfers (Pusat -> Daerah operational support)
// ---------------------------------------------------------------------------
function generateInternodeTransfers() {
  const quarters = [
    { y: 2025, m: 3 }, { y: 2025, m: 6 }, { y: 2025, m: 9 }, { y: 2025, m: 12 },
    { y: 2026, m: 3 }, { y: 2026, m: 6 },
  ]
  for (const q of quarters) {
    for (const toNode of [4, 5, 6]) {
      const amount = rng.round(rng.int(8_000_000, 18_000_000), 100000)
      const day = Math.min(10, daysInMonth(q.y, q.m))
      const date = ymd(q.y, q.m, day)
      const fromJournalId = writeJournal({
        nodeId: 1,
        registerId: null,
        date,
        y: q.y,
        m: q.m,
        description: `Transfer dukungan operasional ke ${orgNodes.find((n) => n.id === toNode).name}`,
        journalType: 'internode',
        createdBy: 2,
        postedBy: 1,
        lines: [
          { coa_id: 201, debit: amount, credit: 0, narration: 'Transfer antar node (kliring)', fund_id: null },
          { coa_id: coaIdForBankAccount(bankAccountFor(1, false)), debit: 0, credit: amount, narration: 'Transfer keluar ke Daerah', fund_id: null },
        ],
        isLocked: true,
      })
      const toJournalId = writeJournal({
        nodeId: toNode,
        registerId: null,
        date,
        y: q.y,
        m: q.m,
        description: 'Penerimaan dukungan operasional dari Pusat',
        journalType: 'internode',
        createdBy: financeUserFor(toNode),
        postedBy: financeUserFor(toNode),
        lines: [
          { coa_id: coaIdForBankAccount(bankAccountFor(toNode, false)), debit: amount, credit: 0, narration: 'Transfer masuk dari Pusat', fund_id: null },
          { coa_id: 201, debit: 0, credit: amount, narration: 'Transfer antar node (kliring)', fund_id: null },
        ],
        isLocked: true,
      })
      internodeTransfers.push({
        id: nextId('internode'),
        from_node_id: 1,
        to_node_id: toNode,
        from_journal_id: fromJournalId,
        to_journal_id: toJournalId,
        amount,
        transfer_date: date,
        elimination_flag: true,
        notes: 'Dukungan operasional rutin kuartalan',
      })
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 9b — Approval flows (multi-level approval history, per Section 12
// workflow: Level 1 Manager, +Level 2 Director/Ketua when amount > threshold)
// ---------------------------------------------------------------------------
const approvalFlows = []
const LEVEL2_THRESHOLD = 10_000_000
const APPROVAL_NOTES = [
  'Disetujui, sesuai anggaran.',
  'OK, lanjutkan.',
  'Sudah sesuai program, disetujui.',
  'Setuju — mohon lampirkan bukti pendukung saat LPJ.',
  null,
  null,
]

function generateApprovalFlows() {
  const approvableTypes = ['donasi', 'distribusi', 'pengeluaran', 'ca_pencairan']
  const eligible = registers.filter((r) => approvableTypes.includes(r.register_type) && r.submitted_at)

  for (const r of eligible) {
    const level1Approver = r.register_type === 'donasi' ? adminOrgFor(r.org_node_id) : managerUserId()
    const reachedLevel1 = ['approved', 'posted'].includes(r.status)
    approvalFlows.push({
      id: nextId('approvalFlow'),
      register_id: r.id,
      approver_id: level1Approver,
      approval_level: 1,
      status: reachedLevel1 ? 'approved' : r.status === 'submitted' ? 'pending' : 'pending',
      notes: reachedLevel1 && rng.bool(0.35) ? rng.pick(APPROVAL_NOTES) : null,
      responded_at: reachedLevel1 ? r.approved_at : null,
      created_at: r.submitted_at,
    })

    if (r.total_amount > LEVEL2_THRESHOLD) {
      const level2Status = r.status === 'posted' ? 'approved' : reachedLevel1 ? 'pending' : null
      if (level2Status) {
        approvalFlows.push({
          id: nextId('approvalFlow'),
          register_id: r.id,
          approver_id: 1,
          approval_level: 2,
          status: level2Status,
          notes: level2Status === 'approved' && rng.bool(0.35) ? rng.pick(APPROVAL_NOTES) : null,
          responded_at: level2Status === 'approved' ? r.posted_at : null,
          created_at: r.approved_at || r.submitted_at,
        })
      }
    }
  }

  // A handful of illustrative rejections — drafts currently awaiting revision
  // after a prior rejection (Business Rule: "Any level Rejected -> Revisi/Cancel").
  const draftCandidates = registers.filter((r) => approvableTypes.includes(r.register_type) && r.status === 'draft').slice(0, 3)
  for (const r of draftCandidates) {
    approvalFlows.push({
      id: nextId('approvalFlow'),
      register_id: r.id,
      approver_id: managerUserId(),
      approval_level: 1,
      status: 'rejected',
      notes: rng.pick(['Nominal tidak sesuai RAPB, mohon revisi.', 'Lampiran belum lengkap, mohon dilengkapi kembali.', 'Program belum sesuai alokasi dana, cek kembali.']),
      responded_at: r.submitted_at,
      created_at: r.submitted_at,
    })
  }
}

// ---------------------------------------------------------------------------
// PHASE 10 — Notifications & audit logs
// ---------------------------------------------------------------------------
function generateNotificationsAndAudit() {
  const push = (n) => notifications.push({ id: nextId('notif'), ...n })

  push({ org_node_id: 1, user_id: 11, notif_type: 'approval_request', channel: 'whatsapp', title: 'Persetujuan Distribusi Diperlukan', body: 'Beberapa register distribusi menunggu persetujuan Anda di Approval Center.', ref_entity_type: 'register', ref_entity_id: null, is_read: false, sent_at: '2026-08-08T08:30:00+07:00' })
  push({ org_node_id: 1, user_id: 2, notif_type: 'cutoff_reminder', channel: 'in_app', title: 'Pengingat Closing: Periode Juli Terlewat', body: 'Batas Closing periode Juli 2026 (5 Agu 2026) telah terlewat. Mode Approval aktif — permintaan override telah dikirim ke Super Admin.', ref_entity_type: 'closing_periods', ref_entity_id: null, is_read: false, sent_at: '2026-08-06T07:00:00+07:00' })
  push({ org_node_id: 1, user_id: 1, notif_type: 'cutoff_reminder', channel: 'whatsapp', title: 'Permintaan Override Cutoff — Pusat', body: 'Siti Rahayu mengajukan override closing periode Juli 2026. Alasan: menunggu rekap donasi platform online.', ref_entity_type: 'closing_override_log', ref_entity_id: 1, is_read: false, sent_at: '2026-08-06T10:16:00+07:00' })
  push({ org_node_id: 4, user_id: 5, notif_type: 'cutoff_reminder', channel: 'whatsapp', title: 'Pengingat Closing Daerah Bandung', body: 'Batas Closing periode Juli 2026 adalah 3 Agu 2026 dan telah terlewat (Mode Strict). Hubungi Super Admin untuk override.', ref_entity_type: 'closing_periods', ref_entity_id: null, is_read: true, sent_at: '2026-08-01T07:00:00+07:00' })
  push({ org_node_id: 1, user_id: 2, notif_type: 'low_balance', channel: 'in_app', title: 'Saldo Rekening Mendekati Batas Minimum', body: 'Saldo BCA Syariah SMB 0354333999 mendekati batas minimum Rp 25.000.000.', ref_entity_type: 'bank_accounts', ref_entity_id: 4, is_read: false, sent_at: '2026-08-07T09:00:00+07:00' })
  push({ org_node_id: 1, user_id: 6, notif_type: 'budget_alert', channel: 'push', title: 'Budget Program Kesehatan Capai 80%', body: 'Realisasi Program Kesehatan Gratis 2026 telah mencapai 80% dari anggaran bulan ini.', ref_entity_type: 'programs', ref_entity_id: 1, is_read: false, sent_at: '2026-08-05T14:00:00+07:00' })
  push({ org_node_id: 5, user_id: 8, notif_type: 'ca_reminder', channel: 'whatsapp', title: 'Pengingat LPJ Cash Advance', body: 'LPJ Cash Advance Anda belum diselesaikan dalam 7 hari. Segera lengkapi laporan pertanggungjawaban.', ref_entity_type: 'cash_advances', ref_entity_id: null, is_read: false, sent_at: '2026-08-04T08:00:00+07:00' })
  push({ org_node_id: 1, user_id: 12, notif_type: 'audit_digest', channel: 'email', title: 'Ringkasan Aktivitas Harian', body: '24 transaksi baru diposting kemarin lintas seluruh node.', ref_entity_type: 'audit_logs', ref_entity_id: null, is_read: true, sent_at: '2026-08-07T06:00:00+07:00' })
  push({ org_node_id: 6, user_id: 9, notif_type: 'low_balance', channel: 'whatsapp', title: 'Saldo Kas Kecil Rendah', body: 'Saldo Kas Kecil Daerah Semarang mendekati batas minimum Rp 500.000.', ref_entity_type: 'bank_accounts', ref_entity_id: 11, is_read: false, sent_at: '2026-08-06T09:30:00+07:00' })
  push({ org_node_id: 1, user_id: 1, notif_type: 'approval_request', channel: 'in_app', title: 'Override Closing Menunggu Persetujuan', body: 'Permintaan override closing periode Juli 2026 (Pusat) menunggu keputusan Anda.', ref_entity_type: 'closing_override_log', ref_entity_id: 1, is_read: false, sent_at: '2026-08-06T10:20:00+07:00' })

  // Audit logs — closings, config, overrides, plus a sample of transaction creates
  const pushAudit = (a) => auditLogs.push({ id: nextId('audit'), ...a })
  for (const cfg of closingCutoffConfig) {
    pushAudit({ org_node_id: cfg.org_node_id, user_id: cfg.created_by, action: 'CREATE', entity_type: 'closing_cutoff_config', entity_id: cfg.id, after_json: JSON.stringify({ cutoff_day: cfg.cutoff_day, mode: cfg.mode }), ip_address: '192.168.1.10', created_at: '2026-01-01T08:00:00+07:00' })
  }
  for (const cp of closingPeriods.filter((c) => c.status === 'closed' && c.period_year === 2026 && c.period_month >= 3)) {
    pushAudit({ org_node_id: cp.org_node_id, user_id: cp.closed_by, action: 'CLOSE', entity_type: 'closing_periods', entity_id: cp.id, after_json: JSON.stringify({ period: `${cp.period_year}-${pad(cp.period_month)}`, status: 'closed' }), ip_address: '192.168.1.11', created_at: cp.closed_at })
  }
  for (const log of closingOverrideLog) {
    pushAudit({ org_node_id: log.org_node_id, user_id: log.requested_by, action: 'OVERRIDE_REQUEST', entity_type: 'closing_override_log', entity_id: log.id, after_json: JSON.stringify({ reason: log.reason }), ip_address: '192.168.1.14', created_at: log.requested_at })
    if (log.approved_by) {
      pushAudit({ org_node_id: log.org_node_id, user_id: log.approved_by, action: 'OVERRIDE_APPROVE', entity_type: 'closing_override_log', entity_id: log.id, after_json: JSON.stringify({ status: log.status }), ip_address: '192.168.1.10', created_at: log.approved_at })
    }
  }
  for (const u of users) {
    pushAudit({ org_node_id: u.org_node_id, user_id: u.id, action: 'LOGIN', entity_type: 'users', entity_id: u.id, after_json: null, ip_address: `192.168.1.${20 + u.id}`, created_at: u.last_login_at })
  }
  const sampledRegisters = registers.filter((_, i) => i % 6 === 0)
  for (const r of sampledRegisters) {
    pushAudit({ org_node_id: r.org_node_id, user_id: r.created_by, action: 'CREATE', entity_type: 'register', entity_id: r.id, after_json: JSON.stringify({ register_no: r.register_no, total_amount: r.total_amount, type: r.register_type }), ip_address: `192.168.2.${(r.id % 200) + 1}`, created_at: `${r.txn_date}T${pad(rng.int(8, 16))}:${pad(rng.int(0, 59))}:00+07:00` })
    if (r.posted_by) {
      pushAudit({ org_node_id: r.org_node_id, user_id: r.posted_by, action: 'POST', entity_type: 'register', entity_id: r.id, after_json: JSON.stringify({ register_no: r.register_no, status: 'posted' }), ip_address: `192.168.2.${(r.id % 200) + 1}`, created_at: r.posted_at })
    }
  }
  auditLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

// ---------------------------------------------------------------------------
// RUN — chronological single pass
// ---------------------------------------------------------------------------
generateAssetDepreciationData()
generateOpeningBalances()
generateAssetAcquisitionsInWindow()
generateAssetDisposalsInWindow()

for (const { year, month } of monthRange()) {
  generateDonationsForMonth(year, month)
  generateHakAmilRealloc(year, month)
  generateDistributionsForMonth(year, month)
  generateOpexForMonth(year, month)
  generateCashAdvancesForMonth(year, month)
}
generateAssetDepreciationJournals()
generateBankStatements()
generateClosingPeriods()
generateInternodeTransfers()
generateApprovalFlows()
generateNotificationsAndAudit()

// ---------------------------------------------------------------------------
// Derived: bank account current balances
// ---------------------------------------------------------------------------
// Opening balances are booked as real journal entries (see generateOpeningBalances),
// so the running balance is simply the net movement across all journal_items —
// no separate addition of acc.opening_balance (that would double-count it).
export const bankAccounts = bankAccountsSeed.map((acc) => {
  const movement = journalItems
    .filter((ji) => ji.coa_id === acc.coa_id)
    .reduce((sum, ji) => sum + (ji.debit - ji.credit), 0)
  return { ...acc, current_balance: movement }
})

// ---------------------------------------------------------------------------
// Derived: assets with computed accumulated depreciation & book value as of TODAY
// ---------------------------------------------------------------------------
export const assets = assetsSeed.map((a) => {
  const rows = assetDepreciations.filter((d) => d.asset_id === a.id)
  const last = rows[rows.length - 1]
  const accumulated = a.purchase_value - (last ? last.book_value_after : a.purchase_value)
  return {
    ...a,
    accumulated_depr: accumulated,
    book_value: last ? last.book_value_after : a.purchase_value,
    status: a.status,
  }
})

export {
  registers,
  journals,
  journalItems,
  donations,
  distributions,
  cashAdvances,
  caItems,
  assetDepreciations,
  bankStatements,
  reconMatches,
  closingPeriods,
  closingOverrideLog,
  internodeTransfers,
  approvalFlows,
  notifications,
  auditLogs,
  fundLedger,
}

// ---------------------------------------------------------------------------
// Runtime ledger API — exported so the app's mutable store (useLedgerStore)
// can create new transactions post-load using the exact same accounting
// conventions, id sequencing, and fund-balance tracking as the seed generator.
// ---------------------------------------------------------------------------
export {
  writeJournal,
  regNo,
  jrnNo,
  caNo,
  nextId,
  revenueCoaByFund,
  fundBalanceCoaByType,
  expenseCoaFor,
  NODE_BANK,
  bankAccountFor,
  coaIdForBankAccount,
  fundAvailable,
  bumpFund,
  financeUserFor,
  amilUserFor,
  managerUserId,
  adminOrgFor,
}

export function getFundLedgerSnapshot() {
  return Object.fromEntries(fundLedger)
}
