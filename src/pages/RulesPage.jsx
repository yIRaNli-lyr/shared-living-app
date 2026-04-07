import { useMemo, useState } from 'react'
import { BadgeCheck, Bell, BookOpen, Moon, Plus, Sparkles } from 'lucide-react'
import { useLocalStorageState } from '../lib/useLocalStorageState'

function Card({ children, className = '' }) {
  return (
    <div className={['rounded-3xl border border-slate-200 bg-white p-5 shadow-sm', className].join(' ')}>
      {children}
    </div>
  )
}

const ICON_MAP = {
  moon: Moon,
  bell: Bell,
  badge: BadgeCheck,
  book: BookOpen,
}

const DEMO_RULES = [
  {
    id: 'seed_r1',
    iconKey: 'moon',
    title: 'Quiet hours after 11 PM',
    detail: 'Sun–Thu: 11 PM · Fri–Sat: 12 AM',
  },
  { id: 'seed_r2', iconKey: 'bell', title: 'Heads-up for guests', detail: 'Text the group chat at least 1 hour before' },
  {
    id: 'seed_r3',
    iconKey: 'badge',
    title: 'Kitchen reset nightly',
    detail: 'Wipe counters + empty sink before bed',
  },
  {
    id: 'seed_r4',
    iconKey: 'book',
    title: 'Shared supplies',
    detail: 'Log paper towels & soap when running low',
  },
]

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

function normalizeRule(input) {
  if (!input || typeof input !== 'object') return null
  const id = typeof input.id === 'string' ? input.id : makeId()
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const detail = typeof input.detail === 'string' ? input.detail.trim() : ''
  const iconKey =
    typeof input.iconKey === 'string' && Object.prototype.hasOwnProperty.call(ICON_MAP, input.iconKey)
      ? input.iconKey
      : 'badge'
  return { id, title, detail, iconKey }
}

export default function RulesPage({ storageKey, isDemo }) {
  const [stored, setStored] = useLocalStorageState(storageKey, isDemo ? DEMO_RULES : [])

  const rules = useMemo(() => {
    const raw = Array.isArray(stored) ? stored : []
    const normalized = raw.map(normalizeRule).filter((r) => r && r.title)
    if (!isDemo) return normalized
    const hasSeed = normalized.some((r) => String(r.id).startsWith('seed_'))
    if (normalized.length === 0 && !hasSeed) return DEMO_RULES.map(normalizeRule).filter(Boolean)
    return normalized
  }, [stored, isDemo])

  const [newTitle, setNewTitle] = useState('')
  const [newDetail, setNewDetail] = useState('')

  function addRule(e) {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    const next = [
      {
        id: makeId(),
        iconKey: 'badge',
        title,
        detail: newDetail.trim(),
      },
      ...rules,
    ]
    setStored(next)
    setNewTitle('')
    setNewDetail('')
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div>
          <p className="text-sm font-medium text-slate-600">Rules</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">House guidelines</h2>
          <p className="mt-2 text-sm text-slate-600">
            {isDemo ? 'Demo baseline rules—same as before, stored for the demo profile only.' : 'Add rules for your household. Only you see this list on this device.'}
          </p>

          <form onSubmit={addRule} className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="block sm:col-span-1">
              <span className="sr-only">Rule title</span>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="New rule title"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              />
            </label>
            <label className="block sm:col-span-1">
              <span className="sr-only">Detail</span>
              <input
                value={newDetail}
                onChange={(e) => setNewDetail(e.target.value)}
                placeholder="Detail (optional)"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              />
            </label>
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className={[
                'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition',
                newTitle.trim()
                  ? 'bg-slate-900 text-white hover:bg-slate-800'
                  : 'cursor-not-allowed bg-slate-200 text-slate-500',
              ].join(' ')}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add rule
            </button>
          </form>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {rules.length === 0 ? (
              <div className="sm:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                No rules yet. Add one above.
              </div>
            ) : (
              rules.map((r) => {
                const Icon = ICON_MAP[r.iconKey] || BadgeCheck
                return (
                  <div key={r.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-800 shadow-sm">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{r.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{r.detail || '—'}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
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
