/**
 * Older builds used one shared `*.v1.household` bucket for every signed-in user on this
 * browser, which made new accounts see the same roster. We now use per-username keys.
 *
 * One-time-style migration: if shared household members included this username and this
 * account has no user-scoped data yet, copy shared household keys into that user’s keys.
 * Users who were never on the shared roster do not get a copy (new/independent household).
 */

const SHARED = '.household'

const STORAGE_PAIRS = [
  ['chores', 'slmvp.chores.v1'],
  ['bills', 'slmvp.bills.v1'],
  ['rules', 'slmvp.rules.v1'],
  ['members', 'slmvp.members.v1'],
  ['householdMeta', 'slmvp.household.meta.v1'],
]

function parseMembersJson(raw) {
  if (raw == null) return null
  try {
    const p = JSON.parse(raw)
    return Array.isArray(p) ? p : null
  } catch {
    return null
  }
}

function rosterIncludesUsername(membersArray, username) {
  const u = String(username || '').trim().toLowerCase()
  if (!u) return false
  return membersArray.some((x) => String(x).trim().toLowerCase() === u)
}

/**
 * Call once after local sign-in (non-demo). Idempotent for users who already have scoped data.
 */
export function migrateSharedHouseholdIntoUserScopeIfMember(username) {
  if (typeof window === 'undefined') return
  const u = String(username || '').trim()
  if (!u) return
  const userSuffix = `.user.${encodeURIComponent(u)}`

  const sharedMembersKey = `slmvp.members.v1${SHARED}`
  const userMembersKey = `slmvp.members.v1${userSuffix}`

  try {
    if (window.localStorage.getItem(userMembersKey) != null) return

    const sharedRaw = window.localStorage.getItem(sharedMembersKey)
    const sharedMembers = parseMembersJson(sharedRaw)
    if (!sharedMembers || !rosterIncludesUsername(sharedMembers, u)) return

    for (const [, prefix] of STORAGE_PAIRS) {
      const fromKey = `${prefix}${SHARED}`
      const toKey = `${prefix}${userSuffix}`
      if (window.localStorage.getItem(toKey) != null) continue
      const raw = window.localStorage.getItem(fromKey)
      if (raw == null) continue
      window.localStorage.setItem(toKey, raw)
    }
  } catch {
    // ignore quota / private mode
  }
}
