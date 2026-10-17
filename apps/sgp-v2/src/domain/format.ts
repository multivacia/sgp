/** 75 → "1 h 15 min". */
export function fmtMin(m: number): string {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return `${h} h${r ? ` ${r} min` : ''}`
}
