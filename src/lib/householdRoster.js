import { sharesForBill } from './billsSplit'

export function defaultMembersSeed(isDemo, username) {
  if (isDemo) return ['Demo user', 'Alex', 'Jordan']
  const u = String(username || '').trim()
  return u ? [u] : []
}

/** Logged-in user always first; unique names; trimmed. */
export function normalizeRosterMemberList(raw, currentUsername) {
  const u = String(currentUsername || '').trim()
  const seen = new Set()
  const rest = []
  for (const x of Array.isArray(raw) ? raw : []) {
    const n = String(x).trim()
    if (!n || seen.has(n)) continue
    seen.add(n)
    if (n !== u) rest.push(n)
  }
  if (u) return [u, ...rest]
  return rest
}

function safeParseArray(key) {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (raw == null) return []
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p : []
  } catch {
    return []
  }
}

/** Whether removing `name` would orphan chores or bills (including split participants). */
export function memberIsInUse(name, choresStorageKey, billsStorageKey, roster) {
  const chores = safeParseArray(choresStorageKey)
  for (const c of chores) {
    if (c && typeof c === 'object' && c.assignee === name) return true
  }

  const billsRaw = safeParseArray(billsStorageKey)
  for (const b of billsRaw) {
    if (!b || typeof b !== 'object') continue
    if (b.payer === name) return true
    const bill = {
      splitType: b.splitType,
      participantsCount: b.participantsCount,
      splitNotes: b.splitNotes,
      amount: b.amount,
    }
    for (const { name: n } of sharesForBill(bill, roster)) {
      if (n === name) return true
    }
  }
  return false
}

export function canRemoveHouseholdMember(name, currentUsername, roster, choresKey, billsKey) {
  if (!name || name === currentUsername) return false
  if (!roster.includes(name)) return false
  return !memberIsInUse(name, choresKey, billsKey, roster)
}

/** True if the roster includes anyone other than the current user (case-insensitive). */
export function hasOtherHouseholdMembers(roster, currentUsername) {
  const u = String(currentUsername || '').trim().toLowerCase()
  if (!u) return false
  return roster.some((m) => String(m).trim().toLowerCase() !== u)
}
