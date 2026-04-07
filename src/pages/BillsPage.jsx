import { useMemo, useState } from 'react'
import { CreditCard, HandCoins, Plus, Receipt, ShieldCheck } from 'lucide-react'
import { useLocalStorageState } from '../lib/useLocalStorageState'

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

const STORAGE_KEY = 'slmvp.bills.v1'

const ICON_MAP = {
  receipt: Receipt,
  creditCard: CreditCard,
  shieldCheck: ShieldCheck,
  handCoins: HandCoins,
}

const DEFAULT_BILLS = [
  { id: 'internet', title: 'Internet', amount: 50, due: 'In 3 days', tone: 'amber', iconKey: 'receipt' },
  { id: 'electric', title: 'Electric', amount: 34, due: 'Next week', tone: 'indigo', iconKey: 'creditCard' },
  { id: 'cleaning', title: 'Cleaning supplies', amount: 18, due: 'Anytime', tone: 'emerald', iconKey: 'shieldCheck' },
]

const BILL_TONES = ['amber', 'indigo', 'emerald', 'slate']

const ICON_OPTIONS = [
  { key: 'receipt', label: 'Receipt' },
  { key: 'creditCard', label: 'Card' },
  { key: 'shieldCheck', label: 'Shield' },
  { key: 'handCoins', label: 'Coins' },
]

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

function normalizeBill(input) {
  if (!input || typeof input !== 'object') return null
  const id = typeof input.id === 'string' ? input.id : makeId()
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const amountNum = Number(input.amount)
  const amount = Number.isFinite(amountNum) ? Math.max(0, amountNum) : 0
  const due = typeof input.due === 'string' ? input.due.trim() : ''
  const tone = typeof input.tone === 'string' && BILL_TONES.includes(input.tone) ? input.tone : 'slate'
  const iconKey =
    typeof input.iconKey === 'string' && Object.prototype.hasOwnProperty.call(ICON_MAP, input.iconKey)
      ? input.iconKey
      : 'receipt'
  return {
    id,
    title,
    amount,
    due: due || 'Anytime',
    tone,
    iconKey,
  }
}

export default function BillsPage() {
  const [stored, setStored] = useLocalStorageState(STORAGE_KEY, DEFAULT_BILLS)

  const bills = useMemo(() => {
    const raw = Array.isArray(stored) ? stored : []
    return raw.map(normalizeBill).filter((b) => b && b.title)
  }, [stored])

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [due, setDue] = useState('')
  const [tone, setTone] = useState('amber')
  const [iconKey, setIconKey] = useState('receipt')

  function addBill(e) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    const amountNum = parseFloat(amount)
    if (!Number.isFinite(amountNum) || amountNum < 0) return
    const newBill = {
      id: makeId(),
      title: trimmedTitle,
      amount: amountNum,
      due: due.trim() || 'Anytime',
      tone: BILL_TONES.includes(tone) ? tone : 'amber',
      iconKey: Object.prototype.hasOwnProperty.call(ICON_MAP, iconKey) ? iconKey : 'receipt',
    }
    setStored([newBill, ...bills])
    setTitle('')
    setAmount('')
    setDue('')
    setTone('amber')
    setIconKey('receipt')
  }

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
                  Track what’s coming up. New bills persist in your browser via{' '}
                  <span className="font-semibold">localStorage</span>.
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

            <form
              onSubmit={addBill}
              className="mt-5 grid gap-3 md:grid-cols-[1fr_minmax(0,120px)_1fr] lg:grid-cols-[1fr_minmax(0,120px)_1fr_160px_160px_auto]"
            >
              <label className="block md:col-span-1 lg:col-span-1">
                <span className="sr-only">Bill title</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Bill title (e.g., Internet)"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="sr-only">Amount</span>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  inputMode="decimal"
                  placeholder="Amount"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="block md:col-span-3 lg:col-span-1">
                <span className="sr-only">Due</span>
                <input
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  placeholder="Due (e.g., In 3 days)"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="block md:col-span-1 lg:col-span-1">
                <span className="sr-only">Tone</span>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                >
                  {BILL_TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-1 lg:col-span-1">
                <span className="sr-only">Icon</span>
                <select
                  value={iconKey}
                  onChange={(e) => setIconKey(e.target.value)}
                  className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                >
                  {ICON_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                disabled={!title.trim() || amount === '' || !Number.isFinite(parseFloat(amount)) || parseFloat(amount) < 0}
                className={[
                  'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition md:col-span-3 lg:col-span-1',
                  title.trim() && amount !== '' && Number.isFinite(parseFloat(amount)) && parseFloat(amount) >= 0
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'cursor-not-allowed bg-slate-200 text-slate-500',
                ].join(' ')}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </button>
            </form>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bills.map((b) => {
                const Icon = ICON_MAP[b.iconKey] || Receipt
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
