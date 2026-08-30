export type ObjectiveKey =
  | 'entrenar'
  | 'pasos'
  | 'fumar'
  | 'despertar'
  | 'pantalla'
  | 'leer'
  | 'ducha'
  | 'agua'

export interface Objective {
  key: ObjectiveKey
  label: string
  points: number
}

export const OBJECTIVES: readonly Objective[] = [
  { key: 'entrenar', label: 'Entrené', points: 3 },
  { key: 'pasos', label: 'Caminé 10.000 pasos', points: 3 },
  { key: 'fumar', label: 'No fumé', points: 2 },
  { key: 'despertar', label: 'Me desperté antes de las 7', points: 2 },
  { key: 'pantalla', label: 'Tuve menos de 2h de reels / TikTok / shorts / X', points: 1 },
  { key: 'leer', label: 'Leí 20 minutos', points: 1 },
  { key: 'ducha', label: 'Me di una ducha fría', points: 1 },
  { key: 'agua', label: 'Tomé 2L de agua', points: 1 },
]

export const DAILY_OBJECTIVE_CAP = 14
export const MONTHLY_OBJECTIVE_CAP = 420
