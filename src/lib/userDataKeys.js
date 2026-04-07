/**
 * Demo: unsuffixed keys (demo session only).
 * Signed-in users: per-account keys so registration does not merge everyone into one household
 * on the same browser. Household membership is whatever that account’s roster contains.
 */
export function userDataKeys(currentUser) {
  const isDemo = Boolean(currentUser?.isDemo)
  const u = String(currentUser?.username || '').trim()
  const suffix = isDemo ? '' : `.user.${encodeURIComponent(u)}`

  return {
    isDemo,
    chores: `slmvp.chores.v1${suffix}`,
    bills: `slmvp.bills.v1${suffix}`,
    rules: `slmvp.rules.v1${suffix}`,
    members: `slmvp.members.v1${suffix}`,
    householdMeta: `slmvp.household.meta.v1${suffix}`,
  }
}
