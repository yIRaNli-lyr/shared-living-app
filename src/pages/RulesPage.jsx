import { BadgeCheck, Bell, BookOpen, Moon, Sparkles } from 'lucide-react'

function Card({ children, className = '' }) {
  return (
    <div className={['rounded-3xl border border-slate-200 bg-white p-5 shadow-sm', className].join(' ')}>
      {children}
    </div>
  )
}

const RULES = [
  { icon: Moon, title: 'Quiet hours after 11 PM', detail: 'Sun–Thu: 11 PM · Fri–Sat: 12 AM' },
  { icon: Bell, title: 'Heads-up for guests', detail: 'Text the group chat at least 1 hour before' },
  { icon: BadgeCheck, title: 'Kitchen reset nightly', detail: 'Wipe counters + empty sink before bed' },
  { icon: BookOpen, title: 'Shared supplies', detail: 'Log paper towels & soap when running low' },
]

export default function RulesPage() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div>
          <p className="text-sm font-medium text-slate-600">Rules</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">House guidelines</h2>
          <p className="mt-2 text-sm text-slate-600">
            A clear, friendly baseline for living together. (Static for the MVP.)
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {RULES.map((r) => {
              const Icon = r.icon
              return (
                <div key={r.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-800 shadow-sm">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{r.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{r.detail}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">Tip for the review</h3>
            <p className="mt-1 text-sm text-slate-600">
              In a later sprint, roommates could propose rule changes and vote—keeping things transparent.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Future sprint
          </span>
        </div>
      </Card>
    </div>
  )
}

