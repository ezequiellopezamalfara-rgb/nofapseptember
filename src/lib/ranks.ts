interface RankThreshold {
  minStreak: number
  name: string
}

// De mayor a menor: la primera cuyo minStreak sea <= la racha, gana.
const RANKS: readonly RankThreshold[] = [
  { minStreak: 30, name: 'Monje ∞' },
  { minStreak: 29, name: 'Rey' },
  { minStreak: 28, name: 'General de Ejército' },
  { minStreak: 27, name: 'Coronel' },
  { minStreak: 26, name: 'Mayor' },
  { minStreak: 25, name: 'Capitán' },
  { minStreak: 24, name: 'Teniente Primero' },
  { minStreak: 21, name: 'Teniente Segundo' },
  { minStreak: 16, name: 'Aspirante a Oficial' },
  { minStreak: 14, name: 'Subteniente' },
  { minStreak: 11, name: 'Sargento Primero' },
  { minStreak: 6, name: 'Sargento Segundo' },
  { minStreak: 3, name: 'Sargento Tercero' },
  { minStreak: 2, name: 'Cabo' },
  { minStreak: 1, name: 'Soldado' },
  { minStreak: 0, name: 'Civil' },
]

export function rankForStreak(streak: number): string {
  return RANKS.find((r) => streak >= r.minStreak)!.name
}
