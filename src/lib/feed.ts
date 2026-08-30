import type { UserWithEntries } from './data'
import { rankForStreak } from './ranks'
import { scoreChallenge } from './scoring'

export type FeedEventType = 'en_pie' | 'caido' | 'ascenso'

export interface FeedEvent {
  id: string
  date: string
  userName: string
  type: FeedEventType
  streakDay?: number
  rank?: string
}

/**
 * Eventos derivados de daily_entries confirmadas — nunca de días caídos por
 * ventana vencida sin reporte: esos no tienen fila, así que no generan
 * evento (ver scoring.ts). Se recalcula en cada carga, no se persiste.
 */
export function buildFeed(usersWithEntries: UserWithEntries[], now: Date): FeedEvent[] {
  const events: FeedEvent[] = []

  for (const { user, entries } of usersWithEntries) {
    const storedDates = new Set(entries.map((e) => e.date))
    const { days } = scoreChallenge(entries, now)

    let previousRank = rankForStreak(0)

    for (const day of days) {
      if (day.pending || !storedDates.has(day.date)) continue

      if (day.status === 'en_pie') {
        events.push({
          id: `${user.id}-${day.date}-en_pie`,
          date: day.date,
          userName: user.name,
          type: 'en_pie',
          streakDay: day.streakDay,
        })

        const currentRank = rankForStreak(day.streakDay)
        if (currentRank !== previousRank) {
          events.push({
            id: `${user.id}-${day.date}-ascenso`,
            date: day.date,
            userName: user.name,
            type: 'ascenso',
            rank: currentRank,
          })
        }
        previousRank = currentRank
      } else {
        events.push({
          id: `${user.id}-${day.date}-caido`,
          date: day.date,
          userName: user.name,
          type: 'caido',
          streakDay: day.streakDay,
        })
        previousRank = rankForStreak(0)
      }
    }
  }

  return events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}
