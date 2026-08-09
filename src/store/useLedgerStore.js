import { create } from 'zustand'
import {
  registers,
  journals,
  journalItems,
  donations,
  distributions,
  cashAdvances,
  caItems,
  approvalFlows,
  closingPeriods,
  closingOverrideLog,
  bankStatements,
  reconMatches,
  notifications,
  auditLogs,
  assets,
  bankAccounts,
  coa,
  costCenters,
  funds,
  programs,
  campaigns,
  contacts,
  budgets,
  getFundById,
  getProgramById,
  getCoaById,
  getContactById,
  closingCutoffConfig,
  CURRENT_USER_ID,
  TODAY_Y,
  TODAY_M,
} from '../data'
import {
  writeJournal,
  regNo,
  jrnNo,
  caNo,
  nextId,
  revenueCoaByFund,
  expenseCoaFor,
  NODE_BANK,
  bankAccountFor,
  coaIdForBankAccount,
  fundAvailable,
} from '../data/generator'
import { computeTrialBalance } from '../data/reports'

const pad = (n, len = 2) => String(n).padStart(len, '0')
const nowIso = () => new Date().toISOString()
const LEVEL2_THRESHOLD = 10_000_000
const APPROVABLE_TYPES = ['donasi', 'distribusi', 'pengeluaran', 'ca_pencairan']

class LedgerError extends Error {}

function maxId(arr, key = 'id') {
  return arr.reduce((m, r) => Math.max(m, r[key] || 0), 0)
}

function periodClosed(nodeId, year, month) {
  return closingPeriods.some((cp) => cp.org_node_id === nodeId && cp.period_year === year && cp.period_month === month && cp.status === 'closed')
}

function pushAudit({ nodeId, userId, action, entityType, entityId, after }) {
  auditLogs.unshift({
    id: nextId('audit'),
    org_node_id: nodeId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before_json: null,
    after_json: after ? JSON.stringify(after) : null,
    ip_address: '127.0.0.1',
    created_at: nowIso(),
  })
}

// bankAccounts.current_balance is a snapshot computed once at module load
// (see generator.js). Any store action that posts a journal touching a bank
// or kas account must keep it in sync — recomputing all of them on every
// bump() is cheap (small fixed list) and guarantees no action is forgotten.
function refreshBankBalances() {
  for (const acc of bankAccounts) {
    acc.current_balance = journalItems.filter((ji) => ji.coa_id === acc.coa_id).reduce((s, ji) => s + (ji.debit - ji.credit), 0)
  }
}

function pushNotification({ nodeId, userId, type, channel = 'in_app', title, body, refType, refId }) {
  notifications.unshift({
    id: nextId('notif'),
    org_node_id: nodeId,
    user_id: userId,
    notif_type: type,
    channel,
    title,
    body,
    ref_entity_type: refType || null,
    ref_entity_id: refId || null,
    is_read: false,
    sent_at: nowIso(),
  })
}

export const useLedgerStore = create((set, get) => ({
  version: 0,
  lastError: null,
  bump: () => {
    refreshBankBalances()
    set((s) => ({ version: s.version + 1 }))
  },

  clearError: () => set({ lastError: null }),

  // -------------------------------------------------------------------------
  // Jurnal Umum — manual entry, strict Debit = Kredit (Business Rule #1)
  // -------------------------------------------------------------------------
  createManualJournal({ nodeId, date, description, journalType = 'umum', lines, userId = CURRENT_USER_ID }) {
    const [y, m] = date.split('-').map(Number)
    if (periodClosed(nodeId, y, m)) {
      throw new LedgerError(`Periode ${m}/${y} sudah ditutup (Closed). Gunakan Jurnal Pembalik untuk koreksi.`)
    }
    const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
    const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
    if (Math.round(totalDebit) !== Math.round(totalCredit) || totalDebit === 0) {
      throw new LedgerError(`Jurnal tidak seimbang: Debit Rp${totalDebit.toLocaleString('id-ID')} vs Kredit Rp${totalCredit.toLocaleString('id-ID')}.`)
    }
    const journalId = writeJournal({
      nodeId,
      registerId: null,
      date,
      y,
      m,
      description,
      journalType,
      createdBy: userId,
      postedBy: userId,
      lines: lines.map((l) => ({ ...l, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0 })),
      isPosted: true,
      isLocked: false,
    })
    pushAudit({ nodeId, userId, action: 'POST', entityType: 'journal', entityId: journalId, after: { description, total: totalDebit } })
    get().bump()
    return journalId
  },

  // -------------------------------------------------------------------------
  // Jurnal Pembalik — reversing entry (Business Rule #2 & #7: posted data is
  // immutable; corrections only via reversal, never edit/delete).
  // -------------------------------------------------------------------------
  reverseJournal({ journalId, reason, userId = CURRENT_USER_ID }) {
    const original = journals.find((j) => j.id === journalId)
    if (!original) throw new LedgerError('Jurnal tidak ditemukan.')
    if (!original.is_posted) throw new LedgerError('Hanya jurnal terposting yang dapat dibalik.')
    if (original.is_reversed) throw new LedgerError('Jurnal ini sudah pernah dibalik sebelumnya.')
    if (!reason?.trim()) throw new LedgerError('Alasan jurnal pembalik wajib diisi.')

    const today = new Date()
    const y = today.getFullYear()
    const m = today.getMonth() + 1
    const date = `${y}-${pad(m)}-${pad(today.getDate())}`
    const originalLines = journalItems.filter((ji) => ji.journal_id === journalId)

    const reversalId = writeJournal({
      nodeId: original.org_node_id,
      registerId: original.register_id,
      date,
      y,
      m,
      description: `Jurnal Pembalik — ${original.journal_no} (${reason})`,
      journalType: 'pembalik',
      createdBy: userId,
      postedBy: userId,
      lines: originalLines.map((l) => ({
        coa_id: l.coa_id,
        debit: l.credit,
        credit: l.debit,
        fund_id: l.fund_id,
        program_id: l.program_id,
        cost_center_id: l.cost_center_id,
        narration: `Pembalik: ${l.narration || ''}`,
      })),
      isPosted: true,
    })
    original.is_reversed = true
    journals.find((j) => j.id === reversalId).reverse_of_id = journalId
    pushAudit({ nodeId: original.org_node_id, userId, action: 'REVERSE', entityType: 'journal', entityId: journalId, after: { reason, reversalId } })
    get().bump()
    return reversalId
  },

  // -------------------------------------------------------------------------
  // Donasi — creates register + donation, status 'submitted' (awaits
  // approval before the journal is actually posted, per FR-REG-04 lifecycle).
  // -------------------------------------------------------------------------
  createDonation({ nodeId, donorId, fundId, programId, amount, channel, date, notes, userId = CURRENT_USER_ID }) {
    if (!amount || amount <= 0) throw new LedgerError('Nominal donasi harus lebih dari 0.')
    const fund = getFundById(Number(fundId))
    if (!fund) throw new LedgerError('Jenis dana tidak valid.')
    const [y, m] = date.split('-').map(Number)
    const bankAccId = channel === 'cash' ? NODE_BANK[nodeId]?.kas : bankAccountFor(nodeId, false)

    const registerId = nextId('register')
    registers.push({
      id: registerId,
      org_node_id: nodeId,
      register_no: regNo(nodeId, y, m),
      register_type: 'donasi',
      status: 'submitted',
      total_amount: Number(amount),
      cost_center_id: 3,
      fund_id: fund.id,
      program_id: programId ? Number(programId) : null,
      contact_id: Number(donorId),
      bank_account_id: bankAccId,
      description: `Penerimaan ${fund.fund_name} — ${getContactById(Number(donorId))?.name || 'Donatur'}`,
      txn_date: date,
      created_by: userId,
      submitted_at: nowIso(),
      approved_by: null,
      approved_at: null,
      posted_by: null,
      posted_at: null,
      is_locked: false,
    })

    const donationId = nextId('donation')
    donations.push({
      id: donationId,
      org_node_id: nodeId,
      register_id: registerId,
      donor_id: Number(donorId),
      campaign_id: null,
      fund_id: fund.id,
      program_id: programId ? Number(programId) : null,
      donation_date: date,
      amount: Number(amount),
      channel,
      payment_ref: `MANUAL-${Date.now()}`,
      bank_account_id: bankAccId,
      receipt_no: null,
      receipt_sent_at: null,
      is_anonymous: false,
      journal_id: null,
      status: 'submitted',
      created_by: userId,
      notes,
    })

    pushAudit({ nodeId, userId, action: 'CREATE', entityType: 'register', entityId: registerId, after: { register_no: registers[registers.length - 1].register_no, amount } })
    get().bump()
    return { registerId, donationId }
  },

  // -------------------------------------------------------------------------
  // Distribusi — cek Dana Terikat hard-lock (Business Rule #4) sebelum
  // register dibuat, bukan hanya saat approval.
  // -------------------------------------------------------------------------
  createDistribution({ nodeId, programId, recipientId, amount, distType, date, naturaDesc, userId = CURRENT_USER_ID }) {
    if (!amount || amount <= 0) throw new LedgerError('Nominal distribusi harus lebih dari 0.')
    const program = getProgramById(Number(programId))
    if (!program) throw new LedgerError('Program tidak valid.')
    const fund = getFundById(program.fund_id)
    const available = fundAvailable(fund.id)
    if (fund.hard_lock && Number(amount) > available) {
      throw new LedgerError(`Dana Terikat "${fund.fund_name}" tidak cukup (tersedia Rp${available.toLocaleString('id-ID')}). Distribusi ditolak sesuai kebijakan Hard Lock (Business Rule #4).`)
    }
    const recipient = getContactById(Number(recipientId))
    const asnaf = recipient?.asnaf_category || 'miskin'
    const [y, m] = date.split('-').map(Number)
    const bankAccId = distType === 'cash' ? NODE_BANK[nodeId]?.kas : bankAccountFor(nodeId, false)

    const registerId = nextId('register')
    registers.push({
      id: registerId,
      org_node_id: nodeId,
      register_no: regNo(nodeId, y, m),
      register_type: 'distribusi',
      status: 'submitted',
      total_amount: Number(amount),
      cost_center_id: program.cost_center_id,
      fund_id: fund.id,
      program_id: program.id,
      contact_id: Number(recipientId),
      bank_account_id: bankAccId,
      description: `Distribusi ${program.program_name} — ${recipient?.name || 'Penerima'}`,
      txn_date: date,
      created_by: userId,
      submitted_at: nowIso(),
      approved_by: null,
      approved_at: null,
      posted_by: null,
      posted_at: null,
      is_locked: false,
    })

    const distId = nextId('distribution')
    distributions.push({
      id: distId,
      org_node_id: nodeId,
      register_id: registerId,
      program_id: program.id,
      fund_id: fund.id,
      recipient_id: Number(recipientId),
      dist_date: date,
      amount: Number(amount),
      dist_type: distType,
      asnaf_category: asnaf,
      bank_account_id: bankAccId,
      payment_ref: distType === 'transfer' ? `MANUAL-${Date.now()}` : null,
      sk_no: `SK/DIST/${y}/${pad(m)}/${pad(registerId, 3)}`,
      berita_acara_url: null,
      natura_desc: distType === 'natura' ? naturaDesc : null,
      natura_value: distType === 'natura' ? Number(amount) : null,
      notes: null,
      journal_id: null,
      status: 'submitted',
      created_by: userId,
    })

    pushAudit({ nodeId, userId, action: 'CREATE', entityType: 'register', entityId: registerId, after: { amount } })
    get().bump()
    return { registerId, distId }
  },

  // -------------------------------------------------------------------------
  // Cash Advance — pengajuan & pencairan
  // -------------------------------------------------------------------------
  createCashAdvance({ nodeId, requestedBy, purpose, amount, needDate, costCenterId, fundId = 6, userId = CURRENT_USER_ID }) {
    if (!amount || amount <= 0) throw new LedgerError('Nominal CA harus lebih dari 0.')
    const [y, m] = needDate.split('-').map(Number)
    const registerId = nextId('register')
    registers.push({
      id: registerId,
      org_node_id: nodeId,
      register_no: regNo(nodeId, y, m),
      register_type: 'ca_pencairan',
      status: 'submitted',
      total_amount: Number(amount),
      cost_center_id: Number(costCenterId) || 2,
      fund_id: Number(fundId),
      program_id: null,
      contact_id: null,
      bank_account_id: bankAccountFor(nodeId, false),
      description: `Pencairan CA — ${purpose}`,
      txn_date: needDate,
      created_by: requestedBy || userId,
      submitted_at: nowIso(),
      approved_by: null,
      approved_at: null,
      posted_by: null,
      posted_at: null,
      is_locked: false,
    })
    const caId = nextId('ca')
    cashAdvances.push({
      id: caId,
      org_node_id: nodeId,
      register_id: registerId,
      requested_by: requestedBy || userId,
      cost_center_id: Number(costCenterId) || 2,
      fund_id: Number(fundId),
      program_id: null,
      budget_id: null,
      ca_no: caNo(nodeId, y, m),
      purpose,
      amount_requested: Number(amount),
      amount_disbursed: 0,
      amount_realized: 0,
      amount_returned: 0,
      status: 'submitted',
      need_date: needDate,
      disbursed_at: null,
      ljp_submitted_at: null,
      settled_at: null,
    })
    pushAudit({ nodeId, userId, action: 'CREATE', entityType: 'register', entityId: registerId, after: { purpose, amount } })
    get().bump()
    return { registerId, caId }
  },

  settleCashAdvance(caId, { items, userId = CURRENT_USER_ID }) {
    const ca = cashAdvances.find((c) => c.id === caId)
    if (!ca) throw new LedgerError('Cash Advance tidak ditemukan.')
    if (!['disbursed', 'approved'].includes(ca.status)) throw new LedgerError('CA belum dicairkan, LPJ belum dapat diajukan.')
    const amountRealized = items.reduce((s, it) => s + (Number(it.amount) || 0), 0)
    if (amountRealized <= 0) throw new LedgerError('Rincian LPJ tidak boleh kosong.')
    if (amountRealized > ca.amount_disbursed) {
      throw new LedgerError(`Total realisasi (Rp${amountRealized.toLocaleString('id-ID')}) tidak boleh melebihi dana yang dicairkan (Rp${ca.amount_disbursed.toLocaleString('id-ID')}).`)
    }
    const amountReturned = ca.amount_disbursed - amountRealized
    const today = new Date()
    const y = today.getFullYear()
    const m = today.getMonth() + 1
    const date = `${y}-${pad(m)}-${pad(today.getDate())}`

    const byCoa = new Map()
    for (const it of items) byCoa.set(Number(it.coa_id), (byCoa.get(Number(it.coa_id)) || 0) + Number(it.amount))
    const lines = []
    for (const [coaId, amt] of byCoa) lines.push({ coa_id: coaId, debit: amt, credit: 0, narration: 'Realisasi LPJ Cash Advance', fund_id: ca.fund_id, cost_center_id: ca.cost_center_id })
    lines.push({ coa_id: 1020, debit: 0, credit: amountRealized, narration: 'Pelunasan Piutang CA (realisasi)', fund_id: ca.fund_id, cost_center_id: ca.cost_center_id })
    if (amountReturned > 0) {
      const kasCoa = coaIdForBankAccount(NODE_BANK[ca.org_node_id]?.kas)
      lines.push({ coa_id: kasCoa, debit: amountReturned, credit: 0, narration: 'Pengembalian sisa CA ke kas', fund_id: null })
      lines.push({ coa_id: 1020, debit: 0, credit: amountReturned, narration: 'Pelunasan Piutang CA (sisa dikembalikan)', fund_id: ca.fund_id, cost_center_id: ca.cost_center_id })
    }

    const journalId = writeJournal({
      nodeId: ca.org_node_id,
      registerId: ca.register_id,
      date,
      y,
      m,
      description: `Realisasi LPJ Cash Advance — ${ca.ca_no}`,
      journalType: 'pengeluaran',
      createdBy: userId,
      postedBy: userId,
      lines,
    })

    for (const it of items) {
      caItems.push({ id: nextId('caItem'), ca_id: caId, coa_id: Number(it.coa_id), description: it.description, amount: Number(it.amount) })
    }
    ca.amount_realized = amountRealized
    ca.amount_returned = amountReturned
    ca.status = 'settled'
    ca.ljp_submitted_at = nowIso()
    ca.settled_at = nowIso()
    pushAudit({ nodeId: ca.org_node_id, userId, action: 'POST', entityType: 'cash_advances', entityId: caId, after: { amountRealized, amountReturned } })
    get().bump()
    return journalId
  },

  // -------------------------------------------------------------------------
  // Approval Center — multi-level (Section 12): Level 1 selalu; Level 2
  // (Direktur/Ketua) ditambahkan otomatis jika nominal > threshold.
  // -------------------------------------------------------------------------
  approveRegister(registerId, { comment, userId = CURRENT_USER_ID } = {}) {
    const r = registers.find((reg) => reg.id === registerId)
    if (!r) throw new LedgerError('Register tidak ditemukan.')
    if (!['submitted', 'approved'].includes(r.status)) throw new LedgerError('Register ini tidak dalam status menunggu persetujuan.')

    const needsLevel2 = r.total_amount > LEVEL2_THRESHOLD
    const existingFlows = approvalFlows.filter((f) => f.register_id === registerId)
    const level1 = existingFlows.find((f) => f.approval_level === 1)
    const level2 = existingFlows.find((f) => f.approval_level === 2)

    if (!level1 || level1.status === 'pending') {
      if (level1) {
        level1.status = 'approved'
        level1.notes = comment || level1.notes
        level1.responded_at = nowIso()
      } else {
        approvalFlows.push({ id: nextId('approvalFlow'), register_id: registerId, approver_id: userId, approval_level: 1, status: 'approved', notes: comment || null, responded_at: nowIso(), created_at: r.submitted_at })
      }
      if (needsLevel2) {
        r.status = 'approved'
        approvalFlows.push({ id: nextId('approvalFlow'), register_id: registerId, approver_id: 1, approval_level: 2, status: 'pending', notes: null, responded_at: null, created_at: nowIso() })
        pushAudit({ nodeId: r.org_node_id, userId, action: 'UPDATE', entityType: 'register', entityId: registerId, after: { status: 'approved (menunggu Level 2)' } })
        get().bump()
        return { finalized: false }
      }
    } else if (level2 && level2.status === 'pending') {
      level2.status = 'approved'
      level2.notes = comment || null
      level2.responded_at = nowIso()
    }

    // Finalize: post the underlying accounting entry.
    r.status = 'posted'
    r.approved_by = userId
    r.approved_at = nowIso()
    r.posted_by = userId
    r.posted_at = nowIso()
    r.is_locked = periodClosed(r.org_node_id, ...r.txn_date.split('-').map(Number).slice(0, 2))

    const [y, m] = r.txn_date.split('-').map(Number)
    let journalId = null

    if (r.register_type === 'donasi') {
      const donation = donations.find((d) => d.register_id === registerId)
      const fund = getFundById(r.fund_id)
      const revCoa = revenueCoaByFund[r.fund_id]
      journalId = writeJournal({
        nodeId: r.org_node_id,
        registerId,
        date: r.txn_date,
        y,
        m,
        description: r.description,
        journalType: 'penerimaan',
        createdBy: r.created_by,
        postedBy: userId,
        lines: [
          { coa_id: coaIdForBankAccount(r.bank_account_id), debit: r.total_amount, credit: 0, narration: `Penerimaan via ${donation?.channel}`, fund_id: null },
          { coa_id: revCoa, debit: 0, credit: r.total_amount, narration: fund.fund_name, fund_id: fund.id, program_id: r.program_id, cost_center_id: r.cost_center_id },
        ],
      })
      donation.status = 'posted'
      donation.journal_id = journalId
      donation.receipt_no = `RCP/${y}/${pad(m)}/${pad(donation.id, 4)}`
      donation.receipt_sent_at = nowIso()
    } else if (r.register_type === 'distribusi') {
      const dist = distributions.find((d) => d.register_id === registerId)
      const program = getProgramById(r.program_id)
      const fund = getFundById(r.fund_id)
      if (fund.hard_lock && r.total_amount > fundAvailable(fund.id)) {
        throw new LedgerError(`Dana Terikat "${fund.fund_name}" tidak lagi cukup saat approval (saldo berubah). Distribusi dibatalkan.`)
      }
      const expCoa = expenseCoaFor(program, dist?.asnaf_category)
      journalId = writeJournal({
        nodeId: r.org_node_id,
        registerId,
        date: r.txn_date,
        y,
        m,
        description: r.description,
        journalType: 'pengeluaran',
        createdBy: r.created_by,
        postedBy: userId,
        lines: [
          { coa_id: expCoa, debit: r.total_amount, credit: 0, narration: r.description, fund_id: fund.id, program_id: program.id, cost_center_id: r.cost_center_id },
          { coa_id: coaIdForBankAccount(r.bank_account_id), debit: 0, credit: r.total_amount, narration: `Pembayaran via ${dist?.dist_type}`, fund_id: null },
        ],
      })
      dist.status = 'posted'
      dist.journal_id = journalId
    } else if (r.register_type === 'ca_pencairan') {
      const ca = cashAdvances.find((c) => c.register_id === registerId)
      journalId = writeJournal({
        nodeId: r.org_node_id,
        registerId,
        date: r.txn_date,
        y,
        m,
        description: r.description,
        journalType: 'pengeluaran',
        createdBy: r.created_by,
        postedBy: userId,
        lines: [
          { coa_id: 1020, debit: r.total_amount, credit: 0, narration: `Piutang CA — ${ca?.purpose}`, fund_id: r.fund_id, cost_center_id: r.cost_center_id },
          { coa_id: coaIdForBankAccount(r.bank_account_id), debit: 0, credit: r.total_amount, narration: 'Pencairan CA', fund_id: null },
        ],
      })
      ca.status = 'disbursed'
      ca.amount_disbursed = r.total_amount
      ca.disbursed_at = nowIso()
    }

    pushAudit({ nodeId: r.org_node_id, userId, action: 'POST', entityType: 'register', entityId: registerId, after: { status: 'posted', journalId } })
    pushNotification({ nodeId: r.org_node_id, userId: r.created_by, type: 'approval_request', title: 'Transaksi Disetujui', body: `${r.register_no} telah disetujui dan diposting.`, refType: 'register', refId: registerId })
    get().bump()
    return { finalized: true, journalId }
  },

  rejectRegister(registerId, { reason, userId = CURRENT_USER_ID } = {}) {
    if (!reason?.trim()) throw new LedgerError('Alasan penolakan wajib diisi.')
    const r = registers.find((reg) => reg.id === registerId)
    if (!r) throw new LedgerError('Register tidak ditemukan.')
    const pendingLevel = approvalFlows.find((f) => f.register_id === registerId && f.status === 'pending')
    const level = pendingLevel?.approval_level || 1
    if (pendingLevel) {
      pendingLevel.status = 'rejected'
      pendingLevel.notes = reason
      pendingLevel.responded_at = nowIso()
    } else {
      approvalFlows.push({ id: nextId('approvalFlow'), register_id: registerId, approver_id: userId, approval_level: level, status: 'rejected', notes: reason, responded_at: nowIso(), created_at: r.submitted_at })
    }
    r.status = 'draft'
    pushAudit({ nodeId: r.org_node_id, userId, action: 'UPDATE', entityType: 'register', entityId: registerId, after: { status: 'rejected->draft', reason } })
    pushNotification({ nodeId: r.org_node_id, userId: r.created_by, type: 'approval_request', title: 'Transaksi Ditolak', body: `${r.register_no} ditolak: "${reason}". Silakan revisi.`, refType: 'register', refId: registerId })
    get().bump()
  },

  // -------------------------------------------------------------------------
  // Kas & Bank — transfer antar rekening
  // -------------------------------------------------------------------------
  transferFunds({ nodeId, fromCoaId, toCoaId, amount, date, description, userId = CURRENT_USER_ID }) {
    if (!amount || amount <= 0) throw new LedgerError('Nominal transfer harus lebih dari 0.')
    if (fromCoaId === toCoaId) throw new LedgerError('Rekening asal dan tujuan tidak boleh sama.')
    const [y, m] = date.split('-').map(Number)
    const journalId = writeJournal({
      nodeId,
      registerId: null,
      date,
      y,
      m,
      description: description || 'Transfer antar rekening',
      journalType: 'transfer',
      createdBy: userId,
      postedBy: userId,
      lines: [
        { coa_id: Number(toCoaId), debit: Number(amount), credit: 0, narration: description || 'Transfer masuk', fund_id: null },
        { coa_id: Number(fromCoaId), debit: 0, credit: Number(amount), narration: description || 'Transfer keluar', fund_id: null },
      ],
    })
    pushAudit({ nodeId, userId, action: 'POST', entityType: 'journal', entityId: journalId, after: { type: 'transfer', amount } })
    get().bump()
    return journalId
  },

  // -------------------------------------------------------------------------
  // Rekonsiliasi Bank — buat jurnal langsung dari mutasi yang belum cocok
  // -------------------------------------------------------------------------
  createJournalFromStatement(statementId, { coaId, description, userId = CURRENT_USER_ID }) {
    const stmt = bankStatements.find((s) => s.id === statementId)
    if (!stmt) throw new LedgerError('Mutasi bank tidak ditemukan.')
    const bankAccountCoaId = bankAccounts.find((b) => b.id === stmt.bank_account_id)?.coa_id
    if (!bankAccountCoaId) throw new LedgerError('Rekening bank untuk mutasi ini tidak ditemukan.')
    const [y, m] = stmt.txn_date.split('-').map(Number)
    const amount = Math.abs(stmt.amount)
    const lines =
      stmt.amount >= 0
        ? [
            { coa_id: bankAccountCoaId, debit: amount, credit: 0, narration: description, fund_id: null },
            { coa_id: Number(coaId), debit: 0, credit: amount, narration: description, fund_id: null },
          ]
        : [
            { coa_id: Number(coaId), debit: amount, credit: 0, narration: description, fund_id: null },
            { coa_id: bankAccountCoaId, debit: 0, credit: amount, narration: description, fund_id: null },
          ]
    const journalId = writeJournal({
      nodeId: stmt.org_node_id,
      registerId: null,
      date: stmt.txn_date,
      y,
      m,
      description: description || stmt.description,
      journalType: 'umum',
      createdBy: userId,
      postedBy: userId,
      lines,
    })
    const bankLine = journalItems.filter((ji) => ji.journal_id === journalId).find((ji) => ji.coa_id === bankAccountCoaId)
    reconMatches.push({ id: nextId('recon'), bank_statement_id: statementId, journal_item_id: bankLine.id, match_type: 'manual', confidence_pct: 100, matched_by: userId, matched_at: nowIso() })
    stmt.status = 'matched'
    pushAudit({ nodeId: stmt.org_node_id, userId, action: 'CREATE', entityType: 'journal', entityId: journalId, after: { fromStatement: statementId } })
    get().bump()
    return journalId
  },

  // -------------------------------------------------------------------------
  // Tutup Buku — validasi balance + cutoff dilakukan di caller (TutupBukuPage
  // sudah menghitung status cutoff); di sini kita re-validasi balance sebagai
  // garis pertahanan terakhir sebelum benar-benar mengunci periode.
  // -------------------------------------------------------------------------
  closePeriod({ nodeId, year, month, userId = CURRENT_USER_ID, viaOverride = false, overrideReason }) {
    const tb = computeTrialBalance({ nodeId, consolidated: false, year, month })
    const imbalanced = Object.values(tb.validations).some((v) => Math.round(v.diff) !== 0)
    if (imbalanced) throw new LedgerError('Trial Balance tidak seimbang — selesaikan selisih sebelum Closing.')

    let cp = closingPeriods.find((c) => c.org_node_id === nodeId && c.period_year === year && c.period_month === month)
    if (!cp) {
      cp = { id: nextId('closingPeriod'), org_node_id: nodeId, period_year: year, period_month: month, status: 'open', closed_by: null, closed_at: null }
      closingPeriods.push(cp)
    }
    if (cp.status === 'closed') throw new LedgerError('Periode ini sudah ditutup sebelumnya.')
    cp.status = 'closed'
    cp.closed_by = userId
    cp.closed_at = nowIso()

    for (const j of journals) {
      if (j.org_node_id === nodeId && j.period_year === year && j.period_month === month) j.is_locked = true
    }

    if (viaOverride) {
      const log = closingOverrideLog.find((o) => o.org_node_id === nodeId && o.period_year === year && o.period_month === month && o.status === 'pending')
      if (log) {
        log.status = 'approved'
        log.approved_by = userId
        log.approved_at = nowIso()
      }
    }
    pushAudit({ nodeId, userId, action: 'CLOSE', entityType: 'closing_periods', entityId: cp.id, after: { period: `${year}-${pad(month)}`, viaOverride, overrideReason } })
    get().bump()
  },

  requestCutoffOverride({ nodeId, year, month, reason, userId = CURRENT_USER_ID }) {
    if (!reason?.trim()) throw new LedgerError('Alasan override wajib diisi.')
    const log = { id: maxId(closingOverrideLog) + 1, org_node_id: nodeId, period_year: year, period_month: month, requested_by: userId, requested_at: nowIso(), approved_by: null, approved_at: null, status: 'pending', reason, rejection_note: null }
    closingOverrideLog.push(log)
    pushAudit({ nodeId, userId, action: 'OVERRIDE_REQUEST', entityType: 'closing_override_log', entityId: log.id, after: { reason } })
    pushNotification({ nodeId: 1, userId: 1, type: 'cutoff_reminder', title: 'Permintaan Override Cutoff', body: `Permintaan override closing periode ${month}/${year} menunggu persetujuan Anda.`, refType: 'closing_override_log', refId: log.id })
    get().bump()
    return log.id
  },

  approveCutoffOverride(logId, { userId = CURRENT_USER_ID } = {}) {
    const log = closingOverrideLog.find((o) => o.id === logId)
    if (!log) throw new LedgerError('Permintaan override tidak ditemukan.')
    get().closePeriod({ nodeId: log.org_node_id, year: log.period_year, month: log.period_month, userId, viaOverride: true })
  },

  rejectCutoffOverride(logId, { note, userId = CURRENT_USER_ID } = {}) {
    const log = closingOverrideLog.find((o) => o.id === logId)
    if (!log) throw new LedgerError('Permintaan override tidak ditemukan.')
    log.status = 'rejected'
    log.approved_by = userId
    log.approved_at = nowIso()
    log.rejection_note = note || null
    pushAudit({ nodeId: log.org_node_id, userId, action: 'OVERRIDE_REJECT', entityType: 'closing_override_log', entityId: log.id, after: { note } })
    get().bump()
  },

  // -------------------------------------------------------------------------
  // Master data — CRUD sederhana (bukan operasi akuntansi, tidak butuh
  // validasi double-entry).
  // -------------------------------------------------------------------------
  addContact(contact) {
    const id = maxId(contacts) + 1
    contacts.push({ id, is_active: true, created_at: nowIso(), updated_at: nowIso(), ...contact })
    get().bump()
    return id
  },
  updateContact(id, fields) {
    const c = contacts.find((x) => x.id === id)
    if (c) Object.assign(c, fields, { updated_at: nowIso() })
    get().bump()
  },
  deleteContact(id) {
    const idx = contacts.findIndex((x) => x.id === id)
    if (idx >= 0) contacts.splice(idx, 1)
    get().bump()
  },

  addCostCenter(cc) {
    const id = maxId(costCenters) + 1
    costCenters.push({ id, is_active: true, ...cc })
    get().bump()
    return id
  },
  updateCostCenter(id, fields) {
    const cc = costCenters.find((x) => x.id === id)
    if (cc) Object.assign(cc, fields)
    get().bump()
  },

  addCoaAccount(acc) {
    const code = acc.account_code.trim()
    const name = acc.account_name.trim()
    if (coa.some((c) => c.account_code === code)) throw new LedgerError('Kode akun sudah digunakan.')
    if (coa.some((c) => c.account_name.trim().toLowerCase() === name.toLowerCase())) throw new LedgerError('Nama akun sudah digunakan oleh akun lain.')
    const id = maxId(coa) + 1
    const parent = acc.parent_id ? getCoaById(Number(acc.parent_id)) : null
    coa.push({
      id,
      account_code: code,
      account_name: name,
      account_type: acc.account_type,
      normal_balance: acc.normal_balance,
      parent_id: acc.parent_id ? Number(acc.parent_id) : null,
      coa_level: parent ? parent.coa_level + 1 : 1,
      coa_path: parent ? `${parent.coa_path}/${id}` : `/${id}`,
      is_group: acc.is_group === 'group' || acc.is_group === true,
    })
    get().bump()
    return id
  },

  coaHasTransactions(id) {
    return journalItems.some((ji) => ji.coa_id === id)
  },

  updateCoaAccount(id, fields) {
    const acc = coa.find((c) => c.id === id)
    if (!acc) throw new LedgerError('Akun tidak ditemukan.')
    if (fields.account_name !== undefined) {
      const name = fields.account_name.trim()
      if (coa.some((c) => c.id !== id && c.account_name.trim().toLowerCase() === name.toLowerCase())) {
        throw new LedgerError('Nama akun sudah digunakan oleh akun lain.')
      }
    }
    const locked = journalItems.some((ji) => ji.coa_id === id)
    if (locked) {
      if (fields.account_name !== undefined) acc.account_name = fields.account_name.trim()
      if (fields.description !== undefined) acc.description = fields.description
      get().bump()
      return
    }
    if (fields.account_code !== undefined) {
      const code = fields.account_code.trim()
      if (coa.some((c) => c.id !== id && c.account_code === code)) throw new LedgerError('Kode akun sudah digunakan.')
      acc.account_code = code
    }
    if (fields.account_name !== undefined) acc.account_name = fields.account_name.trim()
    if (fields.account_type !== undefined) acc.account_type = fields.account_type
    if (fields.normal_balance !== undefined) acc.normal_balance = fields.normal_balance
    if (fields.description !== undefined) acc.description = fields.description
    if (fields.is_group !== undefined) acc.is_group = fields.is_group === 'group' || fields.is_group === true
    if (fields.parent_id !== undefined) {
      const parent = fields.parent_id ? getCoaById(Number(fields.parent_id)) : null
      acc.parent_id = fields.parent_id ? Number(fields.parent_id) : null
      acc.coa_level = parent ? parent.coa_level + 1 : 1
      acc.coa_path = parent ? `${parent.coa_path}/${id}` : `/${id}`
    }
    get().bump()
  },

  addFund(fund) {
    const id = maxId(funds) + 1
    funds.push({ id, is_active: true, coa_saldo_id: fund.fund_type === 'unrestricted' ? 30 : fund.fund_type === 'temporarily_restricted' ? 31 : 32, ...fund })
    get().bump()
    return id
  },

  addProgram(program) {
    const id = maxId(programs) + 1
    programs.push({ id, org_node_id: 1, status: 'active', ...program })
    get().bump()
    return id
  },
  updateProgram(id, fields) {
    const p = programs.find((x) => x.id === id)
    if (p) Object.assign(p, fields)
    get().bump()
  },

  addCampaign(campaign) {
    const id = maxId(campaigns) + 1
    campaigns.push({ id, org_node_id: 1, status: 'active', ...campaign })
    get().bump()
    return id
  },

  addAsset({ nodeId, userId = CURRENT_USER_ID, ...asset }) {
    const id = maxId(assets) + 1
    assets.push({
      id,
      org_node_id: nodeId,
      accumulated_depr: 0,
      book_value: Number(asset.purchase_value),
      status: 'active',
      ...asset,
    })
    // Acquisition is a real accounting event: Dr Aset Tetap / Cr Bank-Kas, so
    // the new asset shows up consistently in Trial Balance & Laporan Keuangan,
    // not just in the asset register (mirrors generateAssetAcquisitionsInWindow).
    const today = new Date()
    const y = today.getFullYear()
    const m = today.getMonth() + 1
    const date = `${y}-${pad(m)}-${pad(today.getDate())}`
    const bankAccId = bankAccountFor(nodeId, false)
    writeJournal({
      nodeId,
      registerId: null,
      date,
      y,
      m,
      description: `Pembelian Aset Tetap — ${asset.asset_name}`,
      journalType: 'umum',
      createdBy: userId,
      postedBy: userId,
      lines: [
        { coa_id: 110, debit: Number(asset.purchase_value), credit: 0, narration: `Perolehan ${asset.asset_name}`, fund_id: null, cost_center_id: asset.cost_center_id },
        { coa_id: coaIdForBankAccount(bankAccId), debit: 0, credit: Number(asset.purchase_value), narration: 'Pembayaran pembelian aset', fund_id: null },
      ],
    })
    get().bump()
    return id
  },

  addBudget(budget) {
    const id = maxId(budgets) + 1
    budgets.push({ id, version: 1, created_by: CURRENT_USER_ID, ...budget })
    get().bump()
    return id
  },
  reviseBudget(id, { amount, reason, userId = CURRENT_USER_ID }) {
    const original = budgets.find((b) => b.id === id)
    if (!original) throw new LedgerError('Anggaran tidak ditemukan.')
    original.amount = Number(amount)
    original.version += 1
    original.notes = `${original.notes || ''} | Revisi: ${reason}`.trim()
    pushAudit({ nodeId: original.org_node_id, userId, action: 'UPDATE', entityType: 'budgets', entityId: id, after: { amount, reason } })
    get().bump()
  },
}))

export { LedgerError }
