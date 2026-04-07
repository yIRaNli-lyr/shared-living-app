import { createElement, useMemo } from 'react'
import { ArrowUpRight, ClipboardList, Receipt, Sparkles } from 'lucide-react'
import { buildSettlementInsights, fmtAmountPlain, listUserRelevantBillsOrdered } from '../lib/billSettlement'
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

function billRowBadge(kind) {
  if (kind === 'pay') return { label: 'Pay', className: 'bg-rose-100 text-rose-900' }
  if (kind === 'collect') return { label: 'Collect', className: 'bg-emerald-100 text-emerald-900' }
  return { label: 'Due', className: 'bg-slate-200/90 text-slate-800' }
}

/**
 * @param {object} props
 * @param {boolean} props.isDemo
 * @param {string} props.currentUsername
 * @param {string} props.choresKey
 * @param {string} props.billsKey
 * @param {string[]} props.members
 * @param {(tab: 'chores' | 'bills' | 'rules', opts?: { focusChoreForm?: boolean }) => void} props.onNavigateTab
 */
export default function DashboardPage({ isDemo, currentUsername, choresKey, billsKey, members, onNavigateTab }) {
  const householdMembersKey = Array.isArray(members) && members.length ? members.join('\u0001') : ''
  const householdMembers = useMemo(() => {
    if (!Array.isArray(members) || !members.length) return []
    return members
    // eslint-disable-next-line react-hooks/exhaustive-deps -- members read when key changes
  }, [householdMembersKey])

  const me = String(currentUsername || '').trim()

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

  const myPending = useMemo(() => {
    return pending.filter((c) => me && c.assignee === me)
  }, [pending, me])

  const settlementForYou = useMemo(
    () => buildSettlementInsights(bills, householdMembers, me),
    [bills, householdMembers, me],
  )

  const relevantBillRows = useMemo(
    () => listUserRelevantBillsOrdered(bills, householdMembers, me, new Date()),
    [bills, householdMembers, me],
  )

  const noBillsYet = bills.length === 0

  const oweCard = useMemo(() => {
    if (noBillsYet) {
      return { value: '—', sub: 'Add bills to track what you owe' }
    }
    if (settlementForYou.payPending < 0.005) {
      return { value: '$0.00', sub: 'No unsettled share due from you' }
    }
    const first = relevantBillRows.find((r) => r.pendingOwe >= 0.005)
    const sub = first
      ? `Next: ${first.bill.title} · ${fmtAmountPlain(first.pendingOwe)}`
      : 'Settle shares on the Bills tab'
    return { value: fmtAmountPlain(settlementForYou.payPending), sub }
  }, [noBillsYet, settlementForYou.payPending, relevantBillRows])

  const hasBillAttention =
    settlementForYou.receivePending >= 0.005 ||
    settlementForYou.payPending >= 0.005 ||
    relevantBillRows.length > 0
  const hasActivity = myPending.length > 0 || hasBillAttention

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
            label="Your chores pending"
            value={String(myPending.length)}
            accent="text-indigo-700"
            sub={
              myPending.length
                ? 'Incomplete chores assigned to you'
                : chores.length === 0
                  ? 'No chores in the household yet'
                  : 'Nothing assigned to you'
            }
          />
        </Card>
        <Card>
          <Stat
            icon={Receipt}
            label="You owe (unsettled)"
            value={oweCard.value}
            accent="text-rose-700"
            sub={oweCard.sub}
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
                  Your household
                </p>
              )}
              <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
                {hasActivity ? 'At a glance' : 'Nothing to show yet'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {hasActivity
                  ? 'Based on shared household chores and bills. Settlement uses Mark paid on each bill.'
                  : 'Add chores and bills from the tabs — this dashboard updates from real household data only.'}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Your pending chores</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {myPending.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center sm:col-span-2">
                    <p className="text-sm font-semibold text-slate-900">No pending chores for you</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {chores.length === 0
                        ? 'The household has no chores yet — add some in the Chores tab.'
                        : pending.length > 0
                          ? 'Other members have pending chores; yours are all done or unassigned to you.'
                          : 'Add a chore assigned to you in the Chores tab.'}
                    </p>
                  </div>
                ) : (
                  myPending.map((c) => (
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
              <h3 className="text-sm font-semibold text-slate-800">Your bills (unsettled or upcoming)</h3>
              <p className="mt-1 text-xs text-slate-500">
                Pay = your share still due. Collect = you paid and others still owe you. Due = upcoming date, settled on
                your side.
              </p>
              {settlementForYou.receivePending >= 0.005 || settlementForYou.payPending >= 0.005 ? (
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  {settlementForYou.payPending >= 0.005 ? (
                    <span>
                      <span className="font-semibold text-slate-800">Pay (total):</span>{' '}
                      {fmtAmountPlain(settlementForYou.payPending)}
                    </span>
                  ) : null}
                  {settlementForYou.receivePending >= 0.005 ? (
                    <span>
                      <span className="font-semibold text-slate-800">Collect (total):</span>{' '}
                      {fmtAmountPlain(settlementForYou.receivePending)}
                    </span>
                  ) : null}
                </p>
              ) : null}
              <div className="mt-4 flex flex-col gap-3">
                {noBillsYet ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <p className="text-sm font-semibold text-slate-900">No bills yet</p>
                    <p className="mt-1 text-sm text-slate-600">Add shared expenses in the Bills tab.</p>
                  </div>
                ) : relevantBillRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <p className="text-sm font-semibold text-slate-900">No bills need your attention</p>
                    <p className="mt-1 text-sm text-slate-600">
                      No unsettled shares for you and no upcoming due dates on bills you are on.
                    </p>
                  </div>
                ) : (
                  relevantBillRows.map((row) => {
                    const b = row.bill
                    const due = String(b.due || '').trim() || 'Anytime'
                    const badge = billRowBadge(row.kind)
                    return (
                      <div
                        key={b.id}
                        className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3.5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 font-semibold leading-snug text-slate-900">{b.title}</p>
                          <span
                            className={[
                              'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
                              badge.className,
                            ].join(' ')}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-700">
                          <span className="font-semibold tabular-nums text-slate-900">{fmtAmountPlain(b.amount)}</span>
                          <span className="mx-2 text-slate-300">·</span>
                          <span className="text-slate-600">{due}</span>
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-slate-500">{row.detail}</p>
                      </div>
                    )
                  })
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
