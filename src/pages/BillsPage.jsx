import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, CreditCard, HandCoins, Plus, Receipt, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import { BILL_CATEGORIES, categoryToTone, DEFAULT_BILLS, normalizeBill } from '../lib/billsModel'
import { formatCustomSplitPercents, parseCustomSplitItems, sharesForBill } from '../lib/billsSplit'
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

const ICON_MAP = {
  receipt: Receipt,
  creditCard: CreditCard,
  shieldCheck: ShieldCheck,
  handCoins: HandCoins,
}

const CATEGORY_LABELS = {
  utilities: 'Utilities',
  supplies: 'Supplies',
  groceries: 'Groceries',
  rent_split: 'Rent split',
  other: 'Other',
}

function formatCategoryLabel(b) {
  return CATEGORY_LABELS[b.category] || CATEGORY_LABELS.other
}

const fieldLabelClass = 'mb-1.5 block text-xs font-semibold tracking-wide text-slate-600'
const fieldInputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100'

const RECEIPT_ACCEPT = 'image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
const MAX_RECEIPT_FILE_BYTES = 2 * 1024 * 1024

function formatDuePill(due) {
  const s = String(due || '').trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }
  return s || 'Anytime'
}

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

function makeRowId() {
  return `row_${makeId()}`
}

/** @param {number} n */
function equalPercentsForCount(n) {
  if (n <= 0) return []
  if (n === 1) return [100]
  const raw = 100 / n
  const parts = []
  let sum = 0
  for (let i = 0; i < n - 1; i++) {
    const p = Math.round(raw * 100) / 100
    parts.push(p)
    sum += p
  }
  parts.push(Math.round((100 - sum) * 100) / 100)
  return parts
}

/** @param {string[]} roster */
function buildDefaultCustomRows(roster) {
  if (!roster.length) return [{ id: makeRowId(), member: '', percent: '' }]
  const pcts = equalPercentsForCount(roster.length)
  return roster.map((member, i) => ({
    id: makeRowId(),
    member,
    percent: String(pcts[i]),
  }))
}

function parsePercentInput(s) {
  const t = String(s ?? '').trim()
  if (t === '') return null
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : null
}

function customRowsTotal(rows) {
  let sum = 0
  let any = false
  for (const r of rows) {
    const p = parsePercentInput(r.percent)
    if (p === null) continue
    any = true
    sum += p
  }
  return { sum, any }
}

function isCustomRowsValid(rows, roster) {
  if (!rows.length) return false
  const seen = new Set()
  for (const r of rows) {
    const m = typeof r.member === 'string' ? r.member.trim() : ''
    if (!m || !roster.includes(m)) return false
    if (seen.has(m)) return false
    seen.add(m)
    const p = parsePercentInput(r.percent)
    if (p === null || p < 0) return false
  }
  const { sum } = customRowsTotal(rows)
  return Math.abs(sum - 100) < 0.005
}

function serializeCustomRows(rows) {
  return formatCustomSplitPercents(
    rows.map((r) => ({
      member: r.member,
      percent: parsePercentInput(r.percent),
    })),
  )
}

function CustomSplitCardSummary({ notes }) {
  const items = parseCustomSplitItems(notes)
  if (!items?.length) {
    return (
      <>
        <p className="mt-2 text-xs text-slate-500">Custom split</p>
        <p className="mt-1 text-xs font-medium text-rose-600">Total: —</p>
      </>
    )
  }
  const sumW = items.reduce((s, i) => s + i.w, 0)
  const lines = items.map((i, idx) => {
    const displayPct = i.pct ? i.w : (i.w / sumW) * 100
    const rounded = Math.round(displayPct * 100) / 100
    const label = i.pct ? `${i.name} · ${rounded}%` : `${i.name} · ${rounded}% (weights)`
    return (
      <p key={idx} className="text-xs text-slate-600">
        {label}
      </p>
    )
  })
  const totalPct = items[0].pct ? sumW : 100
  const totalOk = items[0].pct ? Math.abs(sumW - 100) < 0.05 : true
  return (
    <>
      <div className="mt-2 space-y-0.5">{lines}</div>
      <p className={['mt-1 text-xs font-medium', totalOk ? 'text-slate-600' : 'text-rose-600'].join(' ')}>
        Total: {Math.round(totalPct * 100) / 100}%
        {!totalOk ? ' · should be 100%' : ''}
      </p>
    </>
  )
}

/** Net balance: payer +full amount; each participant −their share. Positive = owed back, negative = owes. */
function balanceDeltasFromBills(bills, roster) {
  const delta = new Map()
  const add = (name, v) => {
    if (!name || typeof v !== 'number' || !Number.isFinite(v)) return
    const k = String(name).trim()
    if (!k) return
    delta.set(k, (delta.get(k) || 0) + v)
  }

  const list = Array.isArray(roster) && roster.length ? roster : ['']
  for (const b of bills) {
    const payer = b.payer || list[0] || ''
    add(payer, b.amount)
    for (const { name, share } of sharesForBill(b, roster)) {
      add(name, -share)
    }
  }
  return delta
}

function balanceSortKey(a, b, roster) {
  const list = Array.isArray(roster) ? roster : []
  const ia = list.indexOf(a)
  const ib = list.indexOf(b)
  if (ia !== -1 && ib !== -1) return ia - ib
  if (ia !== -1) return -1
  if (ib !== -1) return 1
  return a.localeCompare(b)
}

function formatNetMoney(net) {
  const rounded = Math.round(net * 100) / 100
  const sign = rounded >= 0 ? '+' : '-'
  const abs = Math.abs(rounded)
  return `${sign}$${abs.toFixed(2)}`
}

function fmtAmountPlain(v) {
  const n = Math.round(Number(v) * 100) / 100
  return `$${n.toFixed(2)}`
}

/** Shares owed to the payer (everyone in the split except the person who paid). */
function debtorSharesForBill(b, roster) {
  const payer = b.payer || (roster.length ? roster[0] : '')
  return sharesForBill(b, roster).filter((s) => s.name !== payer && s.share >= 0.005)
}

function buildSettlementInsights(bills, roster, me) {
  const empty = {
    receivePending: 0,
    payPending: 0,
    receiveFrom: /** @type {{ who: string, amount: number }[]} */ ([]),
    payTo: /** @type {{ who: string, amount: number }[]} */ ([]),
    netForMe: 0,
  }
  if (!me || !roster.length) return empty
  const delta = balanceDeltasFromBills(bills, roster)
  const netForMe = delta.get(me) || 0
  const receiveMap = new Map()
  const payMap = new Map()
  let receivePending = 0
  let payPending = 0
  for (const b of bills) {
    const payer = b.payer || roster[0] || ''
    const settled = new Set(b.settledShares || [])
    for (const { name, share } of sharesForBill(b, roster)) {
      if (share < 0.005 || name === payer) continue
      if (settled.has(name)) continue
      if (payer === me && name !== me) {
        receivePending += share
        receiveMap.set(name, (receiveMap.get(name) || 0) + share)
      }
      if (name === me && payer !== me) {
        payPending += share
        payMap.set(payer, (payMap.get(payer) || 0) + share)
      }
    }
  }
  const receiveFrom = [...receiveMap.entries()]
    .map(([who, amount]) => ({ who, amount }))
    .sort((a, b) => balanceSortKey(a.who, b.who, roster))
  const payTo = [...payMap.entries()]
    .map(([who, amount]) => ({ who, amount }))
    .sort((a, b) => balanceSortKey(a.who, b.who, roster))
  return { receivePending, payPending, receiveFrom, payTo, netForMe }
}

function splitSummaryEven(b) {
  const n = b.participantsCount
  const label = n === 1 ? 'person' : 'people'
  return `Even split · ${n} ${label}`
}

export default function BillsPage({ storageKey, isDemo, members }) {
  /** One list for the whole page: same source as App `members`, stable reference while names/order unchanged. */
  const householdMembersKey =
    Array.isArray(members) && members.length ? members.join('\u0001') : ''
  const householdMembers = useMemo(() => {
    if (!Array.isArray(members) || !members.length) return []
    return members
  }, [householdMembersKey])

  const [stored, setStored] = useLocalStorageState(storageKey, isDemo ? DEFAULT_BILLS : [])

  const bills = useMemo(() => {
    const raw = Array.isArray(stored) ? stored : []
    return raw.map((b) => normalizeBill(b, householdMembers)).filter((b) => b && b.title)
  }, [stored, householdMembers])

  const balanceRows = useMemo(() => {
    const delta = balanceDeltasFromBills(bills, householdMembers)
    const names = new Set([...householdMembers, ...delta.keys()])
    return [...names]
      .filter((who) => Math.abs(delta.get(who) || 0) >= 0.005)
      .sort((a, b) => balanceSortKey(a, b, householdMembers))
      .map((who) => {
        const net = delta.get(who) || 0
        return {
          who,
          amount: formatNetMoney(net),
          tone: net >= 0 ? 'text-emerald-700' : 'text-rose-700',
        }
      })
  }, [bills, householdMembers])

  const me = householdMembers[0] || ''
  const settlementForYou = useMemo(
    () => buildSettlementInsights(bills, householdMembers, me),
    [bills, householdMembers, me],
  )

  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [due, setDue] = useState('')
  const [category, setCategory] = useState('utilities')
  const [receiptSource, setReceiptSource] = useState('none')
  const [receiptImageData, setReceiptImageData] = useState('')
  const [receiptFileName, setReceiptFileName] = useState('')
  const receiptFileInputRef = useRef(null)
  const [splitType, setSplitType] = useState('even')
  const [participantsCount, setParticipantsCount] = useState('3')
  const [customRows, setCustomRows] = useState([])
  const [payer, setPayer] = useState('')

  useEffect(() => {
    if (householdMembers.length > 0 && !householdMembers.includes(payer)) setPayer(householdMembers[0])
  }, [householdMembers, payer])

  useEffect(() => {
    if (splitType !== 'custom') return
    setCustomRows(buildDefaultCustomRows(householdMembers))
  }, [splitType, householdMembersKey, householdMembers])

  const customTotal = useMemo(() => customRowsTotal(customRows), [customRows])
  const customTotalDisplay = Math.round(customTotal.sum * 100) / 100
  const unusedRosterForCustom = useMemo(
    () => householdMembers.filter((m) => !customRows.some((r) => r.member === m)),
    [householdMembers, customRows],
  )

  function removeBill(id) {
    setStored(bills.filter((b) => b.id !== id))
  }

  function clearReceiptForm() {
    setReceiptSource('none')
    setReceiptImageData('')
    setReceiptFileName('')
    if (receiptFileInputRef.current) receiptFileInputRef.current.value = ''
  }

  function onReceiptFileChosen(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const okType =
      /^image\/(jpeg|jpg|png|webp)$/i.test(file.type) ||
      /\.(jpe?g|png|webp)$/i.test(file.name)
    if (!okType) {
      window.alert('Please choose a JPG, PNG, or WebP image.')
      return
    }
    if (file.size > MAX_RECEIPT_FILE_BYTES) {
      window.alert('Image is too large. Please use a file under 2 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const data = String(reader.result || '')
      if (!data.startsWith('data:image/')) return
      setReceiptSource('image')
      setReceiptImageData(data)
      setReceiptFileName(file.name)
    }
    reader.readAsDataURL(file)
  }

  function toggleDebtorShareSettled(billId, memberName) {
    setStored((prev) => {
      const list = Array.isArray(prev) ? prev : []
      return list.map((raw) => {
        if (raw.id !== billId) return raw
        const cur = Array.isArray(raw.settledShares) ? [...raw.settledShares] : []
        const idx = cur.indexOf(memberName)
        if (idx >= 0) cur.splice(idx, 1)
        else cur.push(memberName)
        return { ...raw, settledShares: cur }
      })
    })
  }

  function addBill(e) {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    const amountNum = parseFloat(amount)
    if (!Number.isFinite(amountNum) || amountNum < 0) return
    const normalizedSplit = splitType === 'custom' ? 'custom' : 'even'
    let pc = 3
    if (normalizedSplit === 'even') {
      pc = parseInt(participantsCount, 10)
      if (!Number.isFinite(pc) || pc < 1) return
      if (householdMembers.length) pc = Math.min(pc, householdMembers.length)
    }
    let splitNotesStored = ''
    if (normalizedSplit === 'custom') {
      if (!isCustomRowsValid(customRows, householdMembers)) return
      splitNotesStored = serializeCustomRows(customRows)
    }
    const cat = BILL_CATEGORIES.includes(category) ? category : 'other'
    const newBill = {
      id: makeId(),
      title: trimmedTitle,
      amount: amountNum,
      due: due.trim() || 'Anytime',
      category: cat,
      categoryOther: '',
      receiptNote: '',
      receiptImageData: receiptSource === 'image' ? receiptImageData : '',
      receiptFileName: receiptSource === 'image' ? receiptFileName.trim().slice(0, 240) : '',
      tone: categoryToTone(cat),
      iconKey: 'receipt',
      splitType: normalizedSplit,
      participantsCount: normalizedSplit === 'even' ? pc : 0,
      splitNotes: splitNotesStored,
      payer: householdMembers.includes(payer) ? payer : householdMembers[0] || '',
      settledShares: [],
    }
    setStored([newBill, ...bills])
    setTitle('')
    setAmount('')
    setDue('')
    setCategory('utilities')
    clearReceiptForm()
    setSplitType('even')
    setParticipantsCount(String(Math.min(3, Math.max(1, householdMembers.length || 3))))
    setCustomRows([])
    setPayer(householdMembers[0] || '')
  }

  function addCustomRow() {
    setCustomRows((rows) => {
      const used = new Set(rows.map((r) => r.member).filter(Boolean))
      const nextMember = householdMembers.find((m) => !used.has(m))
      if (!nextMember) return rows
      return [...rows, { id: makeRowId(), member: nextMember, percent: '' }]
    })
  }

  function removeCustomRow(rowId) {
    setCustomRows((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.id !== rowId)))
  }

  const addDisabledBase =
    !title.trim() || amount === '' || !Number.isFinite(parseFloat(amount)) || parseFloat(amount) < 0
  const addDisabledEven =
    splitType === 'even' &&
    (!participantsCount.trim() ||
      !Number.isFinite(parseInt(participantsCount, 10)) ||
      parseInt(participantsCount, 10) < 1)
  const addDisabledCustom = splitType === 'custom' && !isCustomRowsValid(customRows, householdMembers)
  const addDisabled = addDisabledBase || addDisabledEven || addDisabledCustom

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

            <form onSubmit={addBill} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block">
                  <span className={fieldLabelClass}>Bill title</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Internet, Electricity"
                    className={fieldInputClass}
                  />
                </label>
                <label className="block">
                  <span className={fieldLabelClass}>Amount</span>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className={fieldInputClass}
                  />
                </label>
                <label className="block sm:col-span-2 lg:col-span-1">
                  <span className={fieldLabelClass}>Due date</span>
                  <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={fieldInputClass} />
                  <span className="mt-1 block text-xs text-slate-500">Leave empty for anytime</span>
                </label>
              </div>

              <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
                <div>
                  <span className={fieldLabelClass}>Category</span>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`${fieldInputClass} appearance-none pr-10`}
                  >
                    {BILL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className={fieldLabelClass}>Receipt</span>
                  <p className="mb-2 text-xs leading-relaxed text-slate-500">
                    Optional. Choose <span className="font-medium text-slate-600">None</span> or upload a JPG, PNG, or
                    WebP (max 2 MB). Stored only in this browser.
                  </p>
                  <input
                    ref={receiptFileInputRef}
                    type="file"
                    accept={RECEIPT_ACCEPT}
                    className="sr-only"
                    onChange={onReceiptFileChosen}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => clearReceiptForm()}
                      className={[
                        'inline-flex items-center gap-1.5 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition',
                        receiptSource === 'none'
                          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50',
                      ].join(' ')}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => receiptFileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/70 px-4 py-2.5 text-sm font-semibold text-emerald-900 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50"
                    >
                      <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
                      Upload image
                    </button>
                  </div>
                  {receiptSource === 'image' && receiptImageData ? (
                    <div className="mt-3 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-white p-3 shadow-sm">
                      <img
                        src={receiptImageData}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-xl border border-slate-100 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-900">{receiptFileName || 'Receipt'}</p>
                        <p className="text-xs text-emerald-700">Attached to this bill</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => clearReceiptForm()}
                        className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                        aria-label="Remove receipt"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">No receipt attached.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                <p className={`${fieldLabelClass} text-slate-700`}>Split & pay</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block sm:col-span-2 lg:col-span-1">
                    <span className="mb-1 block text-xs font-medium text-slate-500">Paid by</span>
                    <select
                      value={payer}
                      onChange={(e) => setPayer(e.target.value)}
                      className={`${fieldInputClass} appearance-none pr-10`}
                    >
                      {householdMembers.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block sm:col-span-2 lg:col-span-1">
                    <span className="mb-1 block text-xs font-medium text-slate-500">Split type</span>
                    <select
                      value={splitType}
                      onChange={(e) => setSplitType(e.target.value)}
                      className={`${fieldInputClass} appearance-none pr-10`}
                    >
                      <option value="even">Even split</option>
                      <option value="custom">Custom split</option>
                    </select>
                  </label>

                  {splitType === 'even' ? (
                    <label className="block sm:col-span-2 lg:col-span-2">
                      <span className="mb-1 block text-xs font-medium text-slate-500">Participants</span>
                      <input
                        value={participantsCount}
                        onChange={(e) => setParticipantsCount(e.target.value)}
                        inputMode="numeric"
                        min={1}
                        placeholder="Number of people"
                        className={fieldInputClass}
                      />
                    </label>
                  ) : null}
                </div>

                {splitType === 'even' ? null : (
                  <div className="mt-4 space-y-3 border-t border-slate-200/80 pt-4">
                    {householdMembers.length === 0 ? (
                      <p className="text-sm text-slate-600">Add household members to use a custom split.</p>
                    ) : (
                      <>
                        {customRows.map((row) => (
                          <div key={row.id} className="flex flex-wrap items-end gap-2">
                            <label className="min-w-[160px] flex-1">
                              <span className="sr-only">Member</span>
                              <select
                                value={row.member}
                                onChange={(e) =>
                                  setCustomRows((rows) =>
                                    rows.map((r) => (r.id === row.id ? { ...r, member: e.target.value } : r)),
                                  )
                                }
                                className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                              >
                                <option value="">Member</option>
                                {householdMembers.map((m) => (
                                  <option
                                    key={m}
                                    value={m}
                                    disabled={
                                      m !== row.member && customRows.some((r) => r.id !== row.id && r.member === m)
                                    }
                                  >
                                    {m}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="flex w-[112px] shrink-0 items-center gap-1">
                              <span className="sr-only">Percent</span>
                              <input
                                value={row.percent}
                                onChange={(e) =>
                                  setCustomRows((rows) =>
                                    rows.map((r) => (r.id === row.id ? { ...r, percent: e.target.value } : r)),
                                  )
                                }
                                inputMode="decimal"
                                placeholder="0"
                                className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100"
                              />
                              <span className="shrink-0 text-sm font-medium text-slate-600" aria-hidden="true">
                                %
                              </span>
                            </label>
                            {customRows.length > 1 ? (
                              <button
                                type="button"
                                onClick={() => removeCustomRow(row.id)}
                                className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                        ))}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={addCustomRow}
                            disabled={unusedRosterForCustom.length === 0}
                            className={[
                              'rounded-2xl border px-4 py-2 text-xs font-semibold shadow-sm transition',
                              unusedRosterForCustom.length
                                ? 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                                : 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400',
                            ].join(' ')}
                          >
                            Add member
                          </button>
                          <p
                            className={[
                              'text-sm font-semibold',
                              householdMembers.length && isCustomRowsValid(customRows, householdMembers)
                                ? 'text-slate-700'
                                : 'text-rose-600',
                            ].join(' ')}
                          >
                            Total: {customTotalDisplay}%
                          </p>
                        </div>
                        {splitType === 'custom' &&
                        householdMembers.length > 0 &&
                        !isCustomRowsValid(customRows, householdMembers) ? (
                          <p className="text-xs text-rose-600">
                            Each row needs a unique member and a non-negative percent. Total must equal 100%.
                          </p>
                        ) : null}
                      </>
                    )}
                  </div>
                )}

                <div className="mt-5 flex justify-end border-t border-slate-200/80 pt-4">
                  <button
                    type="submit"
                    disabled={addDisabled}
                    className={[
                      'inline-flex min-w-[120px] items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold shadow-sm transition',
                      !addDisabled ? 'bg-slate-900 text-white hover:bg-slate-800' : 'cursor-not-allowed bg-slate-200 text-slate-500',
                    ].join(' ')}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add bill
                  </button>
                </div>
              </div>
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
                      <div className="flex items-start gap-1">
                        <Pill tone={b.tone}>{formatDuePill(b.due)}</Pill>
                        <button
                          type="button"
                          onClick={() => removeBill(b.id)}
                          className="rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          aria-label={`Remove ${b.title}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{b.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Category ·{' '}
                      <span className="font-semibold text-slate-700">{formatCategoryLabel(b)}</span>
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">${b.amount}</p>
                    {b.receiptImageData ? (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/80 p-2">
                        <img
                          src={b.receiptImageData}
                          alt="Receipt"
                          className="max-h-36 w-full rounded-lg object-contain"
                        />
                        {b.receiptFileName ? (
                          <p className="mt-1 truncate text-xs font-medium text-slate-600">{b.receiptFileName}</p>
                        ) : null}
                        <a
                          href={b.receiptImageData}
                          download={b.receiptFileName || 'receipt'}
                          className="mt-1 inline-block text-xs font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
                        >
                          Open / save image
                        </a>
                      </div>
                    ) : b.receiptNote ? (
                      /^https?:\/\//i.test(b.receiptNote) ? (
                        <p className="mt-1 text-xs">
                          <a
                            href={b.receiptNote}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
                          >
                            View receipt link
                          </a>
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-600">
                          Receipt note: <span className="font-medium text-slate-800">{b.receiptNote}</span>
                        </p>
                      )
                    ) : null}
                    {b.splitType === 'custom' ? (
                      <CustomSplitCardSummary notes={b.splitNotes} />
                    ) : (
                      <p className="mt-2 text-xs text-slate-500">{splitSummaryEven(b)}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      Paid by <span className="font-semibold text-slate-700">{b.payer}</span>
                    </p>
                    {debtorSharesForBill(b, householdMembers).length > 0 ? (
                      <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/90 p-3">
                        <p className="text-xs font-semibold text-slate-600">Split settlement</p>
                        <ul className="mt-2 space-y-2">
                          {debtorSharesForBill(b, householdMembers).map(({ name, share }) => {
                            const paid = (b.settledShares || []).includes(name)
                            return (
                              <li
                                key={name}
                                className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                              >
                                <span className="text-xs text-slate-700">
                                  <span className="font-semibold">{name}</span>
                                  <span className="text-slate-500"> · {fmtAmountPlain(share)}</span>
                                </span>
                                <div className="flex items-center gap-2">
                                  {paid ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                      Paid
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                                      Pending
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => toggleDebtorShareSettled(b.id, name)}
                                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                                  >
                                    {paid ? 'Undo' : 'Mark paid'}
                                  </button>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold tracking-tight text-slate-900">Balances & settlement</h3>
          <p className="mt-1 text-sm text-slate-600">
            Net totals include all bills. Pending amounts are shares not yet marked paid on each bill (you vs roommates).
          </p>

          {me ? (
            <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">You ({me})</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Should receive (pending)</span>
                <span className="font-semibold text-emerald-700">{fmtAmountPlain(settlementForYou.receivePending)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Should pay (pending)</span>
                <span className="font-semibold text-rose-700">{fmtAmountPlain(settlementForYou.payPending)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-sm">
                <span className="font-medium text-slate-700">Net balance</span>
                <span
                  className={[
                    'font-semibold',
                    settlementForYou.netForMe >= 0 ? 'text-emerald-700' : 'text-rose-700',
                  ].join(' ')}
                >
                  {formatNetMoney(settlementForYou.netForMe)}
                </span>
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-900">Pending by person</p>
            {settlementForYou.receiveFrom.length === 0 && settlementForYou.payTo.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No pending settlement items. Mark shares on each bill as needed.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {settlementForYou.receiveFrom.map(({ who, amount }) => (
                  <li
                    key={`recv-${who}`}
                    className="flex items-start justify-between gap-2 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{who}</p>
                        <p className="text-xs text-amber-900/90">Pending · owes you {fmtAmountPlain(amount)}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-amber-900">{fmtAmountPlain(amount)}</span>
                  </li>
                ))}
                {settlementForYou.payTo.map(({ who, amount }) => (
                  <li
                    key={`pay-${who}`}
                    className="flex items-start justify-between gap-2 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">To {who}</p>
                        <p className="text-xs text-amber-900/90">Pending · you still owe {fmtAmountPlain(amount)}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-amber-900">{fmtAmountPlain(amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-900">Net by person</p>
            <div className="mt-2 space-y-2">
              {balanceRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-600">
                  No net balances yet. Add a bill to see who paid and who owes.
                </div>
              ) : (
                balanceRows.map((row) => (
                  <div key={row.who} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{row.who}</p>
                    <p className={['text-sm font-semibold', row.tone].join(' ')}>{row.amount}</p>
                  </div>
                ))
              )}
            </div>
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
