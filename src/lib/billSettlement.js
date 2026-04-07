import { parseBillDueDate, startOfDay, upcomingBillsSorted } from './billDueDate'
import { sharesForBill } from './billsSplit'

function balanceSortKey(a, b, roster) {
  const list = Array.isArray(roster) ? roster : []
  const ia = list.indexOf(a)
  const ib = list.indexOf(b)
  if (ia !== -1 && ib !== -1) return ia - ib
  if (ia !== -1) return -1
  if (ib !== -1) return 1
  return a.localeCompare(b)
}

/**
 * Net per person after settlement marks: payer fronts the bill; each share reduces your balance;
 * when a debtor marks paid, their obligation clears and the payer's outstanding receivable drops.
 */
export function balanceDeltasFromBills(bills, roster) {
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
    const settled = new Set(b.settledShares || [])
    const shares = sharesForBill(b, roster)

    add(payer, b.amount)
    for (const { name, share } of shares) {
      add(name, -share)
    }
    for (const { name, share } of shares) {
      if (name === payer) continue
      if (share < 0.005) continue
      if (settled.has(name)) {
        add(payer, -share)
        add(name, share)
      }
    }
  }
  return delta
}

export function formatNetMoney(net) {
  const rounded = Math.round(net * 100) / 100
  const sign = rounded >= 0 ? '+' : '-'
  const abs = Math.abs(rounded)
  return `${sign}$${abs.toFixed(2)}`
}

export function fmtAmountPlain(v) {
  const n = Math.round(Number(v) * 100) / 100
  return `$${n.toFixed(2)}`
}

/** Non-payer shares owed toward the bill (settlement targets). */
export function debtorSharesForBill(b, roster) {
  const payer = b.payer || (roster.length ? roster[0] : '')
  return sharesForBill(b, roster).filter((s) => s.name !== payer && s.share >= 0.005)
}

export function buildSettlementInsights(bills, roster, me) {
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

function userInvolvedInBill(bill, roster, username) {
  const me = String(username || '').trim()
  if (!me) return false
  if (bill.payer === me) return true
  return sharesForBill(bill, roster).some((s) => s.name === me && s.share >= 0.005)
}

/**
 * Bills that matter for the dashboard list: unsettled owe/collect for this user, or future due date (FYI).
 * Sorted: pending settlement first, then by due date, then title.
 */
export function listUserRelevantBillsOrdered(bills, roster, username, now = new Date()) {
  const me = String(username || '').trim()
  if (!me || !Array.isArray(bills) || !bills.length) return []
  const t0 = startOfDay(now)
  const rows = []
  for (const b of bills) {
    if (!userInvolvedInBill(b, roster, me)) continue
    const payer = b.payer || roster[0] || ''
    const shares = sharesForBill(b, roster)
    const settled = new Set(b.settledShares || [])
    const myShare = shares.find((s) => s.name === me)?.share ?? 0

    let pendingOwe = 0
    if (me !== payer && myShare >= 0.005 && !settled.has(me)) pendingOwe = myShare

    let pendingCollect = 0
    if (me === payer) {
      for (const { name, share } of shares) {
        if (name === payer) continue
        if (share < 0.005) continue
        if (!settled.has(name)) pendingCollect += share
      }
    }

    const sortDate = parseBillDueDate(b.due, now)
    const hasFutureDue = Boolean(sortDate && sortDate >= t0)

    const hasPending = pendingOwe >= 0.005 || pendingCollect >= 0.005
    if (!hasPending && !hasFutureDue) continue

    /** @type {'pay' | 'collect' | 'due'} */
    let kind = 'due'
    if (pendingOwe >= 0.005) kind = 'pay'
    else if (pendingCollect >= 0.005) kind = 'collect'

    let detail = ''
    if (kind === 'pay') detail = `${fmtAmountPlain(pendingOwe)} → ${payer}`
    else if (kind === 'collect') detail = `${fmtAmountPlain(pendingCollect)} from roommates`
    else detail = 'All settled on your side · due date coming up'

    rows.push({
      bill: b,
      sortDate,
      pendingOwe,
      pendingCollect,
      kind,
      detail,
      hasPending,
    })
  }
  rows.sort((a, b) => {
    const pa = a.hasPending ? 0 : 1
    const pb = b.hasPending ? 0 : 1
    if (pa !== pb) return pa - pb
    const ta = a.sortDate ? a.sortDate.getTime() : Number.POSITIVE_INFINITY
    const tb = b.sortDate ? b.sortDate.getTime() : Number.POSITIVE_INFINITY
    if (ta !== tb) return ta - tb
    return String(a.bill.title).localeCompare(String(b.bill.title))
  })
  return rows
}

/**
 * Dashboard: prioritize unpaid share (owe / collect), else next upcoming bill the user is on.
 */
export function personalizedNextBillSummary(bills, roster, username, now = new Date()) {
  const me = String(username || '').trim()
  if (!me) return { value: '—', sub: 'Sign in to see bills' }
  if (!bills.length) return { value: '—', sub: 'Add bills in the Bills tab' }

  const candidates = []
  for (const b of bills) {
    const payer = b.payer || roster[0] || ''
    const shares = sharesForBill(b, roster)
    const settled = new Set(b.settledShares || [])
    const myShare = shares.find((s) => s.name === me)?.share ?? 0

    if (me !== payer) {
      if (myShare >= 0.005 && !settled.has(me)) {
        candidates.push({
          sortDate: parseBillDueDate(b.due, now),
          line: `${b.title} · owe ${fmtAmountPlain(myShare)}`,
          sub: String(b.due || '').trim() || 'Anytime',
        })
      }
    } else {
      let pendingIn = 0
      for (const { name, share } of shares) {
        if (name === payer) continue
        if (share < 0.005) continue
        if (!settled.has(name)) pendingIn += share
      }
      if (pendingIn >= 0.005) {
        candidates.push({
          sortDate: parseBillDueDate(b.due, now),
          line: `${b.title} · collect ${fmtAmountPlain(pendingIn)}`,
          sub: String(b.due || '').trim() || 'Anytime',
        })
      }
    }
  }

  const sortKey = (c) => (c.sortDate ? c.sortDate.getTime() : Number.POSITIVE_INFINITY)

  if (candidates.length) {
    candidates.sort((a, b) => sortKey(a) - sortKey(b))
    const c = candidates[0]
    return { value: c.line, sub: c.sub }
  }

  const upcoming = upcomingBillsSorted(bills, now).filter((b) => userInvolvedInBill(b, roster, me))
  if (upcoming.length) {
    const b = upcoming[0]
    return {
      value: `${b.title} · ${fmtAmountPlain(b.amount)}`,
      sub: b.due || 'Upcoming',
    }
  }

  return { value: '—', sub: 'No pending shares or upcoming due dates' }
}
