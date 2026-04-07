import { createElement, useMemo } from 'react'
import { ArrowUpRight, CalendarDays, ClipboardList, Receipt, Sparkles } from 'lucide-react'
import { upcomingBillsSorted } from '../lib/billDueDate'
import { useLocalStorageState } from '../lib/useLocalStorageState'
import { DEFAULT_BILLS, normalizeBill } from '../lib/billsModel'
import { DEFAULT_CHORES, normalizeChore } from '../lib/choresModel'

function Card({ children, className = '' }) {
  return (
    <div className={['rounded-3xl border border-slate-200 bg-white p-5 shadow-sm', className].join(' ')}>
      {children}
    </div>
  )
}

function Stat({ icon, label, value, accent = 'text-slate-900', sub }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-800">
        {createElement(icon, { className: 'h-5 w-5', 'aria-hidden': true })}
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-600">{label}</p>
        <p className={['mt-0.5 text-2xl font-semibold tracking-tight', accent].join(' ')}>
          {value}
        </p>
        {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
      </div>
    </div>
  )
}

function nextBillSummary(bills, now = new Date()) {
  if (!bills.length) return { value: '—', sub: 'Add bills in the Bills tab' }
  const upcoming = upcomingBillsSorted(bills, now)
  if (upcoming.length) {
    const b = upcoming[0]
    return {
      value: `${b.title} · $${b.amount}`,
      sub: b.due || 'Upcoming',
    }
  }
  const b = bills[0]
  return {
    value: `${b.title} · $${b.amount}`,
    sub: b.due && b.due !== 'Anytime' ? b.due : 'No parseable due date — open Bills to set one',
  }
}

/**
 * @param {object} props
 * @param {boolean} props.isDemo
 * @param {string} props.choresKey
 * @param {string} props.billsKey
 * @param {string[]} props.members
 * @param {(tab: 'chores' | 'bills' | 'rules', opts?: { focusChoreForm?: boolean }) => void} props.onNavigateTab
 */
export default function DashboardPage({ isDemo, choresKey, billsKey, members, onNavigateTab }) {
  const householdMembersKey = Array.isArray(members) && members.length ? members.join('\u0001') : ''
  const householdMembers = useMemo(() => {
    if (!Array.isArray(members) || !members.length) return []
    return members
    // householdMembersKey is the content fingerprint for `members`.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- members read when key changes
  }, [householdMembersKey])

  const [choresStored] = useLocalStorageState(choresKey, isDemo ? DEFAULT_CHORES : [])
  const chores = useMemo(() => {
    const raw = Array.isArray(choresStored) ? choresStored : []
    const normalized = raw.map((c) => normalizeChore(c, householdMembers)).filter(Boolean)
    if (!isDemo) return normalized
    const hasSeed = normalized.some((c) => String(c.id).startsWith('seed_'))
    if (normalized.length === 0 && !hasSeed) {
      return DEFAULT_CHORES.map((c) => normalizeChore(c, householdMembers)).filter(Boolean)
    }
    return normalized
  }, [choresStored, isDemo, householdMembers])

  const [billsStored] = useLocalStorageState(billsKey, isDemo ? DEFAULT_BILLS : [])
  const bills = useMemo(() => {
    const raw = Array.isArray(billsStored) ? billsStored : []
    return raw.map((b) => normalizeBill(b, householdMembers)).filter((b) => b && b.title)
  }, [billsStored, householdMembers])

  const pending = useMemo(
    () => chores.filter((c) => !c.done).sort((a, b) => b.createdAt - a.createdAt),
    [chores],
  )

  const upcomingBills = useMemo(() => upcomingBillsSorted(bills, new Date()), [bills])
  const nextBill = useMemo(() => nextBillSummary(bills, new Date()), [bills])

  const quickActions = [
    {
      label: 'Add a chore',
      hint: 'Keep it specific',
      tab: 'chores',
      focusChoreForm: true,
    },
    { label: 'Review upcoming bills', hint: 'Avoid surprises', tab: 'bills' },
    { label: 'Share house rules', hint: 'Set expectations', tab: 'rules' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <Stat
            icon={ClipboardList}
            label="Chores pending"
            value={String(pending.length)}
            accent="text-indigo-700"
            sub={
              pending.length ? 'Quick win: assign + check off' : 'Add chores in the Chores tab'
            }
          />
        </Card>
        <Card>
          <Stat
            icon={Receipt}
            label="Next bill due"
            value={nextBill.value}
            accent="text-emerald-700"
            sub={nextBill.sub}
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              {isDemo ? (
                <p className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Demo snapshot
                </p>
              ) : (
                <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Your week
                </p>
              )}
              <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
                {pending.length || bills.length ? 'At a glance' : 'Getting started'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {pending.length || bills.length
                  ? 'Chores and bills pulled from your saved data.'
                  : 'Add chores and bills in their tabs—everything updates here automatically.'}
              </p>
            </div>
            {isDemo ? (
              <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 sm:flex">
                <CalendarDays className="h-4 w-4 text-slate-600" aria-hidden="true" />
                Tue · Sprint Review
              </div>
            ) : null}
          </div>

          <div className="mt-5 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Pending chores</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {pending.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center sm:col-span-2">
                    <p className="text-sm font-semibold text-slate-900">No pending chores</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Add one from the Chores tab or use Quick actions.
                    </p>
                  </div>
                ) : (
                  pending.map((c) => (
                    <div key={c.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{c.name}</p>
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          Pending
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">Assigned to: {c.assignee}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-800">Upcoming bills</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {bills.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center sm:col-span-2">
                    <p className="text-sm font-semibold text-slate-900">No bills yet</p>
                    <p className="mt-1 text-sm text-slate-600">Add shared expenses in the Bills tab.</p>
                  </div>
                ) : upcomingBills.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-amber-100 bg-amber-50/50 p-5 text-center sm:col-span-2">
                    <p className="text-sm font-semibold text-slate-900">No upcoming due dates detected</p>
                    <p className="mt-1 text-sm text-slate-600">
                      Use phrases like &quot;In 3 days&quot;, &quot;Tomorrow&quot;, or YYYY-MM-DD on bills for them to
                      appear here.
                    </p>
                  </div>
                ) : (
                  upcomingBills.slice(0, 4).map((b) => (
                    <div key={b.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-slate-900">{b.title}</p>
                        <span className="text-sm font-semibold text-emerald-800">${b.amount}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{b.due}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Quick actions</h2>
          <p className="mt-1 text-sm text-slate-600">
            Built for fast check-ins with your roommates.
          </p>

          <div className="mt-4 space-y-2">
            {quickActions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => onNavigateTab(a.tab, { focusChoreForm: a.focusChoreForm })}
                className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{a.label}</p>
                  <p className="text-xs text-slate-500">{a.hint}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
