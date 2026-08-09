import { makeRng } from './rng'
import { funds } from './funds'
import { programs } from './programs'
import { donations, distributions } from './generator'

const rng = makeRng(9090)

function monthsInRange(startStr, endStr) {
  const start = new Date(startStr)
  const end = endStr ? new Date(endStr) : new Date(2026, 11, 31)
  const out = []
  let y = start.getFullYear()
  let m = start.getMonth() + 1
  while (y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth() + 1)) {
    if (y < 2027) out.push({ year: y, month: m })
    m++
    if (m > 12) { m = 1; y++ }
    if (y > 2026) break
  }
  return out
}

function avgMonthlyActual(list, matchFn) {
  const byMonth = new Map()
  for (const item of list) {
    if (!matchFn(item)) continue
    const key = item.donation_date ? item.donation_date.slice(0, 7) : item.dist_date.slice(0, 7)
    byMonth.set(key, (byMonth.get(key) || 0) + item.amount)
  }
  const vals = Array.from(byMonth.values())
  if (!vals.length) return 0
  return vals.reduce((s, v) => s + v, 0) / vals.length
}

let _id = 0
const nextId = () => ++_id
const budgets = []

// ---- Revenue-side RAPB (target penerimaan per fund, 2026) ----
const REVENUE_FUND_IDS = [1, 3, 4, 5, 6]
for (const fundId of REVENUE_FUND_IDS) {
  const fund = funds.find((f) => f.id === fundId)
  const avg = avgMonthlyActual(donations, (d) => d.fund_id === fundId && d.status === 'posted')
  const baseTarget = avg > 0 ? avg * (0.85 + rng.float() * 0.3) : 50_000_000
  for (let m = 1; m <= 12; m++) {
    const seasonality = fundId === 1 && (m === 2 || m === 3) ? 1.6 : fundId === 4 && m === 12 ? 1.3 : 1
    budgets.push({
      id: nextId(),
      org_node_id: 1,
      budget_kind: 'penerimaan',
      coa_id: null,
      fund_id: fundId,
      program_id: null,
      cost_center_id: null,
      period_year: 2026,
      period_month: m,
      amount: Math.round((baseTarget * seasonality) / 500000) * 500000,
      version: 1,
      lock_mode: fund.hard_lock ? 'hard' : 'soft',
      notes: `Target penerimaan ${fund.fund_name} 2026`,
      created_by: 2,
    })
  }
}

// ---- Program-side RAPB (target penyaluran per program, spread across active period) ----
for (const program of programs) {
  const months = monthsInRange(program.period_start, program.period_end)
  if (!months.length) continue
  const perMonth = Math.round(program.target_amount / months.length / 100000) * 100000
  months.forEach(({ year, month }, idx) => {
    budgets.push({
      id: nextId(),
      org_node_id: program.org_node_id,
      budget_kind: 'penyaluran',
      coa_id: null,
      fund_id: program.fund_id,
      program_id: program.id,
      cost_center_id: program.cost_center_id,
      period_year: year,
      period_month: month,
      amount: perMonth,
      version: idx > 8 ? 2 : 1,
      lock_mode: 'hard',
      notes: `Target penyaluran ${program.program_name}`,
      created_by: 2,
    })
  })
}

export { budgets }

export function getBudgetsForPeriod(year, month, kind) {
  return budgets.filter((b) => b.period_year === year && b.period_month === month && (!kind || b.budget_kind === kind))
}

export function getActualForBudget(budget) {
  if (budget.budget_kind === 'penerimaan') {
    return donations
      .filter((d) => d.status === 'posted' && d.fund_id === budget.fund_id && d.donation_date.startsWith(`${budget.period_year}-${String(budget.period_month).padStart(2, '0')}`))
      .reduce((s, d) => s + d.amount, 0)
  }
  return distributions
    .filter((d) => d.status === 'posted' && d.program_id === budget.program_id && d.dist_date.startsWith(`${budget.period_year}-${String(budget.period_month).padStart(2, '0')}`))
    .reduce((s, d) => s + d.amount, 0)
}
