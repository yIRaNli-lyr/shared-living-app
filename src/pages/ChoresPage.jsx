import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Circle, Plus, Trash2, User } from 'lucide-react'
import { DEFAULT_CHORES, normalizeChore } from '../lib/choresModel'
import { useLocalStorageState } from '../lib/useLocalStorageState'

function Card({ children, className = '' }) {
  return (
    <div className={['rounded-3xl border border-slate-200 bg-white p-5 shadow-sm', className].join(' ')}>
      {children}
    </div>
  )
}

function IconBadge({ children, className = '' }) {
  return (
    <div className={['grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-800', className].join(' ')}>
      {children}
    </div>
  )
}

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

export default function ChoresPage({ storageKey, isDemo, members, focusAddFormNonce = 0 }) {
  const roster = Array.isArray(members) && members.length ? members : []
  const [stored, setStored] = useLocalStorageState(storageKey, isDemo ? DEFAULT_CHORES : [])
  const nameInputRef = useRef(null)

  const chores = useMemo(() => {
    const raw = Array.isArray(stored) ? stored : []
    const normalized = raw.map((c) => normalizeChore(c, roster)).filter(Boolean)
    if (!isDemo) return normalized
    const hasSeed = normalized.some((c) => String(c.id).startsWith('seed_'))
    if (normalized.length === 0 && !hasSeed) return DEFAULT_CHORES.map((c) => normalizeChore(c, roster)).filter(Boolean)
    return normalized
  }, [stored, isDemo, roster])

  const [name, setName] = useState('')
  const [assignee, setAssignee] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [draftAssignee, setDraftAssignee] = useState('')

  useEffect(() => {
    if (roster.length > 0 && !roster.includes(assignee)) setAssignee(roster[0])
  }, [roster, assignee])

  useEffect(() => {
    if (roster.length > 0 && !roster.includes(draftAssignee)) setDraftAssignee(roster[0])
  }, [roster, draftAssignee])

  useEffect(() => {
    if (focusAddFormNonce > 0) nameInputRef.current?.focus()
  }, [focusAddFormNonce])

  const pending = useMemo(
    () => chores.filter((c) => !c.done).sort((a, b) => b.createdAt - a.createdAt),
    [chores],
  )
  const done = useMemo(
    () => chores.filter((c) => c.done).sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0)),
    [chores],
  )

  function persist(next) {
    setStored(next)
  }

  function addChore(e) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const next = [
      {
        id: makeId(),
        name: trimmed,
        assignee,
        done: false,
        createdAt: Date.now(),
        doneAt: null,
      },
      ...chores,
    ]
    persist(next)
    setName('')
    setAssignee(roster[0] || '')
  }

  function toggleDone(id) {
    if (editingId === id) setEditingId(null)
    const next = chores.map((c) => {
      if (c.id !== id) return c
      const nextDone = !c.done
      return { ...c, done: nextDone, doneAt: nextDone ? Date.now() : null }
    })
    persist(next)
  }

  function updateChore(id, patch) {
    const next = chores.map((c) => (c.id === id ? { ...c, ...patch } : c))
    persist(next)
  }

  function removeChore(id) {
    if (editingId === id) setEditingId(null)
    persist(chores.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-slate-50" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-600">Chores</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
                  Assign. Check off. Done.
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  This tab is fully functional and persists in your browser via <span className="font-semibold">localStorage</span>.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                <Circle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                Pending: <span className="font-semibold">{pending.length}</span>
              </div>
            </div>

            <form onSubmit={addChore} className="mt-5 grid gap-3 md:grid-cols-[1fr_200px_auto]">
              <label className="block">
                <span className="sr-only">Chore name</span>
                <input
                  ref={nameInputRef}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Add a chore (e.g., wipe counters, take out trash)"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                />
              </label>

              <label className="block">
                <span className="sr-only">Assignee</span>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <select
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                  >
                    {roster.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    ▾
                  </div>
                </div>
              </label>

              <button
                type="submit"
                disabled={!name.trim()}
                className={[
                  'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition',
                  name.trim()
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed',
                ].join(' ')}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </button>
            </form>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Pending</h3>
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
              {pending.length}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {pending.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-sm font-semibold text-slate-900">All set.</p>
                <p className="mt-1 text-sm text-slate-600">Add a new chore above to keep things moving.</p>
              </div>
            ) : (
              pending.map((c) => (
                <div
                  key={c.id}
                  className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleDone(c.id)}
                    disabled={editingId === c.id}
                    className="mt-0.5 grid h-6 w-6 place-items-center rounded-full border border-slate-300 bg-white transition hover:border-emerald-400"
                    aria-label={`Mark ${c.name} complete`}
                  >
                    <Check className="h-4 w-4 text-transparent group-hover:text-emerald-600" aria-hidden="true" />
                  </button>

                  <div className="min-w-0 flex-1">
                    {editingId === c.id ? (
                      <div className="grid gap-2">
                        <label className="block">
                          <span className="sr-only">Edit chore name</span>
                          <input
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                          />
                        </label>

                        <label className="block">
                          <span className="sr-only">Edit assignee</span>
                          <div className="relative">
                            <User
                              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                              aria-hidden="true"
                            />
                            <select
                              value={draftAssignee}
                              onChange={(e) => setDraftAssignee(e.target.value)}
                              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-9 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                            >
                              {roster.map((a) => (
                                <option key={a} value={a}>
                                  {a}
                                </option>
                              ))}
                            </select>
                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</div>
                          </div>
                        </label>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const trimmed = draftName.trim()
                              if (!trimmed) return
                              updateChore(c.id, { name: trimmed, assignee: draftAssignee })
                              setEditingId(null)
                            }}
                            disabled={!draftName.trim()}
                            className={[
                              'inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-semibold shadow-sm transition',
                              draftName.trim()
                                ? 'bg-slate-900 text-white hover:bg-slate-800'
                                : 'bg-slate-200 text-slate-500 cursor-not-allowed',
                            ].join(' ')}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="truncate text-sm font-semibold text-slate-900">{c.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          Assigned to <span className="font-semibold text-slate-700">{c.assignee}</span>
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {editingId !== c.id && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(c.id)
                          setDraftName(c.name)
                          setDraftAssignee(c.assignee)
                        }}
                        className="rounded-xl px-2 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label={`Edit ${c.name}`}
                      >
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeChore(c.id)}
                      className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label={`Delete ${c.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Done</h3>
            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
              {done.length}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {done.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                <p className="text-sm font-semibold text-slate-900">Nothing completed yet.</p>
                <p className="mt-1 text-sm text-slate-600">Check off a pending chore to see it here.</p>
              </div>
            ) : (
              done.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => toggleDone(c.id)}
                    className="mt-0.5 grid h-6 w-6 place-items-center rounded-full border border-emerald-300 bg-emerald-600 text-white shadow-sm transition hover:bg-emerald-700"
                    aria-label={`Mark ${c.name} incomplete`}
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 line-through decoration-slate-400">
                      {c.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Completed · <span className="font-semibold text-slate-700">{c.assignee}</span>
                    </p>
                  </div>

                  <IconBadge className="bg-white">
                    <Check className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                  </IconBadge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

