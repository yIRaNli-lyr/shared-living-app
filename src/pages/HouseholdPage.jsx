import { useMemo, useState } from 'react'
import { CalendarDays, LogOut, MessageCircle, Plus, Send, Trash2, Users } from 'lucide-react'
import { useLocalStorageState } from '../lib/useLocalStorageState'
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

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

function formatTimeLabel(ts) {
  try {
    return new Date(ts).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function normalizeChatMessage(input) {
  if (!input || typeof input !== 'object') return null
  const id = typeof input.id === 'string' ? input.id : makeId()
  const sender = typeof input.sender === 'string' && input.sender.trim() ? input.sender.trim() : 'Household member'
  const text = typeof input.text === 'string' ? input.text.trim() : ''
  const createdAt = typeof input.createdAt === 'number' ? input.createdAt : Date.now()
  if (!text) return null
  return { id, sender, text, createdAt }
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

  const chatStorageKey = useMemo(() => {
    const householdKey = isDemo ? 'demo-household' : meta.owner || currentUser.username || 'household'
    return `${householdKey}:chat`
  }, [isDemo, meta.owner, currentUser.username])

  const DEMO_MESSAGES = useMemo(
    () => [
      {
        id: 'demo_msg_1',
        sender: 'Alex',
        text: 'I can take out the trash tonight.',
        createdAt: Date.now() - 1000 * 60 * 90,
      },
      {
        id: 'demo_msg_2',
        sender: 'Jordan',
        text: 'Reminder: the internet bill is due this week.',
        createdAt: Date.now() - 1000 * 60 * 60,
      },
      {
        id: 'demo_msg_3',
        sender: 'Sam',
        text: 'Please remember quiet hours after 11 PM.',
        createdAt: Date.now() - 1000 * 60 * 35,
      },
      {
        id: 'demo_msg_4',
        sender: 'Taylor',
        text: 'Let’s do a quick apartment check-in this weekend.',
        createdAt: Date.now() - 1000 * 60 * 10,
      },
    ],
    [],
  )

  const [storedMessages, setStoredMessages] = useLocalStorageState(chatStorageKey, isDemo ? DEMO_MESSAGES : [])
  const [chatInput, setChatInput] = useState('')
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingDate, setMeetingDate] = useState('')
  const [meetingTime, setMeetingTime] = useState('')

  const chatMessages = useMemo(() => {
    const raw = Array.isArray(storedMessages) ? storedMessages : []
    const normalized = raw.map(normalizeChatMessage).filter(Boolean)

    if (isDemo && normalized.length === 0) return DEMO_MESSAGES
    return normalized.sort((a, b) => a.createdAt - b.createdAt)
  }, [storedMessages, isDemo, DEMO_MESSAGES])

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

  function sendChatMessage(text) {
    const message = String(text || '').trim()
    if (!message) return
    const sender =
      members.find(
        (m) => String(m).trim().toLowerCase() === String(currentUser.username).trim().toLowerCase(),
      ) || currentUser.username || 'You'

    const next = [
      ...(Array.isArray(chatMessages) ? chatMessages : []),
      {
        id: makeId(),
        sender,
        text: message,
        createdAt: Date.now(),
      },
    ]
    setStoredMessages(next)
  }

  function handleSendMessage(e) {
    e.preventDefault()
    if (!chatInput.trim()) return
    sendChatMessage(chatInput)
    setChatInput('')
  }

  function handleSendQuickReminder(type) {
    const templates = {
      chores: 'Reminder: please check your assigned chores for today.',
      bills: 'Reminder: please review unpaid bills and send payment if needed.',
      rules: 'Reminder: please review the current house rules.',
      supplies: 'Reminder: please check shared supplies and refill if something is running low.',
    }
    sendChatMessage(templates[type] || 'Household reminder.')
  }

  function handleScheduleMeeting(e) {
    e.preventDefault()
    if (!meetingDate || !meetingTime) return
    const title = meetingTitle.trim() || 'Household meeting'
    const message = `${title} scheduled for ${meetingDate} at ${meetingTime}.`
    sendChatMessage(message)
    setMeetingTitle('')
    setMeetingDate('')
    setMeetingTime('')
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

      <Card>
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-600 text-white shadow-sm">
            <MessageCircle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-600">Communication</p>
            <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Household group chat</h3>
            <p className="mt-1 text-sm text-slate-600">
              Use this space to share reminders, updates, and quick household coordination.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="min-w-0">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {chatMessages.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                    No messages yet. Start the conversation below.
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">{msg.sender}</p>
                        <span className="text-xs text-slate-500">{formatTimeLabel(msg.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{msg.text}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendMessage} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Write a household message..."
                  className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className={[
                    'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition',
                    chatInput.trim()
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'cursor-not-allowed bg-slate-200 text-slate-500',
                  ].join(' ')}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Send
                </button>
              </form>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h4 className="text-sm font-semibold text-slate-900">Quick reminders</h4>
              <p className="mt-1 text-sm text-slate-600">
                Send a simple reminder based on other household tasks.
              </p>
              <div className="mt-3 grid gap-2">
                <button
                  type="button"
                  onClick={() => handleSendQuickReminder('chores')}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Remind about chores
                </button>
                <button
                  type="button"
                  onClick={() => handleSendQuickReminder('bills')}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Remind about bills
                </button>
                <button
                  type="button"
                  onClick={() => handleSendQuickReminder('rules')}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Remind about rules
                </button>
                <button
                  type="button"
                  onClick={() => handleSendQuickReminder('supplies')}
                  className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                >
                  Remind about supplies
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-slate-700" aria-hidden="true" />
                <h4 className="text-sm font-semibold text-slate-900">Schedule offline meeting</h4>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Set a time for a quick household check-in and send it to the group chat.
              </p>

              <form onSubmit={handleScheduleMeeting} className="mt-3 space-y-3">
                <input
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder="Meeting title (optional)"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="date"
                    value={meetingDate}
                    onChange={(e) => setMeetingDate(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                  />
                  <input
                    type="time"
                    value={meetingTime}
                    onChange={(e) => setMeetingTime(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!meetingDate || !meetingTime}
                  className={[
                    'inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition',
                    meetingDate && meetingTime
                      ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                      : 'cursor-not-allowed bg-slate-200 text-slate-500',
                  ].join(' ')}
                >
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Send meeting plan
                </button>
              </form>
            </div>
          </div>
        </div>
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