import { normalizeHouseholdMeta } from './householdMeta'
import { normalizeRosterMemberList } from './householdRoster'

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */
export async function ensureHouseholdForUser(supabase, userId) {
  // .maybeSingle() errors if >1 row; same user can end up with multiple rows (e.g. double bootstrap).
  const { data: existing, error: selErr } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', userId)
    .order('household_id', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (selErr) throw selErr
  if (existing?.household_id) return existing.household_id

  // Do not use insert().select() on households: RLS select requires membership before the member row exists.
  const { data: hid, error: rpcErr } = await supabase.rpc('create_household_as_owner')
  if (rpcErr) {
    const hint =
      /households|create_household_as_owner|function.*does not exist|42883/i.test(String(rpcErr.message || rpcErr))
        ? ' In Supabase SQL Editor, run supabase/migrations/20260406000000_initial_profiles_households.sql (full schema).'
        : ''
    throw new Error(`${rpcErr.message || rpcErr}${hint}`)
  }
  if (hid == null || hid === '') throw new Error('create_household_as_owner returned no id')
  return hid
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} username
 * @returns {Promise<{ id: string, username: string } | null>}
 */
export async function lookupProfileByUsername(supabase, username) {
  const { data, error } = await supabase.rpc('profile_lookup_by_username', {
    lookup: String(username || '').trim(),
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.id) return null
  return { id: row.id, username: row.username }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} householdId
 * @param {string} currentUsername
 */
export async function loadHouseholdBundle(supabase, householdId, currentUsername) {
  const { data: rows, error } = await supabase
    .from('household_members')
    .select('user_id, role')
    .eq('household_id', householdId)

  if (error) throw error
  const list = Array.isArray(rows) ? rows : []
  if (list.length === 0) {
    return {
      members: normalizeRosterMemberList([], currentUsername),
      householdMeta: normalizeHouseholdMeta({ owner: '', admins: [] }),
    }
  }

  const ids = list.map((r) => r.user_id)
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, username').in('id', ids)
  if (pErr) throw pErr
  const byId = new Map((profiles || []).map((p) => [p.id, p.username]))

  const enriched = list.map((r) => ({
    userId: r.user_id,
    role: r.role,
    username: byId.get(r.user_id) || '',
  }))

  const ownerRow = enriched.find((x) => x.role === 'owner')
  const ownerName = ownerRow?.username ? String(ownerRow.username).trim() : ''
  const admins = enriched.filter((x) => x.role === 'admin').map((x) => String(x.username).trim())

  const usernames = enriched.map((x) => String(x.username).trim()).filter(Boolean)
  const members = normalizeRosterMemberList(usernames, currentUsername)

  return {
    members,
    householdMeta: normalizeHouseholdMeta({ owner: ownerName, admins }),
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} householdId
 * @param {string} targetUserId
 */
export async function addHouseholdMember(supabase, householdId, targetUserId) {
  const { error } = await supabase.from('household_members').insert({
    household_id: householdId,
    user_id: targetUserId,
    role: 'member',
  })
  if (error) throw error
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} householdId
 * @param {string} targetUserId
 */
export async function removeHouseholdMember(supabase, householdId, targetUserId) {
  const { error } = await supabase.from('household_members').delete().eq('household_id', householdId).eq('user_id', targetUserId)
  if (error) throw error
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} householdId
 * @param {string} targetUserId
 * @param {'admin' | 'member'} role
 */
export async function setMemberRole(supabase, householdId, targetUserId, role) {
  const { error } = await supabase.from('household_members').update({ role }).eq('household_id', householdId).eq('user_id', targetUserId)
  if (error) throw error
}

/**
 * Remove the current user from this household (account unchanged). If they are the owner
 * and others remain, promote another member to owner first.
 */
export async function leaveHouseholdAsUser(
  supabase,
  householdId,
  currentUserId,
  currentUsername,
  memberUsernames,
  householdMetaPlain,
) {
  const meta = normalizeHouseholdMeta(householdMetaPlain)
  const u = String(currentUsername || '').trim().toLowerCase()
  const others = (memberUsernames || []).filter((m) => String(m).trim().toLowerCase() !== u)
  const isOwner = meta.owner && String(meta.owner).trim().toLowerCase() === u

  if (isOwner && others.length > 0) {
    const nextProf = await lookupProfileByUsername(supabase, others[0])
    if (nextProf) {
      await setMemberRole(supabase, householdId, nextProf.id, 'owner')
    }
  }

  await removeHouseholdMember(supabase, householdId, currentUserId)
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {import('@supabase/supabase-js').User} user
 * @returns {Promise<string>} canonical username
 */
export async function ensureProfileForAuthUser(supabase, user) {
  const { data: row, error: selErr } = await supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
  if (selErr) throw selErr
  if (row?.username) return String(row.username).trim()

  const fromMeta = typeof user.user_metadata?.username === 'string' ? user.user_metadata.username.trim() : ''
  const fallback = user.email?.split('@')[0]?.trim() || 'User'
  const username = fromMeta || fallback

  const { error: insErr } = await supabase.from('profiles').insert({ id: user.id, username })
  if (insErr) throw insErr
  return username
}
