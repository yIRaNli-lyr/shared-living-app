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
import {
  initialOwnerFromRoster,
  normalizeHouseholdMeta,
} from './lib/householdMeta'
import { defaultMembersSeed, normalizeRosterMemberList } from './lib/householdRoster'
import { useLocalStorageState } from './lib/useLocalStorageState'
import { useSessionStorageState } from './lib/useSessionStorageState'
import { migrateSharedHouseholdIntoUserScopeIfMember } from './lib/householdStorageMigrate'
import { userDataKeys } from './lib/userDataKeys'
import { getSupabaseClient } from './lib/supabaseClient'
import { isSupabaseConfigured } from './lib/supabaseConfig'
import {
  addHouseholdMember,
  ensureHouseholdForUser,
  ensureProfileForAuthUser,
  leaveHouseholdAsUser,
  loadHouseholdBundle,
  lookupProfileByUsername,
  removeHouseholdMember,
  setMemberRole,
} from './lib/supabaseHousehold'
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

function MainApp({
  currentUser,
  onLogout,
  cloudHousehold = false,
  cloudMembers,
  cloudHouseholdMeta,
  refreshCloudHousehold,
}) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [choreFormFocusNonce, setChoreFormFocusNonce] = useState(0)

  const active = useMemo(() => TABS.find((t) => t.id === activeTab) ?? TABS[0], [activeTab])
  const { isDemo, chores: choresKey, bills: billsKey, rules: rulesKey, members: membersKey, householdMeta: householdMetaKey } =
    useMemo(() => userDataKeys(currentUser), [currentUser])

  const defaultMembers = useMemo(
    () => defaultMembersSeed(isDemo, currentUser.username),
    [isDemo, currentUser.username],
  )
  const [membersStored, setMembersStored] = useLocalStorageState(membersKey, defaultMembers)

  const [householdMetaStored, setHouseholdMetaStored] = useLocalStorageState(householdMetaKey, {
    owner: '',
    admins: [],
  })

  const members = cloudHousehold ? cloudMembers : membersStored
  const setMembers = cloudHousehold
    ? () => {
        /* roster updates use Household cloud callbacks */
      }
    : setMembersStored

  const householdMeta = cloudHousehold ? cloudHouseholdMeta : householdMetaStored
  const setHouseholdMeta = cloudHousehold ? () => {} : setHouseholdMetaStored

  useEffect(() => {
    if (cloudHousehold || isDemo) return
    if (householdMeta.owner) return
    const roster = normalizeRosterMemberList(Array.isArray(membersStored) ? membersStored : [], currentUser.username)
    if (roster.length === 0) return
    const owner = initialOwnerFromRoster(roster)
    if (!owner) return
    setHouseholdMetaStored({ owner, admins: [] })
  }, [
    cloudHousehold,
    currentUser.username,
    householdMeta.owner,
    isDemo,
    membersStored,
    setHouseholdMetaStored,
  ])

  useEffect(() => {
    if (cloudHousehold) return
    setMembersStored((prev) => {
      const next = normalizeRosterMemberList(Array.isArray(prev) ? prev : [], currentUser.username)
      const p = Array.isArray(prev) ? prev : []
      if (p.length === next.length && p.every((v, i) => v === next[i])) return prev
      return next
    })
  }, [cloudHousehold, membersKey, currentUser.username, setMembersStored])

  const normalizedMembers = useMemo(
    () => normalizeRosterMemberList(members, currentUser.username),
    [members, currentUser.username],
  )

  const setMembersWritable = useCallback(
    (updater) => {
      if (cloudHousehold) return
      setMembersStored((prev) => {
        const base = normalizeRosterMemberList(Array.isArray(prev) ? prev : [], currentUser.username)
        const next = typeof updater === 'function' ? updater(base) : updater
        return normalizeRosterMemberList(Array.isArray(next) ? next : base, currentUser.username)
      })
    },
    [cloudHousehold, setMembersStored, currentUser.username],
  )

  const cloudHouseholdId = currentUser.householdId

  const onCloudAddMember = useCallback(
    async (rawUsername) => {
      const supabase = getSupabaseClient()
      if (!supabase || !cloudHouseholdId) return
      const prof = await lookupProfileByUsername(supabase, rawUsername)
      if (!prof) throw new Error('NO_PROFILE')
      await addHouseholdMember(supabase, cloudHouseholdId, prof.id)
      await refreshCloudHousehold()
    },
    [cloudHouseholdId, refreshCloudHousehold],
  )

  const onCloudRemoveMember = useCallback(
    async (rawUsername) => {
      const supabase = getSupabaseClient()
      if (!supabase || !cloudHouseholdId) return
      const prof = await lookupProfileByUsername(supabase, rawUsername)
      if (!prof) return
      await removeHouseholdMember(supabase, cloudHouseholdId, prof.id)
      await refreshCloudHousehold()
    },
    [cloudHouseholdId, refreshCloudHousehold],
  )

  const onCloudToggleAdmin = useCallback(
    async (rawUsername) => {
      const supabase = getSupabaseClient()
      if (!supabase || !cloudHouseholdId) return
      const prof = await lookupProfileByUsername(supabase, rawUsername)
      if (!prof) return
      const meta = normalizeHouseholdMeta(cloudHouseholdMeta)
      const isAdmin = meta.admins.some((a) => a.trim().toLowerCase() === rawUsername.trim().toLowerCase())
      await setMemberRole(supabase, cloudHouseholdId, prof.id, isAdmin ? 'member' : 'admin')
      await refreshCloudHousehold()
    },
    [cloudHouseholdId, cloudHouseholdMeta, refreshCloudHousehold],
  )

  const onCloudLeaveHousehold = useCallback(async () => {
    const supabase = getSupabaseClient()
    const uid = currentUser.userId
    if (!supabase || !cloudHouseholdId || !uid) return
    await leaveHouseholdAsUser(
      supabase,
      cloudHouseholdId,
      uid,
      currentUser.username,
      normalizedMembers,
      cloudHouseholdMeta,
    )
    await refreshCloudHousehold()
  }, [
    cloudHouseholdId,
    cloudHouseholdMeta,
    currentUser.userId,
    currentUser.username,
    normalizedMembers,
    refreshCloudHousehold,
  ])

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
                  {cloudHousehold ? (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-900">
                      Cloud
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
                currentUsername={currentUser.username}
                choresKey={choresKey}
                billsKey={billsKey}
                members={normalizedMembers}
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
                members={normalizedMembers}
                focusAddFormNonce={choreFormFocusNonce}
              />
            )}
            {activeTab === 'bills' && (
              <BillsPage
                key={billsKey}
                storageKey={billsKey}
                isDemo={isDemo}
                members={normalizedMembers}
                currentUsername={currentUser.username}
              />
            )}
            {activeTab === 'rules' && <RulesPage key={rulesKey} storageKey={rulesKey} isDemo={isDemo} />}
            {activeTab === 'household' && (
              <HouseholdPage
                key={membersKey}
                currentUser={currentUser}
                members={normalizedMembers}
                setMembers={setMembersWritable}
                choresKey={choresKey}
                billsKey={billsKey}
                isDemo={isDemo}
                householdMeta={normalizeHouseholdMeta(householdMeta)}
                setHouseholdMeta={setHouseholdMeta}
                cloudHousehold={cloudHousehold}
                onCloudAddMember={onCloudAddMember}
                onCloudRemoveMember={onCloudRemoveMember}
                onCloudToggleAdmin={onCloudToggleAdmin}
                onCloudLeaveHousehold={cloudHousehold ? onCloudLeaveHousehold : undefined}
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
  const supabaseOn = isSupabaseConfigured()
  const [currentUser, setCurrentUser] = useSessionStorageState('slmvp.auth.currentUser', null)
  const [cloud, setCloud] = useState(null)
  const [authBoot, setAuthBoot] = useState(!supabaseOn)
  const [cloudBootstrapError, setCloudBootstrapError] = useState(null)

  const refreshCloud = useCallback(async () => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      setCloud(null)
      setCloudBootstrapError(null)
      return
    }
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user) {
      setCloud(null)
      setCloudBootstrapError(null)
      return
    }
    try {
      const username = await ensureProfileForAuthUser(supabase, session.user)
      const hid = await ensureHouseholdForUser(supabase, session.user.id)
      const bundle = await loadHouseholdBundle(supabase, hid, username)
      setCloud({
        userId: session.user.id,
        username,
        householdId: hid,
        members: bundle.members,
        householdMeta: bundle.householdMeta,
      })
      setCloudBootstrapError(null)
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err && String(err.message).trim()
          ? String(err.message).trim()
          : 'Could not load your profile or household. Check Supabase tables, RLS policies, and the browser console.'
      setCloudBootstrapError(msg)
      setCloud(null)
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.removeItem('slmvp.auth.currentUser')
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (!supabaseOn) return
    const supabase = getSupabaseClient()
    let cancelled = false

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setAuthBoot(true)
      if (data.session?.user) {
        queueMicrotask(() => refreshCloud())
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setCloud(null)
        setCloudBootstrapError(null)
        return
      }
      queueMicrotask(() => refreshCloud())
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [supabaseOn, refreshCloud])

  const handleCloudLogout = useCallback(async () => {
    const supabase = getSupabaseClient()
    await supabase?.auth.signOut()
    setCloud(null)
    setCloudBootstrapError(null)
  }, [])

  const isSignedInLocal =
    currentUser && typeof currentUser === 'object' && typeof currentUser.username === 'string'

  if (supabaseOn && !authBoot) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading session…
      </div>
    )
  }

  if (supabaseOn && cloud) {
    return (
      <MainApp
        currentUser={{
          username: cloud.username,
          isDemo: false,
          userId: cloud.userId,
          householdId: cloud.householdId,
        }}
        onLogout={handleCloudLogout}
        cloudHousehold
        cloudMembers={cloud.members}
        cloudHouseholdMeta={cloud.householdMeta}
        refreshCloudHousehold={refreshCloud}
      />
    )
  }

  if (!isSignedInLocal) {
    return (
      <AuthPage onAuthenticated={setCurrentUser} supabaseBootstrapError={supabaseOn ? cloudBootstrapError : null} />
    )
  }

  if (!currentUser.isDemo) {
    migrateSharedHouseholdIntoUserScopeIfMember(currentUser.username)
  }

  return <MainApp currentUser={currentUser} onLogout={() => setCurrentUser(null)} />
}

export default App
