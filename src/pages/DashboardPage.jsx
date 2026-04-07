import { ArrowUpRight, CalendarDays, ClipboardList, Receipt, Sparkles } from 'lucide-react'

function Card({ children, className = '' }) {
  return (
    <div className={['rounded-3xl border border-slate-200 bg-white p-5 shadow-sm', className].join(' ')}>
      {children}
    </div>
  )
}

function Stat({ icon: Icon, label, value, accent = 'text-slate-900', sub }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-800">
        <Icon className="h-5 w-5" aria-hidden="true" />
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

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <Stat
            icon={ClipboardList}
            label="Chores pending"
            value="2"
            accent="text-indigo-700"
            sub="Quick win: assign + check off"
          />
        </Card>
        <Card>
          <Stat
            icon={Receipt}
            label="Next bill due"
            value="Internet · $50"
            accent="text-emerald-700"
            sub="Due in 3 days"
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Demo snapshot
              </p>
              <h2 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">
                Welcome back
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Everything you need for a smooth shared living week—at a glance.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
              <CalendarDays className="h-4 w-4 text-slate-600" aria-hidden="true" />
              Tue · Sprint Review
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { title: 'Kitchen reset', meta: 'Assigned to: Me', status: 'Pending' },
              { title: 'Trash & recycling', meta: 'Assigned to: Roommate A', status: 'Pending' },
              { title: 'Bathroom wipe-down', meta: 'Assigned to: Roommate B', status: 'Done' },
              { title: 'Restock essentials', meta: 'Assigned to: Me', status: 'Done' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <span
                    className={[
                      'rounded-full px-2.5 py-1 text-xs font-semibold',
                      item.status === 'Pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800',
                    ].join(' ')}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{item.meta}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Quick actions</h2>
          <p className="mt-1 text-sm text-slate-600">
            Built for fast check-ins with your roommates.
          </p>

          <div className="mt-4 space-y-2">
            {[
              { label: 'Add a chore', hint: 'Keep it specific' },
              { label: 'Review upcoming bills', hint: 'Avoid surprises' },
              { label: 'Share house rules', hint: 'Set expectations' },
            ].map((a) => (
              <div
                key={a.label}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{a.label}</p>
                  <p className="text-xs text-slate-500">{a.hint}</p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

