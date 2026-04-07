import { useMemo, useState } from 'react'
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardList,
  LayoutDashboard,
  Receipt,
  Scale,
} from 'lucide-react'
import DashboardPage from './pages/DashboardPage'
import ChoresPage from './pages/ChoresPage'
import BillsPage from './pages/BillsPage'
import RulesPage from './pages/RulesPage'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chores', label: 'Chores', icon: ClipboardList },
  { id: 'bills', label: 'Bills', icon: Receipt },
  { id: 'rules', label: 'Rules', icon: BadgeCheck },
]

function App() {
  const [activeTab, setActiveTab] = useState('chores')

  const active = useMemo(() => TABS.find((t) => t.id === activeTab) ?? TABS[0], [activeTab])

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative px-5 py-6 sm:px-7">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-emerald-50" />
            <div className="relative flex items-start justify-between gap-4">
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

              <div className="hidden sm:flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/70 px-3 py-2 text-sm text-slate-700 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                Sprint Increment: <span className="font-semibold">Chores</span>
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

            {activeTab === 'dashboard' && <DashboardPage />}
            {activeTab === 'chores' && <ChoresPage />}
            {activeTab === 'bills' && <BillsPage />}
            {activeTab === 'rules' && <RulesPage />}
          </main>
        </div>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/90 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-4 gap-1 px-2 py-2">
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

export default App
