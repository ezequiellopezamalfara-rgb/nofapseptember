import { badgeForStreak } from '../lib/badges'
import { chevronPoints, starPoints } from '../lib/badgeShapes'

const CREAM = '#f4ead2'
const BROWN_DARK = '#3d2c1a'
const ALERT = '#8c3b2e'

interface RankBadgeProps {
  streak: number
  size?: number
}

function ChevronGlyph({ count, rocker }: { count: number; rocker: boolean }) {
  const halfWidth = 22
  const apexRise = 9
  const top = 36
  const bottom = rocker ? 72 : 80
  const spacing = (bottom - top) / count
  const rows = Array.from({ length: count }, (_, i) => top + spacing * (i + 1))

  return (
    <>
      {rows.map((cy, i) => (
        <polyline
          key={i}
          points={chevronPoints(cy, halfWidth, apexRise)}
          fill="none"
          stroke={CREAM}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {rocker && (
        <rect x={38} y={82} width={44} height={8} rx={3} fill={CREAM} />
      )}
    </>
  )
}

function StarsGlyph({ count, hollow }: { count: number; hollow: boolean }) {
  const r = 12
  const gap = 22
  const totalWidth = (count - 1) * gap
  const startX = 60 - totalWidth / 2

  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <polygon
          key={i}
          points={starPoints(startX + i * gap, 60, r, r * 0.42)}
          fill={hollow ? 'none' : CREAM}
          stroke={CREAM}
          strokeWidth={hollow ? 5.5 : 0}
          strokeLinejoin="round"
        />
      ))}
    </>
  )
}

function BarGlyph() {
  return <rect x={52} y={34} width={16} height={52} rx={4} fill={CREAM} />
}

function DumbbellGlyph() {
  return (
    <>
      <rect x={38} y={56} width={44} height={8} rx={2} fill={CREAM} />
      <rect x={30} y={44} width={12} height={32} rx={3} fill={CREAM} />
      <rect x={78} y={44} width={12} height={32} rx={3} fill={CREAM} />
    </>
  )
}

function CrownGlyph() {
  return (
    <>
      <polygon
        points="34,78 34,58 46,68 60,44 74,68 86,58 86,78"
        fill="none"
        stroke={CREAM}
        strokeWidth={7}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <rect x={34} y={78} width={52} height={7} rx={2} fill={CREAM} />
      <circle cx={46} cy={68} r={3.5} fill={ALERT} />
      <circle cx={60} cy={44} r={4} fill={ALERT} />
      <circle cx={74} cy={68} r={3.5} fill={ALERT} />
    </>
  )
}

function InfinityGlyph() {
  return (
    <text
      x={60}
      y={72}
      textAnchor="middle"
      fontFamily="'Special Elite', monospace"
      fontSize={40}
      fill={CREAM}
    >
      ∞
    </text>
  )
}

export function RankBadge({ streak, size = 180 }: RankBadgeProps) {
  const badge = badgeForStreak(streak)

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Insignia de rango">
      <circle cx={60} cy={60} r={54} fill={BROWN_DARK} stroke={CREAM} strokeWidth={5} />
      <circle cx={60} cy={60} r={46} fill="none" stroke={CREAM} strokeWidth={1.5} opacity={0.5} />
      {badge.kind === 'chevrons' && (
        <ChevronGlyph count={badge.count} rocker={badge.rocker ?? false} />
      )}
      {badge.kind === 'stars' && <StarsGlyph count={badge.count} hollow={badge.hollow ?? false} />}
      {badge.kind === 'bar' && <BarGlyph />}
      {badge.kind === 'dumbbell' && <DumbbellGlyph />}
      {badge.kind === 'crown' && <CrownGlyph />}
      {badge.kind === 'infinity' && <InfinityGlyph />}
    </svg>
  )
}
