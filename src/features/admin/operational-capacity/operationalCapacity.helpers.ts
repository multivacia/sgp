export type CapacityLoadStatusKind = 'no_data' | 'within' | 'attention' | 'over'

const ATTENTION_FROM = 0.8

/** Converte minutos totais em horas decimais (ex.: 90 → 1.5). */
export function minutesToDecimalHours(minutes: number): number {
  return minutes / 60
}

/** Horas decimais → minutos inteiros (arredondamento ao inteiro mais próximo). */
export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60)
}

/** Rótulo curto tipo "8h" ou "7h30" (pt-BR). */
export function minutesToHoursLabel(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (m === 0) return `${h}h`
  return `${h}h${String(m).padStart(2, '0')}`
}

/** Etiqueta completa para listagens. */
export function formatCapacityLabel(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return '—'
  return `${minutesToHoursLabel(minutes)}/dia`
}

export function resolveEffectiveCapacity(
  defaultMinutes: number | null | undefined,
  overrideMinutes: number | null | undefined,
): number | null {
  if (overrideMinutes != null && Number.isFinite(overrideMinutes)) {
    return Math.max(0, overrideMinutes)
  }
  if (defaultMinutes != null && Number.isFinite(defaultMinutes)) {
    return Math.max(0, defaultMinutes)
  }
  return null
}

export function buildCapacityStatus(input: {
  allocatedMinutes: number | null | undefined
  capacityMinutes: number | null | undefined
}): {
  kind: CapacityLoadStatusKind
  ratio: number | null
} {
  const cap = input.capacityMinutes
  const alloc = input.allocatedMinutes

  if (cap == null || !Number.isFinite(cap) || cap <= 0) {
    return { kind: 'no_data', ratio: null }
  }
  if (alloc == null || !Number.isFinite(alloc)) {
    return { kind: 'no_data', ratio: null }
  }

  const ratio = alloc / cap
  if (ratio > 1) return { kind: 'over', ratio }
  if (ratio > ATTENTION_FROM) return { kind: 'attention', ratio }
  return { kind: 'within', ratio }
}

export function capacityLoadStatusLabel(kind: CapacityLoadStatusKind): string {
  switch (kind) {
    case 'no_data':
      return 'Sem dados'
    case 'within':
      return 'Dentro da capacidade'
    case 'attention':
      return 'Próximo do limite'
    case 'over':
      return 'Acima da capacidade'
    default:
      return '—'
  }
}

export function formatPercent(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return '—'
  return `${Math.round(ratio * 100)}%`
}
