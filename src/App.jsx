import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Receipt,
  Scale,
  Users,
} from 'lucide-react'
import { defaultMembersSeed, normalizeRosterMemberList } from './lib/householdRoster'
import { useLocalStorageState } from './lib/useLocalStorageState'
import { userDataKeys } from './lib/userDataKeys'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import ChoresPage from './pages/ChoresPage'
import BillsPage from './pages/BillsPage'
import HouseholdPage from './pages/HouseholdPage'
import RulesPage from './pages/RulesPage'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chores', label: 'Chores', icon: ClipboardList },
  { id: 'bills', label: 'Bills', icon: Receipt },
  { id: 'rules', label: 'Rules', icon: BadgeCheck },
  { id: 'household', label: 'Household', icon: Users },
]

function MainApp({ currentUser, onLogout }) {
  const [activeTab, setActiveTab] = useState('chores')
  const [choreFormFocusNonce, setChoreFormFocusNonce] = useState(0)

  const active = useMemo(() => TABS.find((t) => t.id === activeTab) ?? TABS[0], [activeTab])
  const { isDemo, chores: choresKey, bills: billsKey, rules: rulesKey, members: membersKey } = useMemo(
    () => userDataKeys(currentUser),
    [currentUser],
  )

  const defaultMembers = useMemo(
    () => defaultMembersSeed(isDemo, currentUser.username),
    [isDemo, currentUser.username],
  )
  const [membersStored, setMembersStored] = useLocalStorageState(membersKey, defaultMembers)

  useEffect(() => {
    setMembersStored((prev) => {
      const next = normalizeRosterMemberList(Array.isArray(prev) ? prev : [], currentUser.username)
      const p = Array.isArray(prev) ? prev : []
      if (p.length === next.length && p.every((v, i) => v === next[i])) return prev
      return next
    })
  }, [membersKey, currentUser.username, setMembersStored])

  const members = useMemo(
    () => normalizeRosterMemberList(membersStored, currentUser.username),
    [membersStored, currentUser.username],
  )

  const setMembers = useCallback(
    (updater) => {
      setMembersStored((prev) => {
        const base = normalizeRosterMemberList(Array.isArray(prev) ? prev : [], currentUser.username)
        const next = typeof updater === 'function' ? updater(base) : updater
        return normalizeRosterMemberList(Array.isArray(next) ? next : base, currentUser.username)
      })
    },
    [setMembersStored, currentUser.username],
  )

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative px-5 py-6 sm:px-7">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-emerald-50" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 text-white shadow-sm">
                    <Scale className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">Shared Living</p>
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                      Roommate Hub
                    </h1>
                  </div>
                </div>
                <p className="mt-3 max-w-2xl text-sm text-slate-600">
                  Keep chores, bills, and house rules in sync—fast, simple, and demo-ready.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <span className="font-semibold text-slate-900">{currentUser.username}</span>
                  {currentUser.isDemo ? (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                      Demo
                    </span>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Log out
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <nav className="hidden lg:block">
            <div className="sticky top-6 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Navigation
              </p>
              <div className="space-y-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const isActive = tab.id === activeTab
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={[
                        'w-full rounded-2xl px-3 py-2 text-left text-sm font-medium transition',
                        'flex items-center gap-2',
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-slate-100',
                      ].join(' ')}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className={['h-4 w-4', isActive ? 'text-white' : 'text-slate-500'].join(' ')} aria-hidden="true" />
                      <span className="flex-1">{tab.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </nav>

          <main className="pb-24 lg:pb-6">
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <p className="text-sm font-medium text-slate-600">Viewing</p>
              <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm">
                <active.icon className="h-4 w-4 text-slate-700" aria-hidden="true" />
                {active.label}
              </p>
            </div>

            {activeTab === 'dashboard' && (
              <DashboardPage
                isDemo={isDemo}
                choresKey={choresKey}
                billsKey={billsKey}
                members={members}
                onNavigateTab={(tab, opts) => {
                  setActiveTab(tab)
                  if (tab === 'chores' && opts?.focusChoreForm) {
                    setChoreFormFocusNonce((n) => n + 1)
                  }
                }}
              />
            )}
            {activeTab === 'chores' && (
              <ChoresPage
                key={choresKey}
                storageKey={choresKey}
                isDemo={isDemo}
                members={members}
                focusAddFormNonce={choreFormFocusNonce}
              />
            )}
            {activeTab === 'bills' && (
              <BillsPage key={billsKey} storageKey={billsKey} isDemo={isDemo} members={members} />
            )}
            {activeTab === 'rules' && <RulesPage key={rulesKey} storageKey={rulesKey} isDemo={isDemo} />}
            {activeTab === 'household' && (
              <HouseholdPage
                key={membersKey}
                currentUser={currentUser}
                members={members}
                setMembers={setMembers}
                choresKey={choresKey}
                billsKey={billsKey}
              />
            )}
          </main>
        </div>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/90 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-5 gap-1 px-2 py-2">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-medium transition',
                  isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={['h-5 w-5', isActive ? 'text-white' : 'text-slate-600'].join(' ')} aria-hidden="true" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function App() {
  const [currentUser, setCurrentUser] = useLocalStorageState('slmvp.auth.currentUser', null)
  const isSignedIn = currentUser && typeof currentUser === 'object' && typeof currentUser.username === 'string'

  if (!isSignedIn) {
    return <AuthPage onAuthenticated={setCurrentUser} />
  }

  return <MainApp currentUser={currentUser} onLogout={() => setCurrentUser(null)} />
}

export default App
