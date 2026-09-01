import { useEffect, useState } from 'react'
import { RankBadge } from '../components/RankBadge'
import type { AppSession } from '../lib/auth'
import { CHALLENGE_START_DATE } from '../lib/challenge'
import { addDays, argentinaTimeUTC, compareDates, toArgentinaDate } from '../lib/date'
import type { RankedUser } from '../lib/leaderboard'
import { rankForStreak } from '../lib/ranks'

interface HomeProps {
  session: AppSession
  leaderboard: RankedUser[]
}

/** Próximo recordatorio real (9:00 o 21:00 AR) — no la medianoche técnica en la que abre la ventana. */
function nextReminder(now: Date): Date {
  const todayAR = toArgentinaDate(now)

  if (compareDates(todayAR, CHALLENGE_START_DATE) < 0) {
    // Todavía no arrancó: nadie tiene día pendiente, así que ningún
    // recordatorio de hoy manda nada. El primero real es al día
    // siguiente del inicio, cuando el día 1 pasa a estar pendiente.
    return argentinaTimeUTC(addDays(CHALLENGE_START_DATE, 1), 9)
  }

  const nineAM = argentinaTimeUTC(todayAR, 9)
  if (now.getTime() < nineAM.getTime()) return nineAM
  const ninePM = argentinaTimeUTC(todayAR, 21)
  if (now.getTime() < ninePM.getTime()) return ninePM
  return argentinaTimeUTC(addDays(todayAR, 1), 9)
}

function useCountdown(target: Date): string {
  const [label, setLabel] = useState('')

  useEffect(() => {
    function tick() {
      const diff = Math.max(0, target.getTime() - Date.now())
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setLabel(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [target])

  return label
}

export function Home({ session, leaderboard }: HomeProps) {
  const own = leaderboard.find((r) => r.user.id === session.id)
  const position = own ? leaderboard.indexOf(own) + 1 : null
  const countdown = useCountdown(nextReminder(new Date()))

  if (!own) return null

  return (
    <div className="flex flex-1 flex-col items-center gap-8 p-6 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-12 text-center">
      <div>
        <p className="font-stencil text-xs text-ink-light">Racha actual</p>
        <p className="text-7xl text-brown-dark">{own.result.currentStreak}</p>
        <p className="font-stencil text-sm text-ink-light">
          {rankForStreak(own.result.currentStreak)}
        </p>
      </div>

      <RankBadge streak={own.result.currentStreak} size={200} />

      <div className="grid w-full max-w-xs grid-cols-2 gap-3">
        <div className="border-2 border-ink bg-cream p-3">
          <p className="font-stencil text-[0.65rem] text-ink-light">Puntaje total</p>
          <p className="text-2xl text-ink">{own.result.totalPoints}</p>
        </div>
        <div className="border-2 border-ink bg-cream p-3">
          <p className="font-stencil text-[0.65rem] text-ink-light">Posición</p>
          <p className="text-2xl text-ink">#{position}</p>
        </div>
      </div>

      <div className="border-2 border-ink bg-cream px-6 py-4">
        <p className="font-stencil text-[0.65rem] text-ink-light">Próximo check-in en</p>
        <p className="font-stencil text-3xl text-brown-dark">{countdown}</p>
      </div>
    </div>
  )
}
