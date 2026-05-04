/**
 * Zod `.optional()` não aceita `null`; omitir chave ou usar `undefined`.
 * Objetos plain apenas — não percorre Date, Buffer, etc.
 */
export function nilToUndefined<T>(value: T | null | undefined): T | undefined {
  if (value === null) return undefined
  return value
}

export function deepStripNullToUndefined<T>(value: T): T {
  if (value === null) return undefined as T
  if (Array.isArray(value)) {
    return value.map((v) => deepStripNullToUndefined(v)) as T
  }
  if (typeof value === 'object' && value !== null) {
    const proto = Object.getPrototypeOf(value)
    if (proto !== Object.prototype && proto !== null) {
      return value
    }
    const o = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(o)) {
      out[k] = deepStripNullToUndefined(v)
    }
    return out as T
  }
  return value
}
