/** Start of local calendar day. */
export function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfDay(d) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/**
 * Best-effort parse of free-text bill due fields into a comparable Date (end of that day).
 * Returns null when unknown / anytime / invalid.
 */
export function parseBillDueDate(dueRaw, now = new Date()) {
  const s = String(dueRaw ?? '').trim()
  if (!s) return null
  if (/^anytime$/i.test(s)) return null

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    const y = Number(iso[1])
    const mo = Number(iso[2]) - 1
    const day = Number(iso[3])
    const d = new Date(y, mo, day, 23, 59, 59, 999)
    return Number.isNaN(d.getTime()) ? null : d
  }

  const parsed = Date.parse(s)
  if (!Number.isNaN(parsed)) return new Date(parsed)

  const lower = s.toLowerCase()
  if (lower === 'today') return endOfDay(now)
  if (lower === 'tomorrow') return endOfDay(addDays(now, 1))

  let m = s.match(/\bin\s+(\d+)\s*days?\b/i)
  if (m) return endOfDay(addDays(now, Number(m[1])))

  m = s.match(/\bin\s+(\d+)\s*weeks?\b/i)
  if (m) return endOfDay(addDays(now, Number(m[1]) * 7))

  m = s.match(/\bin\s+(\d+)\s*months?\b/i)
  if (m) return endOfDay(addDays(now, Number(m[1]) * 30))

  if (/\bnext\s+week\b/i.test(s)) return endOfDay(addDays(now, 7))

  return null
}

/** Bills with a parsed due on or after start of today, earliest first. */
export function upcomingBillsSorted(bills, now = new Date()) {
  const t0 = startOfDay(now)
  return bills
    .map((b) => ({ bill: b, date: parseBillDueDate(b.due, now) }))
    .filter((x) => x.date && x.date >= t0)
    .sort((a, b) => a.date - b.date)
    .map((x) => x.bill)
}
