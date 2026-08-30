import type { UserWithEntries } from './data'
import type { PublicUser } from './users'
import { scoreChallenge, type ScoringResult } from './scoring'

export interface RankedUser {
  user: PublicUser
  result: ScoringResult
}

/** Ordenado por puntaje total desc — la posición en el ranking es el índice + 1. */
export function buildLeaderboard(usersWithEntries: UserWithEntries[], now: Date): RankedUser[] {
  return usersWithEntries
    .map(({ user, entries }) => ({ user, result: scoreChallenge(entries, now) }))
    .sort((a, b) => b.result.totalPoints - a.result.totalPoints)
}
