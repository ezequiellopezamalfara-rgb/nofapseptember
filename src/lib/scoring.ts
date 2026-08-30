import { CHALLENGE_END_DATE, CHALLENGE_START_DATE } from './challenge'
import { addDays, compareDates, toArgentinaDate, type CalendarDate } from './date'
import { DAILY_OBJECTIVE_CAP, MONTHLY_OBJECTIVE_CAP, OBJECTIVES, type ObjectiveKey } from './objectives'

export type EntryStatus = 'en_pie' | 'caido'

/** Un día ya confirmado (insert único, inmutable) leído de daily_entries + entry_objectives. */
export interface RawEntry {
  date: CalendarDate
  status: EntryStatus
  objectives: Partial<Record<ObjectiveKey, boolean>>
}

export type StreakTier = 1 | 2 | 3

export interface DayScore {
  date: CalendarDate
  /** Un día pendiente todavía no fue reportado y está dentro de ventana: no suma ni resetea nada. */
  pending: boolean
  status: EntryStatus | null
  /** Día de racha personal alcanzado en pie (0 si cayó o está pendiente). */
  streakDay: number
  tier: StreakTier | null
  streakPoints: number
  objectivePoints: number
  objectivesCompleted: ObjectiveKey[]
}

export interface ScoringResult {
  days: DayScore[]
  currentStreak: number
  currentTier: StreakTier | null
  totalStreakPoints: number
  totalObjectivePoints: number
  totalPoints: number
  objectiveBreakdown: Record<ObjectiveKey, number>
}

const TIER_POINTS: Record<StreakTier, number> = { 1: 20, 2: 40, 3: 60 }

function tierForStreakDay(streakDay: number): StreakTier {
  if (streakDay <= 10) return 1
  if (streakDay <= 20) return 2
  return 3
}

function objectivePointsFor(objectives: Partial<Record<ObjectiveKey, boolean>>): {
  total: number
  completed: ObjectiveKey[]
} {
  const completed = OBJECTIVES.filter((o) => objectives[o.key]).map((o) => o.key)
  const total = OBJECTIVES.filter((o) => objectives[o.key]).reduce((sum, o) => sum + o.points, 0)
  return { total: Math.min(total, DAILY_OBJECTIVE_CAP), completed }
}

/**
 * Puntaje del challenge, recalculado desde cero cada vez. `now` es explícito
 * (nunca `new Date()` interno) para que la función sea pura y testeable: el
 * mismo input siempre da el mismo output.
 *
 * Regla de resolución (única, vive solo acá): la fecha D fue reportable
 * hasta las 23:59 AR del día D+1. Si no hay entrada para D y esa ventana ya
 * cerró, D cuenta como caído con los 8 objetivos en no cumplido — cubre por
 * igual un día perdido en silencio y el arrastre de días caídos de alguien
 * que se suma tarde al mes, sin necesidad de backfill en la base.
 */
export function scoreChallenge(entries: RawEntry[], now: Date): ScoringResult {
  const byDate = new Map(entries.map((e) => [e.date, e]))
  const todayAR = toArgentinaDate(now)
  const yesterdayAR = addDays(todayAR, -1)

  const lastDate = compareDates(yesterdayAR, CHALLENGE_END_DATE) < 0 ? yesterdayAR : CHALLENGE_END_DATE

  const days: DayScore[] = []
  const objectiveBreakdown = Object.fromEntries(OBJECTIVES.map((o) => [o.key, 0])) as Record<
    ObjectiveKey,
    number
  >

  let currentStreak = 0
  let totalStreakPoints = 0
  let totalObjectivePoints = 0

  for (
    let date = CHALLENGE_START_DATE;
    compareDates(date, lastDate) <= 0;
    date = addDays(date, 1)
  ) {
    const stored = byDate.get(date)

    if (!stored && date === yesterdayAR) {
      days.push({
        date,
        pending: true,
        status: null,
        streakDay: 0,
        tier: null,
        streakPoints: 0,
        objectivePoints: 0,
        objectivesCompleted: [],
      })
      continue
    }

    const status: EntryStatus = stored?.status ?? 'caido'
    const objectives = stored?.objectives ?? {}
    const { total: objectivePoints, completed } = objectivePointsFor(objectives)

    let streakDay = 0
    let tier: StreakTier | null = null
    let streakPoints = 0

    if (status === 'en_pie') {
      currentStreak += 1
      streakDay = currentStreak
      tier = tierForStreakDay(streakDay)
      streakPoints = TIER_POINTS[tier]
    } else {
      currentStreak = 0
    }

    totalStreakPoints += streakPoints
    totalObjectivePoints += objectivePoints
    for (const key of completed) {
      objectiveBreakdown[key] += OBJECTIVES.find((o) => o.key === key)!.points
    }

    days.push({
      date,
      pending: false,
      status,
      streakDay,
      tier,
      streakPoints,
      objectivePoints,
      objectivesCompleted: completed,
    })
  }

  totalObjectivePoints = Math.min(totalObjectivePoints, MONTHLY_OBJECTIVE_CAP)

  return {
    days,
    currentStreak,
    currentTier: currentStreak > 0 ? tierForStreakDay(currentStreak) : null,
    totalStreakPoints,
    totalObjectivePoints,
    totalPoints: totalStreakPoints + totalObjectivePoints,
    objectiveBreakdown,
  }
}
