import type { UserWithEntries } from '../lib/data'
import { buildFeed } from '../lib/feed'

interface FeedProps {
  all: UserWithEntries[]
}

function formatDate(date: string): string {
  const [, m, d] = date.split('-')
  return `${d}/${m}`
}

export function Feed({ all }: FeedProps) {
  const events = buildFeed(all, new Date())

  return (
    <div className="flex-1 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-8">
      <h1 className="mb-4 text-center text-xl text-brown-dark">Feed</h1>
      <div className="flex flex-col gap-2">
        {events.length === 0 && (
          <p className="text-center font-serif text-sm text-ink-light">Todavía no hay novedades.</p>
        )}
        {events.map((e) => (
          <div key={e.id} className="border-2 border-ink bg-cream px-3 py-2">
            <p className="font-serif text-sm text-ink">
              {e.type === 'en_pie' && (
                <>
                  <strong>{e.userName}</strong> sigue en pie (día {e.streakDay})
                </>
              )}
              {e.type === 'caido' && (
                <span className="text-alert">
                  <strong>{e.userName}</strong> cayó en combate
                </span>
              )}
              {e.type === 'ascenso' && (
                <>
                  <strong>{e.userName}</strong> ascendió a {e.rank}
                </>
              )}
            </p>
            <p className="font-stencil text-[0.6rem] text-ink-light">{formatDate(e.date)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
