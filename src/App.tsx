import { useEffect, useState, type ReactNode } from 'react'
import { FuneralTaps } from './components/FuneralTaps'
import { InstallBanner } from './components/InstallBanner'
import { TabBar, type Tab } from './components/TabBar'
import { clearAppSession, getAppSession, type AppSession } from './lib/auth'
import { fetchAllUsersWithEntries, type UserWithEntries } from './lib/data'
import { buildLeaderboard } from './lib/leaderboard'
import { CheckIn } from './screens/CheckIn'
import { Entrada } from './screens/Entrada'
import { Feed } from './screens/Feed'
import { Home } from './screens/Home'
import { Perfil } from './screens/Perfil'
import { Ranking } from './screens/Ranking'

function useTabNavigation(): [Tab, (tab: Tab) => void] {
  const [tab, setTab] = useState<Tab>(() => (window.history.state?.tab as Tab) ?? 'home')

  useEffect(() => {
    if (!window.history.state?.tab) {
      window.history.replaceState({ tab: 'home' }, '')
    }
    function onPopState(e: PopStateEvent) {
      setTab((e.state?.tab as Tab) ?? 'home')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  function navigate(next: Tab) {
    window.history.pushState({ tab: next }, '')
    setTab(next)
  }

  return [tab, navigate]
}

function App() {
  const [session, setSession] = useState<AppSession | null>(() => getAppSession())
  const [all, setAll] = useState<UserWithEntries[] | null>(null)
  const [tab, navigate] = useTabNavigation()

  async function reload() {
    setAll(await fetchAllUsersWithEntries())
  }

  useEffect(() => {
    if (session) void reload()
  }, [session])

  const leaderboard = all ? buildLeaderboard(all, new Date()) : null
  const own = leaderboard?.find((r) => r.user.id === session?.id)

  useEffect(() => {
    // Sesión local sin usuario real detrás (ej. borrado a mano): reinicia el alta.
    if (session && leaderboard && !own) {
      clearAppSession()
      setSession(null)
    }
  }, [session, leaderboard, own])

  let content: ReactNode

  if (!session) {
    content = <Entrada onDone={setSession} />
  } else if (!all || !leaderboard) {
    content = (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="font-stencil text-sm text-ink-light">Cargando...</p>
      </div>
    )
  } else if (own?.result.days[own.result.days.length - 1]?.pending) {
    const lastDay = own.result.days[own.result.days.length - 1]
    content = (
      <CheckIn
        date={lastDay.date}
        userId={session.id}
        userName={session.name}
        currentStreak={own.result.currentStreak}
        onDone={reload}
      />
    )
  } else if (!own) {
    content = null
  } else {
    content = (
      <div className="flex h-dvh flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <InstallBanner />
          {tab === 'home' && <Home session={session} leaderboard={leaderboard} />}
          {tab === 'ranking' && <Ranking session={session} leaderboard={leaderboard} />}
          {tab === 'feed' && <Feed all={all} userId={session.id} isAdmin={own.user.isAdmin} />}
          {tab === 'perfil' && <Perfil own={own} />}
        </main>
        <TabBar active={tab} onChange={navigate} />
      </div>
    )
  }

  return (
    <>
      {content}
      <FuneralTaps />
    </>
  )
}

export default App
