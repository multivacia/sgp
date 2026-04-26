export function novoIdRascunhoNovaEsteira(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `ne-${crypto.randomUUID()}`
  }
  return `ne-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

export function timestampIso(): string {
  return new Date().toISOString()
}
