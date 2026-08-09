const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]
const MONTHS_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

export function formatCurrency(value, { compact = false, sign = false } = {}) {
  const num = Number(value) || 0
  if (compact) {
    const abs = Math.abs(num)
    let str
    if (abs >= 1_000_000_000) str = `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} M`
    else if (abs >= 1_000_000) str = `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')} Jt`
    else if (abs >= 1_000) str = `${(num / 1_000).toFixed(1).replace(/\.0$/, '')} Rb`
    else str = num.toFixed(0)
    return `Rp ${str}`
  }
  const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num)
  const prefix = sign && num > 0 ? '+' : ''
  return `${prefix}Rp ${formatted}`
}

export function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(Number(value) || 0)
}

export function formatDate(dateStr, { withTime = false } = {}) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '-'
  const day = String(d.getDate()).padStart(2, '0')
  const month = MONTHS_SHORT_ID[d.getMonth()]
  const year = d.getFullYear()
  let out = `${day} ${month} ${year}`
  if (withTime) {
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    out += ` ${h}:${m}`
  }
  return out
}

export function formatMonthLabel(year, month) {
  return `${MONTHS_ID[month - 1]} ${year}`
}

export function formatMonthShort(year, month) {
  return `${MONTHS_SHORT_ID[month - 1]} '${String(year).slice(2)}`
}

export function timeAgo(dateStr) {
  const d = new Date(dateStr)
  const diffMs = Date.now() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour} jam lalu`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 30) return `${diffDay} hari lalu`
  return formatDate(dateStr)
}

export { MONTHS_ID, MONTHS_SHORT_ID }
