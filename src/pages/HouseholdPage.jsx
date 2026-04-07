import { useMemo, useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { canRemoveHouseholdMember } from '../lib/householdRoster'

function Card({ children, className = '' }) {
  return (
    <div className={['rounded-3xl border border-slate-200 bg-white p-5 shadow-sm', className].join(' ')}>
      {children}
    </div>
  )
}

export default function HouseholdPage({ currentUser, members, setMembers, choresKey, billsKey }) {
  const [newName, setNewName] = useState('')

  const removable = useMemo(() => {
    const map = {}
    for (const name of members) {
      map[name] = canRemoveHouseholdMember(name, currentUser.username, members, choresKey, billsKey)
    }
    return map
  }, [members, currentUser.username, choresKey, billsKey])

  function addMember(e) {
    e.preventDefault()
    const trimmed = newName.trim()
    if (!trimmed) return
    if (members.includes(trimmed)) {
      setNewName('')
      return
    }
    setMembers((prev) => [...prev, trimmed])
    setNewName('')
  }

  function removeMember(name) {
    if (!canRemoveHouseholdMember(name, currentUser.username, members, choresKey, billsKey)) return
    setMembers((prev) => prev.filter((n) => n !== name))
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
                  You are always listed first. Add roommates so they appear in chore assignees and bill splits. Stored only in
                  this browser.
                </p>
              </div>
            </div>

            <form onSubmit={addMember} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="block min-w-0 flex-1">
                <span className="sr-only">New member name</span>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="New member name"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                />
              </label>
              <button
                type="submit"
                disabled={!newName.trim()}
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
            </form>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">Current members</h3>
        <p className="mt-1 text-sm text-slate-600">
          Remove is available only when someone is not the account holder and is not referenced on chores or bills.
        </p>
        <ul className="mt-4 space-y-2">
          {members.map((name, i) => (
            <li
              key={name}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                {i === 0 ? (
                  <p className="mt-0.5 text-xs text-slate-500">You (logged in)</p>
                ) : null}
              </div>
              {removable[name] ? (
                <button
                  type="button"
                  onClick={() => removeMember(name)}
                  className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-rose-600"
                  aria-label={`Remove ${name}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <span className="shrink-0 text-xs font-medium text-slate-400">
                  {name === currentUser.username ? '—' : 'In use'}
                </span>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
