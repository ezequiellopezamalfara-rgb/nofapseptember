export type BadgeSpec =
  | { kind: 'none' }
  | { kind: 'chevrons'; count: number; rocker?: boolean }
  | { kind: 'bar' }
  | { kind: 'dumbbell' }
  | { kind: 'stars'; count: number; hollow?: boolean }
  | { kind: 'crown' }
  | { kind: 'infinity' }

interface RankBadgeEntry {
  minStreak: number
  name: string
  badge: BadgeSpec
}

// Mismo orden/umbrales que src/lib/ranks.ts — de mayor a menor.
export const RANK_BADGES: readonly RankBadgeEntry[] = [
  { minStreak: 30, name: 'Monje ∞', badge: { kind: 'infinity' } },
  { minStreak: 29, name: 'Rey', badge: { kind: 'crown' } },
  { minStreak: 28, name: 'General de Ejército', badge: { kind: 'stars', count: 5 } },
  { minStreak: 27, name: 'Coronel', badge: { kind: 'stars', count: 4 } },
  { minStreak: 26, name: 'Mayor', badge: { kind: 'stars', count: 3 } },
  { minStreak: 25, name: 'Capitán', badge: { kind: 'stars', count: 2 } },
  { minStreak: 24, name: 'Teniente Primero', badge: { kind: 'stars', count: 1 } },
  { minStreak: 21, name: 'Teniente Segundo', badge: { kind: 'stars', count: 1, hollow: true } },
  { minStreak: 16, name: 'Aspirante a Oficial', badge: { kind: 'dumbbell' } },
  { minStreak: 14, name: 'Subteniente', badge: { kind: 'bar' } },
  { minStreak: 11, name: 'Sargento Primero', badge: { kind: 'chevrons', count: 4, rocker: true } },
  { minStreak: 6, name: 'Sargento Segundo', badge: { kind: 'chevrons', count: 4 } },
  { minStreak: 3, name: 'Sargento Tercero', badge: { kind: 'chevrons', count: 3 } },
  { minStreak: 2, name: 'Cabo', badge: { kind: 'chevrons', count: 2 } },
  { minStreak: 1, name: 'Soldado', badge: { kind: 'chevrons', count: 1 } },
  { minStreak: 0, name: 'Civil', badge: { kind: 'none' } },
]

export function badgeForStreak(streak: number): BadgeSpec {
  return RANK_BADGES.find((r) => streak >= r.minStreak)!.badge
}
