import { timingSafeEqual } from 'node:crypto'

/**
 * Comparação em tempo constante para segredos em string UTF-8.
 * Comprimentos diferentes → false (sem timingSafeEqual entre buffers de tamanhos distintos).
 */
export function secureTokenCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) {
    return false
  }
  return timingSafeEqual(bufA, bufB)
}
