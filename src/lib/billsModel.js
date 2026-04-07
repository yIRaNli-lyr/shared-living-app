const BILL_TONES = ['amber', 'indigo', 'emerald', 'slate']
const ICON_KEYS = new Set(['receipt', 'creditCard', 'shieldCheck', 'handCoins'])

export const BILL_CATEGORIES = ['utilities', 'supplies', 'groceries', 'rent_split', 'other']

export function categoryToTone(category) {
  const map = {
    utilities: 'amber',
    supplies: 'emerald',
    groceries: 'indigo',
    rent_split: 'slate',
    other: 'slate',
  }
  return map[category] || 'slate'
}

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

export function normalizeBill(input, roster) {
  const list = Array.isArray(roster) && roster.length ? roster : []
  const fallback = list[0] || ''
  if (!input || typeof input !== 'object') return null
  const id = typeof input.id === 'string' ? input.id : makeId()
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const amountNum = Number(input.amount)
  const amount = Number.isFinite(amountNum) ? Math.max(0, amountNum) : 0
  const due = typeof input.due === 'string' ? input.due.trim() : ''
  const explicitCategory =
    typeof input.category === 'string' && BILL_CATEGORIES.includes(input.category)
  const category = explicitCategory ? input.category : 'other'
  const categoryOther = typeof input.categoryOther === 'string' ? input.categoryOther.trim() : ''
  const receiptNote = typeof input.receiptNote === 'string' ? input.receiptNote.trim() : ''
  let receiptImageData = typeof input.receiptImageData === 'string' ? input.receiptImageData.trim() : ''
  if (receiptImageData && !receiptImageData.startsWith('data:image/')) receiptImageData = ''
  const receiptFileName =
    typeof input.receiptFileName === 'string' ? input.receiptFileName.trim().slice(0, 240) : ''
  const tone = explicitCategory
    ? categoryToTone(category)
    : typeof input.tone === 'string' && BILL_TONES.includes(input.tone)
      ? input.tone
      : 'slate'
  const iconKeyRaw = typeof input.iconKey === 'string' ? input.iconKey : ''
  const iconKey = ICON_KEYS.has(iconKeyRaw) ? iconKeyRaw : 'receipt'
  const splitType = input.splitType === 'custom' ? 'custom' : 'even'
  const splitNotes = typeof input.splitNotes === 'string' ? input.splitNotes.trim() : ''
  let participantsCount = Number(input.participantsCount)
  if (!Number.isFinite(participantsCount) || participantsCount < 1) {
    participantsCount = splitType === 'even' ? Math.min(3, Math.max(1, list.length)) : 0
  }
  if (splitType === 'even' && list.length) {
    participantsCount = Math.min(participantsCount, list.length)
  }
  const payerRaw = typeof input.payer === 'string' ? input.payer.trim() : ''
  const payer = list.includes(payerRaw) ? payerRaw : fallback
  const settledShares = Array.isArray(input.settledShares)
    ? [...new Set(input.settledShares.filter((x) => typeof x === 'string').map((s) => s.trim()).filter(Boolean))]
    : []
  return {
    id,
    title,
    amount,
    due: due || 'Anytime',
    tone,
    iconKey,
    category,
    categoryOther,
    receiptNote,
    receiptImageData,
    receiptFileName,
    splitType,
    participantsCount,
    splitNotes,
    payer,
    settledShares,
  }
}

export const DEFAULT_BILLS = [
  {
    id: 'internet',
    title: 'Internet',
    amount: 50,
    due: 'In 3 days',
    category: 'utilities',
    categoryOther: '',
    receiptNote: '',
    receiptImageData: '',
    receiptFileName: '',
    tone: 'amber',
    iconKey: 'receipt',
    splitType: 'even',
    participantsCount: 3,
    splitNotes: '',
    payer: 'Demo user',
    settledShares: [],
  },
  {
    id: 'electric',
    title: 'Electric',
    amount: 34,
    due: 'Next week',
    category: 'utilities',
    categoryOther: '',
    receiptNote: '',
    receiptImageData: '',
    receiptFileName: '',
    tone: 'indigo',
    iconKey: 'creditCard',
    splitType: 'even',
    participantsCount: 3,
    splitNotes: '',
    payer: 'Demo user',
    settledShares: [],
  },
  {
    id: 'cleaning',
    title: 'Cleaning supplies',
    amount: 18,
    due: 'Anytime',
    category: 'supplies',
    categoryOther: '',
    receiptNote: '',
    receiptImageData: '',
    receiptFileName: '',
    tone: 'emerald',
    iconKey: 'shieldCheck',
    splitType: 'even',
    participantsCount: 3,
    splitNotes: '',
    payer: 'Demo user',
    settledShares: [],
  },
]
