/**
 * Parsed custom split segments (percent or share weights). Mixed formats invalid.
 * @returns {{ name: string, w: number, pct: boolean }[] | null}
 */
export function parseCustomSplitItems(notes) {
  const segments = String(notes || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (!segments.length) return null

  const items = []
  for (const seg of segments) {
    const pctMatch = seg.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*%$/i)
    if (pctMatch) {
      items.push({ name: pctMatch[1].trim(), w: parseFloat(pctMatch[2]), pct: true })
      continue
    }
    const shareMatch = seg.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/)
    if (shareMatch) {
      items.push({ name: shareMatch[1].trim(), w: parseFloat(shareMatch[2]), pct: false })
    }
  }
  if (!items.length) return null
  const allPct = items.every((i) => i.pct)
  const allShare = items.every((i) => !i.pct)
  if (!allPct && !allShare) return null
  const sum = items.reduce((s, i) => s + i.w, 0)
  if (!(sum > 0)) return null
  return items
}

/** Custom: "Name 50%, Name2 30%" (percentages) or "Name 2, Name2 1" (ratio shares). Mixed formats invalid. */
export function parseCustomSplit(notes, totalAmount) {
  const items = parseCustomSplitItems(notes)
  if (!items) return null
  const sum = items.reduce((s, i) => s + i.w, 0)
  return items.map((i) => ({ name: i.name, share: totalAmount * (i.w / sum) }))
}

/** Split `amount` evenly across `roster` (every member gets a share; cents distributed without drift). */
export function evenSplitAmongRoster(amount, roster) {
  const list = Array.isArray(roster) && roster.length ? roster : []
  if (!list.length) return []
  const cents = Math.round(Number(amount) * 100)
  if (!Number.isFinite(cents) || cents < 0) {
    return list.map((name) => ({ name, share: 0 }))
  }
  const n = list.length
  const base = Math.floor(cents / n)
  const rem = cents - base * n
  return list.map((name, i) => ({
    name,
    share: (base + (i < rem ? 1 : 0)) / 100,
  }))
}

/** Serialize percent rows for storage (must sum to 100 for UI validation). */
export function formatCustomSplitPercents(rows) {
  const parts = []
  for (const { member, percent } of rows) {
    const name = typeof member === 'string' ? member.trim() : ''
    const p = typeof percent === 'number' ? percent : parseFloat(String(percent))
    if (!name || !Number.isFinite(p)) continue
    const rounded = Math.round(p * 100) / 100
    parts.push(`${name} ${rounded}%`)
  }
  return parts.join(', ')
}

/**
 * @param {object} b - bill with splitType, participantsCount, splitNotes, amount
 * @param {string[]} roster - household members (order preserved)
 */
export function sharesForBill(b, roster) {
  const amount = b.amount
  const list = Array.isArray(roster) && roster.length ? roster : ['']
  if (b.splitType === 'custom') {
    const parsed = parseCustomSplit(b.splitNotes, amount)
    if (parsed?.length) return parsed
    const n = Math.min(Math.max(1, Number(b.participantsCount) || 3), list.length)
    const per = amount / n
    return list.slice(0, n).map((name) => ({ name, share: per }))
  }
  return evenSplitAmongRoster(amount, list)
}
