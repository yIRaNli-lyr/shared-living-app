/** Device-local “accounts” only — never synced. Cross-device login requires Supabase Auth (see AuthPage + .env.example). */
export const AUTH_USERS_KEY = 'slmvp.auth.users'

export function loadAuthUsers() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(AUTH_USERS_KEY)
    if (raw == null) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveAuthUsers(users) {
  try {
    window.localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users))
  } catch {
    // ignore
  }
}

/**
 * Case-insensitive lookup. Returns the stored username (canonical casing) or null.
 */
export function findRegisteredUsername(input) {
  const q = String(input || '').trim().toLowerCase()
  if (!q) return null
  const users = loadAuthUsers()
  const found = users.find((x) => x && typeof x === 'object' && String(x.username).trim().toLowerCase() === q)
  return found ? String(found.username).trim() : null
}
