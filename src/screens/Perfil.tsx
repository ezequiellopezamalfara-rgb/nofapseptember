import { useState } from 'react'
import { CHALLENGE_END_DATE, CHALLENGE_START_DATE } from '../lib/challenge'
import { addDays, compareDates } from '../lib/date'
import type { RankedUser } from '../lib/leaderboard'
import { OBJECTIVES } from '../lib/objectives'
import type { DayScore } from '../lib/scoring'

interface PerfilProps {
  own: RankedUser
}

type GridStatus = 'en_pie' | 'caido' | 'pendiente' | 'futuro'

interface GridDay {
  date: string
  dayNumber: number
  status: GridStatus
  score: DayScore | null
}

function buildGrid(days: DayScore[]): GridDay[] {
  const byDate = new Map(days.map((d) => [d.date, d]))
  const grid: GridDay[] = []
  let date = CHALLENGE_START_DATE
  let n = 1
  while (compareDates(date, CHALLENGE_END_DATE) <= 0) {
    const score = byDate.get(date) ?? null
    const status: GridStatus = !score ? 'futuro' : score.pending ? 'pendiente' : (score.status ?? 'futuro')
    grid.push({ date, dayNumber: n, status, score })
    date = addDays(date, 1)
    n += 1
  }
  return grid
}

const STATUS_CLASS: Record<GridStatus, string> = {
  en_pie: 'bg-brown-dark text-cream border-ink',
  caido: 'bg-alert text-cream border-alert-dark',
  pendiente: 'bg-beige text-ink border-ink animate-pulse',
  futuro: 'bg-transparent text-ink-light border-ink-light/40',
}

export function Perfil({ own }: PerfilProps) {
  const grid = buildGrid(own.result.days)
  const [selected, setSelected] = useState<GridDay | null>(null)

  return (
    <div className="flex-1 p-4 pb-24 pt-8">
      <h1 className="mb-1 text-center text-xl text-brown-dark">{own.user.name}</h1>
      <p className="mb-4 text-center font-stencil text-xs text-ink-light">
        {own.result.totalPoints} puntos totales
      </p>

      <div className="grid grid-cols-6 gap-1.5">
        {grid.map((g) => (
          <button
            key={g.date}
            onClick={() => setSelected(g)}
            className={`font-stencil aspect-square border-2 text-xs ${STATUS_CLASS[g.status]}`}
          >
            {g.dayNumber}
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-4 border-2 border-ink bg-cream p-3">
          <div className="flex items-center justify-between">
            <p className="font-stencil text-sm text-ink">Día {selected.dayNumber}</p>
            <button
              onClick={() => setSelected(null)}
              className="font-stencil text-xs text-ink-light"
            >
              cerrar
            </button>
          </div>
          {selected.status === 'futuro' && (
            <p className="mt-2 font-serif text-sm text-ink-light">Todavía no llegó.</p>
          )}
          {selected.status === 'pendiente' && (
            <p className="mt-2 font-serif text-sm text-ink-light">Esperando tu reporte.</p>
          )}
          {selected.score && selected.status !== 'pendiente' && (
            <div className="mt-2 flex flex-col gap-1">
              <p className="font-serif text-sm text-ink">
                {selected.status === 'en_pie' ? 'En pie' : 'Caído'} —{' '}
                {selected.score.streakPoints + selected.score.objectivePoints} pts
              </p>
              <ul className="font-serif text-xs text-ink-light">
                {OBJECTIVES.filter((o) => selected.score!.objectivesCompleted.includes(o.key)).map(
                  (o) => (
                    <li key={o.key}>✓ {o.label}</li>
                  ),
                )}
                {selected.score.objectivesCompleted.length === 0 && <li>Sin objetivos cumplidos</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 border-t-2 border-ink pt-4">
        <p className="font-stencil mb-2 text-xs text-ink-light">Desglose del puntaje</p>
        <div className="flex justify-between font-serif text-sm text-ink">
          <span>Racha</span>
          <span>{own.result.totalStreakPoints} pts</span>
        </div>
        {OBJECTIVES.map((o) => (
          <div key={o.key} className="flex justify-between font-serif text-sm text-ink-light">
            <span>{o.label}</span>
            <span>{own.result.objectiveBreakdown[o.key]} pts</span>
          </div>
        ))}
      </div>
    </div>
  )
}
