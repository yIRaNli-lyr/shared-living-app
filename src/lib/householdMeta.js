/**
 * Shared household roles (localStorage). Owner is set once when metadata is first created.
 */

export function normalizeHouseholdMeta(input) {
  const owner = typeof input?.owner === 'string' ? input.owner.trim() : ''
  const admins = Array.isArray(input?.admins)
    ? [...new Set(input.admins.map((a) => String(a).trim()).filter(Boolean))]
    : []
  return { owner, admins }
}

/** Stub for demo sessions (Demo user is the only “owner” in demo UI). */
export function demoHouseholdMeta() {
  return { owner: 'Demo user', admins: [] }
}

/**
 * Role-only check: may this actor remove this target from the roster (before chore/bill guards)?
 * - No one may remove the owner.
 * - No one may remove themselves here (handled separately).
 * - Owner may remove any non-owner (if data allows).
 * - Admins may remove members who are not owner and not admin.
 * - Members cannot remove others.
 */
export function canActorDeleteHouseholdMember(actor, target, meta) {
  const a = String(actor || '').trim()
  const t = String(target || '').trim()
  if (!a || !t || a === t) return false

  const { owner, admins } = normalizeHouseholdMeta(meta)
  if (!owner || t === owner) return false

  const adminSet = new Set(admins)
  if (a === owner) return true
  if (adminSet.has(a)) {
    if (adminSet.has(t)) return false
    return true
  }
  return false
}

export function memberRoleLabel(name, meta) {
  const n = String(name || '').trim()
  const { owner, admins } = normalizeHouseholdMeta(meta)
  if (n && n === owner) return 'owner'
  if (admins.includes(n)) return 'admin'
  return 'member'
}

/**
 * One-time owner when metadata is missing: deterministic so a shared browser doesn’t flip owner per login.
 */
export function initialOwnerFromRoster(roster) {
  const list = Array.isArray(roster)
    ? [...new Set(roster.map((x) => String(x).trim()).filter(Boolean))]
    : []
  if (list.length === 0) return ''
  return [...list].sort((x, y) => x.localeCompare(y, undefined, { sensitivity: 'base' }))[0]
}
