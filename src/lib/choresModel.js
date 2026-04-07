function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

export function normalizeChore(input, roster) {
  const list = Array.isArray(roster) && roster.length ? roster : []
  const fallback = list[0] || ''
  if (!input || typeof input !== 'object') return null
  const name = typeof input.name === 'string' ? input.name : ''
  const assigneeRaw = typeof input.assignee === 'string' ? input.assignee.trim() : ''
  const done = Boolean(input.done)
  const id = typeof input.id === 'string' ? input.id : makeId()
  const createdAt = typeof input.createdAt === 'number' ? input.createdAt : Date.now()
  const doneAt = typeof input.doneAt === 'number' ? input.doneAt : null
  return {
    id,
    name: name.trim(),
    assignee: list.includes(assigneeRaw) ? assigneeRaw : fallback,
    done,
    createdAt,
    doneAt: done ? (doneAt ?? Date.now()) : null,
  }
}

export const DEFAULT_CHORES = [
  { id: 'seed_1', name: 'Trash & recycling', assignee: 'Alex', done: false, createdAt: Date.now() - 86400000 },
  { id: 'seed_2', name: 'Kitchen reset', assignee: 'Demo user', done: false, createdAt: Date.now() - 3600000 },
  { id: 'seed_3', name: 'Bathroom wipe-down', assignee: 'Jordan', done: true, createdAt: Date.now() - 172800000, doneAt: Date.now() - 7200000 },
]
