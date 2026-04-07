import { useMemo, useState } from 'react'
import { LogOut, Plus, Trash2, Users } from 'lucide-react'
import { findRegisteredUsername } from '../lib/authUsers'
import {
  canActorDeleteHouseholdMember,
  demoHouseholdMeta,
  memberRoleLabel,
  normalizeHouseholdMeta,
} from '../lib/householdMeta'
import { canRemoveHouseholdMember, hasOtherHouseholdMembers } from '../lib/householdRoster'

function Card({ children, className = '' }) {
  return (
    <div className={['rounded-3xl border border-slate-200 bg-white p-5 shadow-sm', className].join(' ')}>
      {children}
    </div>
  )
}

function rosterHasUsernameCI(roster, name) {
  const n = String(name || '').trim().toLowerCase()
  if (!n) return false
  return roster.some((m) => String(m).trim().toLowerCase() === n)
}

export default function HouseholdPage({
  currentUser,
  members,
  setMembers,
  choresKey,
  billsKey,
  isDemo,
  householdMeta,
  setHouseholdMeta,
  cloudHousehold = false,
  onCloudAddMember,
  onCloudRemoveMember,
  onCloudToggleAdmin,
  onCloudLeaveHousehold,
}) {
  const [newName, setNewName] = useState('')
  const [addError, setAddError] = useState('')
  const [leaveError, setLeaveError] = useState('')
  const [cloudBusy, setCloudBusy] = useState(false)

  const meta = useMemo(() => (isDemo ? demoHouseholdMeta() : normalizeHouseholdMeta(householdMeta)), [isDemo, householdMeta])

  const deletable = useMemo(() => {
    const map = {}
    for (const name of members) {
      const roleOk = canActorDeleteHouseholdMember(currentUser.username, name, meta)
      const dataOk = canRemoveHouseholdMember(name, currentUser.username, members, choresKey, billsKey)
      map[name] = roleOk && dataOk
    }
    return map
  }, [members, currentUser.username, choresKey, billsKey, meta])

  const statusHint = useMemo(() => {
    const map = {}
    for (const name of members) {
      if (name === meta.owner) {
        map[name] = 'Owner'
      } else if (!canActorDeleteHouseholdMember(currentUser.username, name, meta)) {
        map[name] = name === currentUser.username ? '—' : 'No permission'
      } else if (!canRemoveHouseholdMember(name, currentUser.username, members, choresKey, billsKey)) {
        map[name] = 'In use'
      } else {
        map[name] = null
      }
    }
    return map
  }, [members, currentUser.username, choresKey, billsKey, meta])

  async function addMember(e) {
    e.preventDefault()
    setAddError('')
    const raw = newName.trim()
    if (!raw) return

    if (rosterHasUsernameCI(members, raw)) {
      setAddError('That person is already in the household.')
      return
    }

    if (isDemo) {
      setMembers((prev) => [...prev, raw])
      setNewName('')
      return
    }

    if (cloudHousehold && onCloudAddMember) {
      if (String(currentUser.username).trim().toLowerCase() === raw.toLowerCase()) {
        setAddError('You are already in this household.')
        return
      }
      setCloudBusy(true)
      try {
        await onCloudAddMember(raw)
        setNewName('')
      } catch (err) {
        if (err?.message === 'NO_PROFILE') {
          setAddError('No account with that username. They must sign up first.')
        } else if (err?.message) {
          setAddError(err.message)
        } else {
          setAddError('Could not add member.')
        }
      } finally {
        setCloudBusy(false)
      }
      return
    }

    const canonical = findRegisteredUsername(raw)
    if (!canonical) {
      setAddError('No account with that username. They must sign up on this browser first.')
      return
    }

    if (rosterHasUsernameCI(members, canonical)) {
      setAddError('That person is already in the household.')
      return
    }

    if (String(currentUser.username).trim().toLowerCase() === canonical.toLowerCase()) {
      setAddError('You are already listed as the first household member.')
      return
    }

    setMembers((prev) => [...prev, canonical])
    setNewName('')
  }

  async function removeMember(name) {
    if (!deletable[name]) return
    if (cloudHousehold && onCloudRemoveMember) {
      setCloudBusy(true)
      try {
        await onCloudRemoveMember(name)
      } finally {
        setCloudBusy(false)
      }
      return
    }
    setMembers((prev) => prev.filter((n) => n !== name))
    if (!isDemo) {
      setHouseholdMeta((prev) => {
        const m = normalizeHouseholdMeta(prev)
        return { owner: m.owner, admins: m.admins.filter((a) => a !== name) }
      })
    }
  }

  async function toggleAdmin(name) {
    if (isDemo) return
    if (meta.owner !== currentUser.username) return
    if (name === meta.owner) return
    if (cloudHousehold && onCloudToggleAdmin) {
      setCloudBusy(true)
      try {
        await onCloudToggleAdmin(name)
      } finally {
        setCloudBusy(false)
      }
      return
    }
    setHouseholdMeta((prev) => {
      const m = normalizeHouseholdMeta(prev)
      const set = new Set(m.admins)
      if (set.has(name)) set.delete(name)
      else set.add(name)
      return {
        owner: m.owner,
        admins: [...set].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
      }
    })
  }

  const roleBadgeClass = (role) => {
    if (role === 'owner') return 'bg-amber-100 text-amber-900'
    if (role === 'admin') return 'bg-indigo-100 text-indigo-900'
    return 'bg-slate-100 text-slate-700'
  }

  const isOwnerView = !isDemo && meta.owner === currentUser.username

  const canLeaveHousehold =
    !isDemo && hasOtherHouseholdMembers(members, currentUser.username)

  async function leaveHousehold() {
    if (!canLeaveHousehold) return
    setLeaveError('')
    const msg = cloudHousehold
      ? 'Leave this household? Your account is unchanged. You will get your own empty household next.'
      : 'Leave this household on this device? Your account is unchanged. Your roster will show only you until you add people again.'
    if (!window.confirm(msg)) return

    setCloudBusy(true)
    try {
      if (cloudHousehold && onCloudLeaveHousehold) {
        await onCloudLeaveHousehold()
      } else {
        const selfName =
          members.find(
            (m) => String(m).trim().toLowerCase() === String(currentUser.username).trim().toLowerCase(),
          ) || currentUser.username
        setMembers([selfName])
        setHouseholdMeta({ owner: selfName, admins: [] })
      }
    } catch (e) {
      setLeaveError(e?.message || 'Could not leave household.')
    } finally {
      setCloudBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-emerald-50" />
          <div className="relative">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Household</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Members</h2>
                <p className="mt-2 text-sm text-slate-600">
                  {isDemo
                    ? 'Demo: add any name for preview. Signed-in households only list registered accounts from this browser.'
                    : cloudHousehold
                      ? 'Cloud household: members are real accounts (Supabase). Owner and admins can remove people who are not protected by chores or bills on this device. Invite by exact username.'
                      : 'Members are registered accounts on this device. Each account has its own household data until you add someone here. Owner and admins can remove people who are not in use by chores or bills.'}{' '}
                  {!cloudHousehold ? 'Chores and bills use this account’s roster on this browser.' : null}
                </p>
                {!isDemo && meta.owner ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Household owner: <span className="font-semibold text-slate-700">{meta.owner}</span>
                    {meta.admins?.length ? (
                      <>
                        {' '}
                        · Admins:{' '}
                        <span className="font-semibold text-slate-700">{meta.admins.join(', ')}</span>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>
            </div>

            <form onSubmit={addMember} className="mt-5 flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block min-w-0 flex-1">
                  <span className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-600">
                    {isDemo ? 'Name (demo)' : 'Registered username'}
                  </span>
                  <input
                    value={newName}
                    onChange={(e) => {
                      setNewName(e.target.value)
                      if (addError) setAddError('')
                    }}
                    placeholder={
                      isDemo ? 'e.g. Alex' : cloudHousehold ? 'Exact username (they must have signed up)' : 'Exact username they signed up with'
                    }
                    autoComplete="off"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!newName.trim() || cloudBusy}
                  className={[
                    'inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition',
                    newName.trim()
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'cursor-not-allowed bg-slate-200 text-slate-500',
                  ].join(' ')}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add member
                </button>
              </div>
              {addError ? (
                <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                  {addError}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">Current members</h3>
        <p className="mt-1 text-sm text-slate-600">
          Only the owner or an admin can remove someone else. The owner cannot be removed by others. Removal is still blocked
          if chores or bills reference that person. You can always leave the household yourself (below)—that does not delete
          your account.
        </p>
        <ul className="mt-4 space-y-2">
          {members.map((name, i) => {
            const role = memberRoleLabel(name, meta)
            const hint = statusHint[name]
            return (
              <li
                key={`${name}-${i}`}
                className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                    <span
                      className={[
                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize',
                        roleBadgeClass(role),
                      ].join(' ')}
                    >
                      {role}
                    </span>
                  </div>
                  {i === 0 ? <p className="mt-1 text-xs text-slate-500">You (logged in)</p> : null}
                  {isOwnerView && name !== meta.owner ? (
                    <button
                      type="button"
                      onClick={() => toggleAdmin(name)}
                      className="mt-2 text-xs font-semibold text-indigo-700 underline decoration-indigo-200 underline-offset-2 hover:text-indigo-900"
                    >
                      {meta.admins?.includes(name) ? 'Remove admin' : 'Make admin'}
                    </button>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center justify-end gap-2">
                  {deletable[name] ? (
                    <button
                      type="button"
                      onClick={() => removeMember(name)}
                      className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-rose-600"
                      aria-label={`Remove ${name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-slate-400">{hint || '—'}</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      {!isDemo ? (
        <Card>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Leave household</h3>
          <p className="mt-1 text-sm text-slate-600">
            Stop sharing this roommate group. Your login stays the same.{' '}
            {cloudHousehold
              ? 'You will be placed in your own household with only you.'
              : 'On this device, your member list will reset to only you.'}
          </p>
          {leaveError ? (
            <p className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {leaveError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={!canLeaveHousehold || cloudBusy}
            onClick={() => leaveHousehold()}
            className={[
              'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm transition sm:w-auto',
              canLeaveHousehold && !cloudBusy
                ? 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400',
            ].join(' ')}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Leave household
          </button>
          {!canLeaveHousehold ? (
            <p className="mt-2 text-xs text-slate-500">You are already the only member—nothing to leave.</p>
          ) : null}
        </Card>
      ) : null}
    </div>
  )
}
