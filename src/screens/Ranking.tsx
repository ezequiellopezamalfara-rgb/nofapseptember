import type { AppSession } from '../lib/auth'
import type { RankedUser } from '../lib/leaderboard'
import { rankForStreak } from '../lib/ranks'

interface RankingProps {
  session: AppSession
  leaderboard: RankedUser[]
}

export function Ranking({ session, leaderboard }: RankingProps) {
  return (
    <div className="flex-1 p-4 pb-24 pt-8">
      <h1 className="mb-4 text-center text-xl text-brown-dark">Ranking</h1>
      <div className="flex flex-col gap-2">
        {leaderboard.map((r, i) => {
          const isMe = r.user.id === session.id
          return (
            <div
              key={r.user.id}
              className={`flex items-center gap-3 border-2 px-3 py-2 ${
                isMe ? 'border-brown-dark bg-beige' : 'border-ink bg-cream'
              }`}
            >
              <span className="font-stencil w-6 text-sm text-ink-light">{i + 1}</span>
              <div className="flex-1">
                <p className="font-serif text-sm text-ink">
                  {r.user.name}
                  {isMe && ' (vos)'}
                </p>
                <p className="font-stencil text-[0.65rem] text-ink-light">
                  {rankForStreak(r.result.currentStreak)} · racha {r.result.currentStreak}
                </p>
              </div>
              <span className="font-stencil text-lg text-brown-dark">{r.result.totalPoints}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
