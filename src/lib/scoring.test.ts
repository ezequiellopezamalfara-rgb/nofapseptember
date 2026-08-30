import { describe, expect, it } from 'vitest'
import { CHALLENGE_END_DATE, CHALLENGE_START_DATE } from './challenge'
import { addDays } from './date'
import { scoreChallenge, type RawEntry } from './scoring'

// Bien después de que cierre la ventana del día 30 (23:59 AR del 1/10 = 02:59:59.999 UTC del 2/10).
const AFTER_CHALLENGE_END = new Date('2026-10-02T12:00:00Z')

function datesInRange(count: number): string[] {
  const dates: string[] = []
  let date = CHALLENGE_START_DATE
  for (let i = 0; i < count; i++) {
    dates.push(date)
    date = addDays(date, 1)
  }
  return dates
}

function enPie(date: string, objectives: RawEntry['objectives'] = {}): RawEntry {
  return { date, status: 'en_pie', objectives }
}

function caido(date: string, objectives: RawEntry['objectives'] = {}): RawEntry {
  return { date, status: 'caido', objectives }
}

describe('scoreChallenge', () => {
  it('mes limpio: 30 días en pie suman 1200 puntos de racha', () => {
    const entries = datesInRange(30).map((d) => enPie(d))

    const result = scoreChallenge(entries, AFTER_CHALLENGE_END)

    expect(result.days).toHaveLength(30)
    expect(result.currentStreak).toBe(30)
    expect(result.currentTier).toBe(3)
    expect(result.totalStreakPoints).toBe(1200)
    expect(result.totalObjectivePoints).toBe(0)
    expect(result.totalPoints).toBe(1200)
    expect(result.days.every((d) => !d.pending)).toBe(true)
  })

  it('caída en el día 20: pierde el tramo pero no los puntos ya ganados', () => {
    const dates = datesInRange(30)
    const entries = dates.map((d, i) => {
      const dayNumber = i + 1
      return dayNumber === 20 ? caido(d) : enPie(d)
    })

    const result = scoreChallenge(entries, AFTER_CHALLENGE_END)

    // días 1-10 (×1, 20c/u) + días 11-19 (×2, 40c/u) + día 20 caído (0) + días 21-30 (×1 de nuevo, 20c/u)
    expect(result.totalStreakPoints).toBe(10 * 20 + 9 * 40 + 0 + 10 * 20)
    expect(result.days[19].status).toBe('caido')
    expect(result.days[19].streakPoints).toBe(0)
    expect(result.days[19].streakDay).toBe(0)
    // la racha se rehace desde ×1 después de la caída
    expect(result.days[20].streakDay).toBe(1)
    expect(result.days[20].tier).toBe(1)
    expect(result.currentStreak).toBe(10)
  })

  it('caídas múltiples: cada una resetea el tramo sin tocar lo acumulado', () => {
    const dates = datesInRange(30)
    const entries = dates.map((d, i) => {
      const dayNumber = i + 1
      return dayNumber === 10 || dayNumber === 20 ? caido(d) : enPie(d)
    })

    const result = scoreChallenge(entries, AFTER_CHALLENGE_END)

    // días 1-9 (×1) + día 10 caído + días 11-19 (×1, la racha se reinició) + día 20 caído + días 21-30 (×1)
    expect(result.totalStreakPoints).toBe(9 * 20 + 0 + 9 * 20 + 0 + 10 * 20)
    expect(result.currentStreak).toBe(10)
    expect(result.days[9].status).toBe('caido')
    expect(result.days[19].status).toBe('caido')
  })

  it('objetivos cumplidos en un día caído suman igual, sin puntos de racha', () => {
    const dates = datesInRange(30)
    const entries = dates.map((d, i) => {
      const dayNumber = i + 1
      if (dayNumber === 5) {
        return caido(d, { entrenar: true, leer: true }) // 3 + 1 = 4 pts
      }
      return enPie(d)
    })

    const result = scoreChallenge(entries, AFTER_CHALLENGE_END)

    const day5 = result.days[4]
    expect(day5.status).toBe('caido')
    expect(day5.streakPoints).toBe(0)
    expect(day5.objectivePoints).toBe(4)
    expect(day5.objectivesCompleted.sort()).toEqual(['entrenar', 'leer'])
    expect(result.totalObjectivePoints).toBe(4)
    expect(result.objectiveBreakdown.entrenar).toBe(3)
    expect(result.objectiveBreakdown.leer).toBe(1)
  })

  it('resolución automática: sin fila y ventana vencida cuenta como caído; el día de ayer queda pendiente', () => {
    // "ahora" es mediodía AR del 10/9 → hoy=9/9(AR)... en realidad hoy=10/9, ayer=9/9.
    const now = new Date('2026-09-10T15:00:00Z') // 12:00 AR del 10/9
    const result = scoreChallenge([], now)

    expect(result.days).toHaveLength(9) // 1/9 al 9/9
    const [sept1to8, sept9] = [result.days.slice(0, 8), result.days[8]]

    for (const day of sept1to8) {
      expect(day.pending).toBe(false)
      expect(day.status).toBe('caido')
      expect(day.streakPoints).toBe(0)
      expect(day.objectivePoints).toBe(0)
    }

    expect(sept9.date).toBe('2026-09-09')
    expect(sept9.pending).toBe(true)
    expect(sept9.status).toBeNull()

    expect(result.currentStreak).toBe(0)
    expect(result.totalPoints).toBe(0)
  })

  it('nunca procesa más allá del último día del challenge', () => {
    const result = scoreChallenge([], new Date('2027-01-01T00:00:00Z'))
    expect(result.days[result.days.length - 1].date).toBe(CHALLENGE_END_DATE)
    expect(result.days).toHaveLength(30)
  })
})
