import { useEffect, useState } from 'react'
import { InstallBanner } from './components/InstallBanner'
import { TabBar, type Tab } from './components/TabBar'
import { getAppSession, type AppSession } from './lib/auth'
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

  if (!session) {
    return <Entrada onDone={setSession} />
  }

  if (!all) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="font-stencil text-sm text-ink-light">Cargando...</p>
      </div>
    )
  }

  const leaderboard = buildLeaderboard(all, new Date())
  const own = leaderboard.find((r) => r.user.id === session.id)
  const lastDay = own?.result.days[own.result.days.length - 1]

  if (lastDay?.pending) {
    return (
      <CheckIn
        date={lastDay.date}
        userId={session.id}
        userName={session.name}
        currentStreak={own?.result.currentStreak ?? 0}
        onDone={reload}
      />
    )
  }

  if (!own) return null

  return (
    <div className="flex min-h-dvh flex-col">
      <InstallBanner />
      {tab === 'home' && <Home session={session} leaderboard={leaderboard} />}
      {tab === 'ranking' && <Ranking session={session} leaderboard={leaderboard} />}
      {tab === 'feed' && <Feed all={all} />}
      {tab === 'perfil' && <Perfil own={own} />}
      <TabBar active={tab} onChange={navigate} />
    </div>
  )
}

export default App
