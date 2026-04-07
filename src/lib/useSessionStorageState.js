import { useEffect, useMemo, useState } from 'react'

function safeJsonParse(value) {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

/**
 * Like useLocalStorageState but uses sessionStorage — cleared when the tab/browser session ends.
 * Use for sign-in session so opening the app from a link starts at login while household data stays in localStorage.
 */
export function useSessionStorageState(key, initialValue) {
  const initial = useMemo(() => {
    if (typeof window === 'undefined') return initialValue
    const raw = window.sessionStorage.getItem(key)
    if (raw == null) return initialValue
    const parsed = safeJsonParse(raw)
    return parsed === undefined ? initialValue : parsed
  }, [initialValue, key])

  const [state, setState] = useState(initial)

  useEffect(() => {
    try {
      if (state == null || state === undefined) {
        window.sessionStorage.removeItem(key)
        return
      }
      window.sessionStorage.setItem(key, JSON.stringify(state))
    } catch {
      // ignore private mode / quota
    }
  }, [key, state])

  return [state, setState]
}
