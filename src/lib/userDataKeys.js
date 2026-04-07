/**
 * Per-user localStorage key suffix. Demo keeps legacy keys (no suffix) so existing demo data still loads.
 */
export function userDataKeys(currentUser) {
  const isDemo = Boolean(currentUser?.isDemo)
  const username = typeof currentUser?.username === 'string' ? currentUser.username : ''
  const suffix = isDemo ? '' : `.user.${encodeURIComponent(username)}`

  return {
    isDemo,
    chores: `slmvp.chores.v1${suffix}`,
    bills: `slmvp.bills.v1${suffix}`,
    rules: `slmvp.rules.v1${suffix}`,
    members: `slmvp.members.v1${suffix}`,
  }
}
