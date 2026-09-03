export type Tab = 'home' | 'ranking' | 'feed' | 'perfil'

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'feed', label: 'Feed' },
  { id: 'perfil', label: 'Perfil' },
]

interface TabBarProps {
  active: Tab
  onChange: (tab: Tab) => void
}

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav className="flex shrink-0 border-t-2 border-ink bg-paper pb-[env(safe-area-inset-bottom)]">
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`font-stencil flex-1 py-3 text-xs ${
            active === t.id ? 'bg-brown-dark text-cream' : 'text-ink-light'
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
