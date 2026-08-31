/** Generadores de geometría para las insignias — mismo trazo plano que el ícono de la app. */

export function chevronPoints(cy: number, halfWidth: number, apexRise: number, cx = 60): string {
  return `${cx - halfWidth},${cy} ${cx},${cy - apexRise} ${cx + halfWidth},${cy}`
}

export function starPoints(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  points = 5,
  rotationDeg = -90,
): string {
  const step = Math.PI / points
  const coords: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR
    const angle = (rotationDeg * Math.PI) / 180 + i * step
    coords.push(`${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`)
  }
  return coords.join(' ')
}
