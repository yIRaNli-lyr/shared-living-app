import { useEffect, useMemo, useState } from 'react'

function safeJsonParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

export function useLocalStorageState(key, initialValue) {
  const initial = useMemo(() => {
    if (typeof window === 'undefined') return initialValue
    const raw = window.localStorage.getItem(key)
    if (raw == null) return initialValue
    const parsed = safeJsonParse(raw)
    return parsed === undefined ? initialValue : parsed
  }, [initialValue, key])

  const [state, setState] = useState(initial)

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state))
    } catch {
      // If storage is unavailable, keep app functional in-memory.
    }
  }, [key, state])

  return [state, setState]
}

