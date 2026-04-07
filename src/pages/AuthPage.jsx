import { useMemo, useState } from 'react'
import { KeyRound, LogIn, Scale, UserPlus } from 'lucide-react'
import { loadAuthUsers, saveAuthUsers } from '../lib/authUsers'
import { getSupabaseClient } from '../lib/supabaseClient'
import { isSupabaseConfigured } from '../lib/supabaseConfig'
import { lookupProfileByUsername } from '../lib/supabaseHousehold'

function Card({ children, className = '' }) {
  return (
    <div className={['rounded-3xl border border-slate-200 bg-white p-5 shadow-sm', className].join(' ')}>
      {children}
    </div>
  )
}

export default function AuthPage({ onAuthenticated, supabaseBootstrapError = null }) {
  const supabaseOn = isSupabaseConfigured()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [authBusy, setAuthBusy] = useState(false)

  const title = useMemo(() => (mode === 'signup' ? 'Sign up' : 'Log in'), [mode])

  function isValidEmail(em) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(em || '').trim())
  }

  async function handleSupabaseSignUp(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    const u = username.trim()
    const em = email.trim().toLowerCase()
    const p = password
    if (!u || !em || !p) {
      setError('Enter username, email, and password.')
      return
    }
    if (!isValidEmail(em)) {
      setError('Enter a valid email address.')
      return
    }
    if (p.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    const supabase = getSupabaseClient()
    if (!supabase) {
      setError(
        'Supabase is not configured. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required. Add them to .env.local (or your host), then restart the dev server.',
      )
      return
    }
    setAuthBusy(true)
    try {
      let taken
      try {
        taken = await lookupProfileByUsername(supabase, u)
      } catch (lookupErr) {
        const lookupMsg =
          lookupErr && typeof lookupErr === 'object' && 'message' in lookupErr && String(lookupErr.message).trim()
            ? String(lookupErr.message).trim()
            : ''
        setError(
          lookupMsg ||
            'Could not check username (network or Supabase). Confirm SQL migrations are applied, including profile_lookup_by_username.',
        )
        return
      }
      if (taken) {
        setError('That username is already taken.')
        return
      }
      const { data, error: signErr } = await supabase.auth.signUp({
        email: em,
        password: p,
        options: { data: { username: u } },
      })
      if (signErr) {
        setError(signErr.message)
        return
      }
      if (data.session?.user) {
        const { error: insErr } = await supabase.from('profiles').insert({ id: data.session.user.id, username: u })
        if (insErr) {
          setError(insErr.message || 'Could not save profile.')
          return
        }
        setUsername('')
        setEmail('')
        setPassword('')
        return
      }
      setInfo('Check your email to confirm your account, then log in.')
      setPassword('')
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err && String(err.message).trim()
          ? String(err.message).trim()
          : typeof err === 'string' && err.trim()
            ? err.trim()
            : 'Sign up failed. Please try again.'
      setError(msg)
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleSupabaseLogin(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    const em = email.trim().toLowerCase()
    const p = password
    if (!em || !p) {
      setError('Enter email and password.')
      return
    }
    if (!isValidEmail(em)) {
      setError('Enter a valid email address.')
      return
    }
    const supabase = getSupabaseClient()
    if (!supabase) {
      setError(
        'Supabase is not configured. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required. Add them to .env.local (or your host), then restart the dev server.',
      )
      return
    }
    setAuthBusy(true)
    try {
      const { data, error: signErr } = await supabase.auth.signInWithPassword({ email: em, password: p })
      if (signErr) {
        setError(signErr.message || String(signErr) || 'Sign in failed.')
        return
      }
      if (!data?.session) {
        setError(
          'No active session after sign in. If your project requires email confirmation, open the link in your email first, then log in again.',
        )
        return
      }
      setPassword('')
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err && String(err.message).trim()
          ? String(err.message).trim()
          : typeof err === 'string' && err.trim()
            ? err.trim()
            : 'Log in failed. Please try again.'
      setError(msg)
    } finally {
      setAuthBusy(false)
    }
  }

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
    const users = loadAuthUsers()
    const uLower = u.toLowerCase()
    if (users.some((x) => String(x.username).trim().toLowerCase() === uLower)) {
      setError('That username is already taken.')
      return
    }
    saveAuthUsers([...users, { username: u, password: p }])
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
    const users = loadAuthUsers()
    const uLower = u.toLowerCase()
    const found = users.find((x) => String(x.username).trim().toLowerCase() === uLower)
    if (!found || found.password !== p) {
      setError('Invalid username or password.')
      return
    }
    onAuthenticated({ username: found.username, isDemo: false })
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
          <p className="mt-2 text-sm text-slate-600">
            {supabaseOn
              ? 'Sign in with your account. Household roster syncs across devices; chores and bills still use this browser until the next migration step.'
              : 'Sign in to continue, or try the demo—no server, stored only in this browser.'}
          </p>
        </div>

        <Card>
          <div className="flex gap-2 rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError('')
                setInfo('')
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
                setInfo('')
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
            {supabaseOn
              ? mode === 'signup'
                ? 'Create a Supabase-backed account. You will log in with email; username is shown in the app.'
                : 'Use the email and password for your account.'
              : mode === 'signup'
                ? 'Create a local account on this device.'
                : 'Use a username you already registered here.'}
          </p>
          {supabaseOn && supabaseBootstrapError ? (
            <p
              className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
              role="alert"
            >
              {supabaseBootstrapError}
            </p>
          ) : null}

          {supabaseOn ? (
            <form
              className="mt-4 space-y-3"
              noValidate
              onSubmit={mode === 'signup' ? handleSupabaseSignUp : handleSupabaseLogin}
            >
              {mode === 'signup' ? (
                <label className="block">
                  <span className="sr-only">Username</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    placeholder="Username (display name)"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100"
                  />
                </label>
              ) : null}
              <label className="block">
                <span className="sr-only">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="Email"
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
              {info ? (
                <p className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900" role="status">
                  {info}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={authBusy}
                aria-busy={authBusy}
                className={[
                  'w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-sm transition',
                  authBusy ? 'cursor-wait bg-slate-600' : 'bg-slate-900 hover:bg-slate-800',
                ].join(' ')}
              >
                {authBusy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Log in'}
              </button>
            </form>
          ) : (
            <form className="mt-4 space-y-3" noValidate onSubmit={mode === 'signup' ? handleSignUp : handleLogin}>
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
          )}
        </Card>

        <Card className="mt-4">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-indigo-100 text-indigo-800">
              <KeyRound className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-900">Continue as demo user</h2>
              <p className="mt-1 text-sm text-slate-600">
                Skip registration—same app, labeled as a demo session on this browser.
              </p>
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
