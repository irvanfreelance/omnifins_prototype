import { journalItems, journals, closingPeriods, internodeTransfers } from './generator'
import { coa, getCoaById, buildCoaTree } from './coa'
import { getChildNodeIds, orgNodes } from './orgNodes'
import { funds, FUND_TYPE_LABEL } from './funds'

// ---------------------------------------------------------------------------
// Scope resolution
// ---------------------------------------------------------------------------
export function resolveScopeNodeIds(nodeId, consolidated) {
  if (!consolidated) return [nodeId]
  return getChildNodeIds(nodeId, true)
}

function periodKey(y, m) {
  return y * 100 + m
}

// ---------------------------------------------------------------------------
// Core: filter journal items by scope/period/dimension, excluding internode
// elimination lines when consolidating (FR-KONSOL-03)
// ---------------------------------------------------------------------------
function eliminationJournalIds(nodeIds) {
  const ids = new Set()
  if (nodeIds.length <= 1) return ids
  for (const t of internodeTransfers) {
    if (nodeIds.includes(t.from_node_id) && nodeIds.includes(t.to_node_id)) {
      ids.add(t.from_journal_id)
      ids.add(t.to_journal_id)
    }
  }
  return ids
}

export function filterJournalItems({ nodeIds, yFrom, mFrom, yTo, mTo, fundId, programId, costCenterId, onlyPosted = true }) {
  const elim = eliminationJournalIds(nodeIds)
  const journalById = new Map(journals.map((j) => [j.id, j]))
  const kFrom = yFrom != null ? periodKey(yFrom, mFrom) : -Infinity
  const kTo = yTo != null ? periodKey(yTo, mTo) : Infinity
  return journalItems.filter((ji) => {
    if (!nodeIds.includes(ji.org_node_id)) return false
    if (elim.has(ji.journal_id)) return false
    const j = journalById.get(ji.journal_id)
    if (!j) return false
    if (onlyPosted && !j.is_posted) return false
    const k = periodKey(j.period_year, j.period_month)
    if (k < kFrom || k > kTo) return false
    if (fundId && ji.fund_id !== fundId) return false
    if (programId && ji.program_id !== programId) return false
    if (costCenterId && ji.cost_center_id !== costCenterId) return false
    return true
  })
}

export function sumByCoa(items) {
  const map = new Map()
  for (const ji of items) {
    const cur = map.get(ji.coa_id) || { debit: 0, credit: 0 }
    cur.debit += ji.debit
    cur.credit += ji.credit
    map.set(ji.coa_id, cur)
  }
  return map
}

function netForAccount(acc, debit, credit) {
  return acc.normal_balance === 'debit' ? debit - credit : credit - debit
}

// ---------------------------------------------------------------------------
// Trial Balance — full spec (Saldo Awal, Mutasi, Saldo Akhir) per leaf & rollup
// ---------------------------------------------------------------------------
export function computeTrialBalance({ nodeId, consolidated = false, year, month }) {
  const nodeIds = resolveScopeNodeIds(nodeId, consolidated)
  // Saldo awal = seluruh mutasi sebelum periode ini (sudah termasuk penyesuaian
  // periode-periode lalu, karena itu semua sudah ter-posting sebagai jurnal biasa).
  const openingItemsFixed = filterJournalItemsBeforePeriod(nodeIds, year, month)
  const periodItems = filterJournalItems({ nodeIds, yFrom: year, mFrom: month, yTo: year, mTo: month })

  // Dalam periode berjalan, jurnal Penyesuaian (adjusting entry, journal_type
  // 'penyesuaian' — penyusutan, alokasi hak amil, dll.) dipisah dari mutasi
  // transaksi biasa, supaya "Neraca Saldo" (sebelum penyesuaian) dan "Neraca
  // Disesuaikan" (setelah penyesuaian — saldo akhir yang sesungguhnya) tampil
  // sebagai dua angka berbeda, sesuai format Trial Balance standar.
  const journalById = new Map(journals.map((j) => [j.id, j]))
  const mutasiItems = periodItems.filter((ji) => journalById.get(ji.journal_id)?.journal_type !== 'penyesuaian')
  const adjItems = periodItems.filter((ji) => journalById.get(ji.journal_id)?.journal_type === 'penyesuaian')

  const openingByCoa = sumByCoa(openingItemsFixed)
  const mutasiByCoa = sumByCoa(mutasiItems)
  const adjByCoa = sumByCoa(adjItems)

  // Raw debit/credit are aggregated up the tree first (plain addition — always
  // valid regardless of normal_balance), and only SIGNED into a saldo at the very
  // end, using each node's OWN normal_balance. Signing at the leaf first and then
  // summing already-signed values breaks the moment a group mixes a normal
  // account with its contra (e.g. Aset Tetap debit-normal + Akumulasi Penyusutan
  // credit-normal, both under Aset Tidak Lancar) — the contra would add instead
  // of subtract once rolled up.
  const rawByCoaId = new Map(
    coa.map((acc) => {
      const opening = openingByCoa.get(acc.id) || { debit: 0, credit: 0 }
      const mut = mutasiByCoa.get(acc.id) || { debit: 0, credit: 0 }
      const adj = adjByCoa.get(acc.id) || { debit: 0, credit: 0 }
      return [
        acc.id,
        {
          openingDebit: opening.debit,
          openingCredit: opening.credit,
          mutasiDebit: mut.debit,
          mutasiCredit: mut.credit,
          adjDebit: adj.debit,
          adjCredit: adj.credit,
        },
      ]
    })
  )

  function toSignedRow(coaNode, raw) {
    const saldoAwal = netForAccount(coaNode, raw.openingDebit, raw.openingCredit)
    const neracaSaldo = netForAccount(coaNode, raw.openingDebit + raw.mutasiDebit, raw.openingCredit + raw.mutasiCredit)
    const neracaDisesuaikan = netForAccount(
      coaNode,
      raw.openingDebit + raw.mutasiDebit + raw.adjDebit,
      raw.openingCredit + raw.mutasiCredit + raw.adjCredit
    )
    return {
      coa: coaNode,
      saldoAwal,
      debitMutasi: raw.mutasiDebit,
      creditMutasi: raw.mutasiCredit,
      neracaSaldo,
      debitDisesuaikan: raw.adjDebit,
      creditDisesuaikan: raw.adjCredit,
      neracaDisesuaikan,
      // saldoAkhir kept as an alias of the final adjusted balance for callers
      // that only care about "the" closing figure (e.g. Posisi Keuangan).
      saldoAkhir: neracaDisesuaikan,
    }
  }

  const leafRows = coa.filter((c) => !c.is_group).map((acc) => toSignedRow(acc, rawByCoaId.get(acc.id)))

  function rollupRaw(node) {
    if (!node.children || !node.children.length) {
      return { node, raw: rawByCoaId.get(node.id) || { openingDebit: 0, openingCredit: 0, mutasiDebit: 0, mutasiCredit: 0, adjDebit: 0, adjCredit: 0 } }
    }
    const childResults = node.children.map(rollupRaw)
    const raw = childResults.reduce(
      (acc, c) => ({
        openingDebit: acc.openingDebit + c.raw.openingDebit,
        openingCredit: acc.openingCredit + c.raw.openingCredit,
        mutasiDebit: acc.mutasiDebit + c.raw.mutasiDebit,
        mutasiCredit: acc.mutasiCredit + c.raw.mutasiCredit,
        adjDebit: acc.adjDebit + c.raw.adjDebit,
        adjCredit: acc.adjCredit + c.raw.adjCredit,
      }),
      { openingDebit: 0, openingCredit: 0, mutasiDebit: 0, mutasiCredit: 0, adjDebit: 0, adjCredit: 0 }
    )
    return { node, raw, childResults }
  }

  function toTree({ node, raw, childResults }) {
    const row = toSignedRow(node, raw)
    return childResults ? { ...row, children: childResults.map(toTree) } : row
  }

  const tree = buildCoaTree().map((root) => toTree(rollupRaw(root)))

  const isClosed = closingPeriods.some((cp) => nodeIds.includes(cp.org_node_id) && cp.period_year === year && cp.period_month === month && cp.status === 'closed')

  // Validation rows — the fundamental accounting identity Aset = Kewajiban + Saldo
  // Dana + Penerimaan − Penyaluran always holds for a balanced ledger (revenue and
  // expense are "unclosed" changes in net assets), so both sides are built from the
  // same rolled-up root totals rather than assuming a separate closing-to-equity step.
  const rootByType = (type, field) => tree.filter((t) => t.coa.account_type === type).reduce((s, t) => s + t[field], 0)

  const assetOpening = rootByType('asset', 'saldoAwal')
  const liabFundOpening =
    rootByType('liability', 'saldoAwal') + rootByType('fund_balance', 'saldoAwal') + rootByType('revenue', 'saldoAwal') - rootByType('expense', 'saldoAwal')
  const assetFinal = rootByType('asset', 'neracaDisesuaikan')
  const liabFundFinal =
    rootByType('liability', 'neracaDisesuaikan') + rootByType('fund_balance', 'neracaDisesuaikan') + rootByType('revenue', 'neracaDisesuaikan') - rootByType('expense', 'neracaDisesuaikan')
  const totalDebitMutasi = leafRows.reduce((s, r) => s + r.debitMutasi, 0)
  const totalCreditMutasi = leafRows.reduce((s, r) => s + r.creditMutasi, 0)
  const totalDebitAdj = leafRows.reduce((s, r) => s + r.debitDisesuaikan, 0)
  const totalCreditAdj = leafRows.reduce((s, r) => s + r.creditDisesuaikan, 0)

  return {
    tree,
    leafRows,
    isClosed,
    validations: {
      openingBalance: { a: assetOpening, b: liabFundOpening, diff: assetOpening - liabFundOpening },
      mutasi: { a: totalDebitMutasi, b: totalCreditMutasi, diff: totalDebitMutasi - totalCreditMutasi },
      penyesuaian: { a: totalDebitAdj, b: totalCreditAdj, diff: totalDebitAdj - totalCreditAdj },
      closingBalance: { a: assetFinal, b: liabFundFinal, diff: assetFinal - liabFundFinal },
    },
  }
}

function filterJournalItemsBeforePeriod(nodeIds, year, month) {
  const elim = eliminationJournalIds(nodeIds)
  const journalById = new Map(journals.map((j) => [j.id, j]))
  const k = periodKey(year, month)
  return journalItems.filter((ji) => {
    if (!nodeIds.includes(ji.org_node_id)) return false
    if (elim.has(ji.journal_id)) return false
    const j = journalById.get(ji.journal_id)
    if (!j || !j.is_posted) return false
    return periodKey(j.period_year, j.period_month) < k
  })
}

// ---------------------------------------------------------------------------
// Laporan Posisi Keuangan (ISAK 35 / PSAK 109) — cumulative as of end of period
// ---------------------------------------------------------------------------
export function computeLaporanPosisiKeuangan({ nodeId, consolidated = false, year, month }) {
  const nodeIds = resolveScopeNodeIds(nodeId, consolidated)
  const upTo = filterJournalItemsUpTo(nodeIds, year, month)
  const byCoa = sumByCoa(upTo)
  const fundClassTotals = fundClassTotalsFromItems(upTo)
  return buildPosisiKeuangan(byCoa, fundClassTotals)
}

// Saldo Dana (Net Assets) is never "closed" into the equity accounts (30/31/32)
// except via the opening-balance and Hak Amil reallocation entries — most of it
// lives as unclosed cumulative Revenue−Expense per fund. This mirrors real interim
// PSAK 45/109 reporting: officially closed net assets + current period's running
// change. So Saldo Dana must be computed the same way for every report that needs
// it (this function), not read directly off coa 30/31/32.
function fundClassTotalsFromItems(items) {
  const totals = { unrestricted: 0, temporarily_restricted: 0, restricted: 0 }
  for (const ji of items) {
    if (!ji.fund_id) continue
    const acc = getCoaById(ji.coa_id)
    if (!acc || !['revenue', 'expense', 'fund_balance'].includes(acc.account_type)) continue
    const fund = funds.find((f) => f.id === ji.fund_id)
    if (!fund) continue
    totals[fund.fund_type] += ji.credit - ji.debit
  }
  return totals
}

function filterJournalItemsUpTo(nodeIds, year, month) {
  const elim = eliminationJournalIds(nodeIds)
  const journalById = new Map(journals.map((j) => [j.id, j]))
  const k = periodKey(year, month)
  return journalItems.filter((ji) => {
    if (!nodeIds.includes(ji.org_node_id)) return false
    if (elim.has(ji.journal_id)) return false
    const j = journalById.get(ji.journal_id)
    if (!j || !j.is_posted) return false
    return periodKey(j.period_year, j.period_month) <= k
  })
}

function buildPosisiKeuangan(byCoa, fundClassTotals) {
  const bal = (coaId) => {
    const acc = getCoaById(coaId)
    const v = byCoa.get(coaId) || { debit: 0, credit: 0 }
    return netForAccount(acc, v.debit, v.credit)
  }
  const kasKecil = [1001, 1002, 1003, 1004].reduce((s, id) => s + bal(id), 0)
  const bank = [1010, 1011, 1012, 1013, 1014, 1015, 1016].reduce((s, id) => s + bal(id), 0)
  const piutang = bal(1020)
  const asetTetapBruto = bal(110)
  const akumPenyusutan = bal(111) // credit-normal balance, magnitude of accumulated depreciation
  const asetTetapNeto = asetTetapBruto - akumPenyusutan
  const totalAsetLancar = kasKecil + bank + piutang
  const totalAsetTidakLancar = asetTetapNeto
  const totalAset = totalAsetLancar + totalAsetTidakLancar

  const utangVendor = bal(200)
  const titipanPihakKetiga = bal(201)
  const totalKewajiban = utangVendor + titipanPihakKetiga

  const danaTidakTerikat = fundClassTotals.unrestricted
  const danaTerikatSementara = fundClassTotals.temporarily_restricted
  const danaTerikatPermanen = fundClassTotals.restricted
  const totalSaldoDana = danaTidakTerikat + danaTerikatSementara + danaTerikatPermanen

  return {
    aset: { kasKecil, bank, piutang, totalAsetLancar, asetTetapBruto, akumPenyusutan, asetTetapNeto, totalAsetTidakLancar, totalAset },
    kewajiban: { utangVendor, titipanPihakKetiga, totalKewajiban },
    saldoDana: { danaTidakTerikat, danaTerikatSementara, danaTerikatPermanen, totalSaldoDana },
    totalPassiva: totalKewajiban + totalSaldoDana,
    balanced: Math.round(totalAset) === Math.round(totalKewajiban + totalSaldoDana),
  }
}

// ---------------------------------------------------------------------------
// Laporan Aktivitas (Statement of Activities) — period range, per fund class
// ---------------------------------------------------------------------------
const FUND_CLASS = { unrestricted: 'tidak_terikat', temporarily_restricted: 'terikat_sementara', restricted: 'terikat_permanen' }

export function computeLaporanAktivitas({ nodeId, consolidated = false, yFrom, mFrom, yTo, mTo }) {
  const nodeIds = resolveScopeNodeIds(nodeId, consolidated)
  const items = filterJournalItems({ nodeIds, yFrom, mFrom, yTo, mTo })

  const classes = ['tidak_terikat', 'terikat_sementara', 'terikat_permanen']
  const result = {}
  for (const cls of classes) result[cls] = { penerimaan: 0, penyaluran: 0 }
  let penerimaanTanpaFund = 0
  let penyaluranTanpaFund = 0

  for (const ji of items) {
    const acc = getCoaById(ji.coa_id)
    if (!acc) continue
    if (acc.account_type === 'revenue') {
      const fund = ji.fund_id ? funds.find((f) => f.id === ji.fund_id) : null
      const cls = fund ? FUND_CLASS[fund.fund_type] : null
      const net = ji.credit - ji.debit
      if (cls) result[cls].penerimaan += net
      else penerimaanTanpaFund += net
    } else if (acc.account_type === 'expense') {
      const fund = ji.fund_id ? funds.find((f) => f.id === ji.fund_id) : null
      const cls = fund ? FUND_CLASS[fund.fund_type] : null
      const net = ji.debit - ji.credit
      if (cls) result[cls].penyaluran += net
      else penyaluranTanpaFund += net
    } else if (acc.account_type === 'fund_balance') {
      // inter-fund reallocation (e.g. Hak Amil) — treat as reclassification, not revenue/expense
      const fund = ji.fund_id ? funds.find((f) => f.id === ji.fund_id) : null
      const cls = fund ? FUND_CLASS[fund.fund_type] : null
      const net = ji.credit - ji.debit
      if (cls) {
        result[cls].reklasifikasi = (result[cls].reklasifikasi || 0) + net
      }
    }
  }

  for (const cls of classes) {
    const r = result[cls]
    r.perubahanBersih = r.penerimaan - r.penyaluran + (r.reklasifikasi || 0)
  }

  return {
    byClass: result,
    penerimaanTanpaFund,
    penyaluranTanpaFund,
    totalPenerimaan: classes.reduce((s, c) => s + result[c].penerimaan, 0) + penerimaanTanpaFund,
    totalPenyaluran: classes.reduce((s, c) => s + result[c].penyaluran, 0) + penyaluranTanpaFund,
    totalPerubahanBersih: classes.reduce((s, c) => s + result[c].perubahanBersih, 0) + penerimaanTanpaFund - penyaluranTanpaFund,
  }
}

// ---------------------------------------------------------------------------
// Laporan Dana Terikat & Tidak Terikat — saldo per fund
// ---------------------------------------------------------------------------
export function computeSaldoDanaPerFund({ nodeId, consolidated = false, year, month }) {
  const nodeIds = resolveScopeNodeIds(nodeId, consolidated)
  const items = filterJournalItemsUpTo(nodeIds, year, month)
  const rows = funds.map((fund) => {
    const fundItems = items.filter((ji) => ji.fund_id === fund.id)
    let saldo = 0
    let penerimaan = 0
    let penyaluran = 0
    for (const ji of fundItems) {
      const acc = getCoaById(ji.coa_id)
      if (!acc) continue
      if (['revenue', 'expense', 'fund_balance'].includes(acc.account_type)) {
        saldo += ji.credit - ji.debit
      }
      if (acc.account_type === 'revenue') penerimaan += ji.credit - ji.debit
      if (acc.account_type === 'expense') penyaluran += ji.debit - ji.credit
    }
    return { fund, saldo, penerimaan, penyaluran, label: FUND_TYPE_LABEL[fund.fund_type] }
  })
  return {
    rows,
    totalByType: {
      unrestricted: rows.filter((r) => r.fund.fund_type === 'unrestricted').reduce((s, r) => s + r.saldo, 0),
      temporarily_restricted: rows.filter((r) => r.fund.fund_type === 'temporarily_restricted').reduce((s, r) => s + r.saldo, 0),
      restricted: rows.filter((r) => r.fund.fund_type === 'restricted').reduce((s, r) => s + r.saldo, 0),
    },
  }
}

// ---------------------------------------------------------------------------
// Laporan Arus Kas — sederhana (langsung), berdasarkan mutasi kas/bank
// ---------------------------------------------------------------------------
const CASH_COA_IDS = [1001, 1002, 1003, 1004, 1010, 1011, 1012, 1013, 1014, 1015, 1016]

export function computeArusKas({ nodeId, consolidated = false, yFrom, mFrom, yTo, mTo }) {
  const nodeIds = resolveScopeNodeIds(nodeId, consolidated)
  const items = filterJournalItems({ nodeIds, yFrom, mFrom, yTo, mTo })

  let penerimaanDonasi = 0
  let penyaluranProgram = 0
  let opex = 0
  let caNet = 0
  let internodeNet = 0
  let asetInvestasi = 0

  const journalById = new Map(journals.map((j) => [j.id, j]))
  for (const ji of items) {
    if (!CASH_COA_IDS.includes(ji.coa_id)) continue
    const j = journalById.get(ji.journal_id)
    const net = ji.debit - ji.credit // + = cash in, - = cash out
    switch (j?.journal_type) {
      case 'penerimaan':
        penerimaanDonasi += net
        break
      case 'pengeluaran': {
        // distinguish distribution vs opex vs CA by looking at sibling line's account
        const siblings = journalItems.filter((s) => s.journal_id === ji.journal_id && s.id !== ji.id)
        const other = siblings[0]
        const otherAcc = other ? getCoaById(other.coa_id) : null
        if (otherAcc?.coa_path?.startsWith('/5/50') || otherAcc?.coa_path?.startsWith('/5/51')) penyaluranProgram += net
        else if (otherAcc?.id === 1020) caNet += net
        else opex += net
        break
      }
      case 'internode':
        internodeNet += net
        break
      case 'penyesuaian':
        break
      default:
        asetInvestasi += net
    }
  }

  const totalOperasional = penerimaanDonasi + penyaluranProgram + opex + caNet
  return {
    penerimaanDonasi,
    penyaluranProgram,
    opex,
    caNet,
    totalOperasional,
    internodeNet,
    asetInvestasi,
    kenaikanBersihKas: totalOperasional + internodeNet + asetInvestasi,
  }
}

// ---------------------------------------------------------------------------
// Monthly trend (Penerimaan vs Penyaluran) — for dashboard & cash-flow charts
// ---------------------------------------------------------------------------
export function computeMonthlyTrend({ nodeId, consolidated = false, yFrom, mFrom, yTo, mTo }) {
  const nodeIds = resolveScopeNodeIds(nodeId, consolidated)
  const months = []
  let y = yFrom
  let m = mFrom
  while (y < yTo || (y === yTo && m <= mTo)) {
    months.push({ year: y, month: m })
    m++
    if (m > 12) { m = 1; y++ }
  }
  return months.map(({ year, month }) => {
    const items = filterJournalItems({ nodeIds, yFrom: year, mFrom: month, yTo: year, mTo: month })
    let penerimaan = 0
    let penyaluran = 0
    for (const ji of items) {
      const acc = getCoaById(ji.coa_id)
      if (acc?.account_type === 'revenue') penerimaan += ji.credit - ji.debit
      if (acc?.account_type === 'expense') penyaluran += ji.debit - ji.credit
    }
    return { year, month, penerimaan, penyaluran, net: penerimaan - penyaluran }
  })
}

// ---------------------------------------------------------------------------
// Consolidation: per-node breakdown for RPT-K reports
// ---------------------------------------------------------------------------
export function computeByNodeBreakdown({ nodeId, year, month }) {
  const childIds = resolveScopeNodeIds(nodeId, true)
  return childIds
    .map((id) => {
      const node = orgNodes.find((n) => n.id === id)
      const items = filterJournalItems({ nodeIds: [id], yFrom: year, mFrom: month, yTo: year, mTo: month })
      let penerimaan = 0
      let penyaluran = 0
      for (const ji of items) {
        const acc = getCoaById(ji.coa_id)
        if (acc?.account_type === 'revenue') penerimaan += ji.credit - ji.debit
        if (acc?.account_type === 'expense') penyaluran += ji.debit - ji.credit
      }
      return { node, penerimaan, penyaluran, saldo: penerimaan - penyaluran }
    })
    .filter((r) => r.node)
}
