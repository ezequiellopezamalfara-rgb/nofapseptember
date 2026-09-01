// Frases cortas para el cuerpo del push de recordatorio — deben leerse
// enteras en una notificación (apuntar a ~60 caracteres).

export const MORNING_LINES = [
  'Otro día, otra batalla. Reportá y seguí de pie.',
  'El enemigo nunca duerme. Vos tampoco te duermas en reportar.',
  'Ayer peleaste. Hoy contalo.',
  'Un soldado reporta su parte. No seas el que no aparece.',
  'La mano en la sábana no se cuenta sola.',
  'Contá cómo te fue — el pelotón te está mirando.',
  'Reportá antes de que se te escape el día.',
  'Disciplina, soldado. Abrí la app.',
]

export const EVENING_LINES = [
  'Quedan pocas horas. No dejes que la pereza gane la batalla final.',
  'A las 23:59 se cierra el frente. Reportá antes de la baja.',
  'No aflojes justo cuando falta tan poco.',
  'El día se cae solo si vos lo dejás caer.',
  'Últimas horas — un toque y seguís de pie.',
  'No te hagas el distraído, el reloj no negocia.',
  'Reportá ya, que la medianoche no perdona.',
  'Todavía estás a tiempo de no caer por olvido.',
]

export function randomLine(lines: readonly string[]): string {
  return lines[Math.floor(Math.random() * lines.length)]
}
