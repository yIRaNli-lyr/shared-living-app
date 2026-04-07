import { CreditCard, HandCoins, Receipt, ShieldCheck } from 'lucide-react'

function Card({ children, className = '' }) {
  return (
    <div className={['rounded-3xl border border-slate-200 bg-white p-5 shadow-sm', className].join(' ')}>
      {children}
    </div>
  )
}

function Pill({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    amber: 'bg-amber-100 text-amber-800',
    emerald: 'bg-emerald-100 text-emerald-800',
    indigo: 'bg-indigo-100 text-indigo-800',
  }
  return <span className={['rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone]].join(' ')}>{children}</span>
}

const FAKE_BILLS = [
  { id: 'internet', title: 'Internet', amount: 50, due: 'In 3 days', tone: 'amber', icon: Receipt },
  { id: 'electric', title: 'Electric', amount: 34, due: 'Next week', tone: 'indigo', icon: CreditCard },
  { id: 'cleaning', title: 'Cleaning supplies', amount: 18, due: 'Anytime', tone: 'emerald', icon: ShieldCheck },
]

export default function BillsPage() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-indigo-50" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-600">Bills</p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Shared expenses</h2>
                <p className="mt-2 text-sm text-slate-600">
                  A clean, demo-ready view of what’s coming up. (No logic yet—by design.)
                </p>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                <HandCoins className="h-4 w-4" aria-hidden="true" />
                Settle Up
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {FAKE_BILLS.map((b) => {
                const Icon = b.icon
                return (
                  <div key={b.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-800">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <Pill tone={b.tone}>{b.due}</Pill>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{b.title}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">${b.amount}</p>
                    <p className="mt-2 text-xs text-slate-500">Split evenly · 3 roommates</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Balances (placeholder)</h3>
          <p className="mt-1 text-sm text-slate-600">
            In a later sprint, this would show who owes what and let you “settle up” with one click.
          </p>

          <div className="mt-4 space-y-2">
            {[
              { who: 'Me', amount: '+$12', tone: 'text-emerald-700' },
              { who: 'Roommate A', amount: '-$8', tone: 'text-rose-700' },
              { who: 'Roommate B', amount: '-$4', tone: 'text-rose-700' },
            ].map((row) => (
              <div key={row.who} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{row.who}</p>
                <p className={['text-sm font-semibold', row.tone].join(' ')}>{row.amount}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Payment methods (placeholder)</h3>
          <p className="mt-1 text-sm text-slate-600">
            Add Venmo/PayPal links later. For now, a clean stub for the review.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {['Venmo', 'PayPal', 'Zelle', 'Cash'].map((m) => (
              <div key={m} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm">
                {m}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

