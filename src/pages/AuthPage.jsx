import { useMemo, useState } from 'react'
import { KeyRound, LogIn, Scale, UserPlus } from 'lucide-react'

const USERS_KEY = 'slmvp.auth.users'

function loadUsers() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(USERS_KEY)
    if (raw == null) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveUsers(users) {
  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch {
    // ignore
  }
}

function Card({ children, className = '' }) {
  return (
    <div className={['rounded-3xl border border-slate-200 bg-white p-5 shadow-sm', className].join(' ')}>
      {children}
    </div>
  )
}

export default function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const title = useMemo(() => (mode === 'signup' ? 'Sign up' : 'Log in'), [mode])

  function handleSignUp(e) {
    e.preventDefault()
    setError('')
    const u = username.trim()
    const p = password
    if (!u || !p) {
      setError('Enter a username and password.')
      return
    }
    if (p.length < 3) {
      setError('Password must be at least 3 characters (demo only).')
      return
    }
    const users = loadUsers()
    if (users.some((x) => x.username === u)) {
      setError('That username is already taken.')
      return
    }
    saveUsers([...users, { username: u, password: p }])
    onAuthenticated({ username: u, isDemo: false })
    setUsername('')
    setPassword('')
  }

  function handleLogin(e) {
    e.preventDefault()
    setError('')
    const u = username.trim()
    const p = password
    if (!u || !p) {
      setError('Enter a username and password.')
      return
    }
    const users = loadUsers()
    const found = users.find((x) => x.username === u)
    if (!found || found.password !== p) {
      setError('Invalid username or password.')
      return
    }
    onAuthenticated({ username: u, isDemo: false })
    setUsername('')
    setPassword('')
  }

  function handleDemo() {
    setError('')
    onAuthenticated({ username: 'Demo user', isDemo: true })
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <Scale className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-600">Shared Living</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Roommate Hub</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to continue, or try the demo—no server, stored only in this browser.</p>
        </div>

        <Card>
          <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError('')
              }}
              className={[
                'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition',
                mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setError('')
              }}
              className={[
                'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition',
                mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900',
              ].join(' ')}
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Sign up
            </button>
          </div>

          <h2 className="mt-5 text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {mode === 'signup' ? 'Create a local account on this device.' : 'Use a username you already registered here.'}
          </p>

          <form className="mt-4 space-y-3" onSubmit={mode === 'signup' ? handleSignUp : handleLogin}>
            <label className="block">
              <span className="sr-only">Username</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Username"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              />
            </label>
            <label className="block">
              <span className="sr-only">Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder="Password"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
              />
            </label>
            {error ? (
              <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              {mode === 'signup' ? 'Create account' : 'Log in'}
            </button>
          </form>
        </Card>

        <Card className="mt-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-100 text-indigo-800">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-900">Continue as demo user</h2>
              <p className="mt-1 text-sm text-slate-600">Skip registration—same app, labeled as a demo session on this browser.</p>
              <button
                type="button"
                onClick={handleDemo}
                className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
              >
                Enter as demo
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
