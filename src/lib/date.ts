// America/Argentina/Buenos_Aires: offset fijo UTC-3 todo el año (sin horario
// de verano desde 2009). Por eso alcanza con un shift constante en vez de
// Intl.DateTimeFormat o una librería de timezones.
const AR_OFFSET_HOURS = -3

export type CalendarDate = string // 'YYYY-MM-DD'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Convierte un instante (UTC) a la fecha de calendario en Argentina. */
export function toArgentinaDate(instant: Date): CalendarDate {
  const shifted = new Date(instant.getTime() + AR_OFFSET_HOURS * 60 * 60 * 1000)
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
}

/** Suma (o resta) días de calendario a una fecha 'YYYY-MM-DD'. Aritmética pura, sin timezone. */
export function addDays(date: CalendarDate, days: number): CalendarDate {
  const [y, m, d] = date.split('-').map(Number)
  const shifted = new Date(Date.UTC(y, m - 1, d + days))
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`
}

/** Instante (UTC) del fin de ese día de calendario en Argentina: 23:59:59.999 AR. */
export function argentinaEndOfDayUTC(date: CalendarDate): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 23 - AR_OFFSET_HOURS, 59, 59, 999))
}

export function compareDates(a: CalendarDate, b: CalendarDate): number {
  return a < b ? -1 : a > b ? 1 : 0
}
