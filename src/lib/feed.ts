import { CHALLENGE_START_DATE } from './challenge'
import type { UserWithEntries } from './data'
import { rankForStreak } from './ranks'
import { scoreChallenge } from './scoring'

export interface Promotion {
  name: string
  rank: string
}

export interface DailySummary {
  date: string
  dayNumber: number
  fallen: string[]
  promoted: Promotion[]
}

function dayNumberForDate(date: string): number {
  const [y1, m1, d1] = CHALLENGE_START_DATE.split('-').map(Number)
  const [y2, m2, d2] = date.split('-').map(Number)
  const diffMs = Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)
  return Math.round(diffMs / 86_400_000) + 1
}

/**
 * Un resumen por día (bajas + ascensos), no un evento por persona — con el
 * pelotón completo, "fulano sigue en pie" 20 veces por día es puro ruido.
 * Derivado de daily_entries confirmadas; un día caído por ventana vencida
 * sin reporte no tiene fila, así que no genera nada (ver scoring.ts).
 */
export function buildFeed(usersWithEntries: UserWithEntries[], now: Date): DailySummary[] {
  const byDate = new Map<string, { fallen: string[]; promoted: Promotion[] }>()

  for (const { user, entries } of usersWithEntries) {
    const storedDates = new Set(entries.map((e) => e.date))
    const { days } = scoreChallenge(entries, now)

    let previousRank = rankForStreak(0)

    for (const day of days) {
      if (day.pending || !storedDates.has(day.date)) continue

      const bucket = byDate.get(day.date) ?? { fallen: [], promoted: [] }
      byDate.set(day.date, bucket)

      if (day.status === 'en_pie') {
        const currentRank = rankForStreak(day.streakDay)
        if (currentRank !== previousRank) {
          bucket.promoted.push({ name: user.name, rank: currentRank })
        }
        previousRank = currentRank
      } else {
        bucket.fallen.push(user.name)
        previousRank = rankForStreak(0)
      }
    }
  }

  return [...byDate.entries()]
    .map(([date, { fallen, promoted }]) => ({
      date,
      dayNumber: dayNumberForDate(date),
      fallen,
      promoted,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}
