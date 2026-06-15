import type {
  ProductionCollaboratorSummary,
  ProductionWorkQueueFilter,
  ProductionWorkQueueItem,
} from './production.types'

/** Busca case-insensitive e sem acentos (pt-BR). */
export function normalizeProductionSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function filterProductionCollaboratorsByName(
  items: ProductionCollaboratorSummary[],
  query: string,
): ProductionCollaboratorSummary[] {
  const q = normalizeProductionSearchText(query)
  if (!q) return items
  return items.filter((c) =>
    normalizeProductionSearchText(c.fullName).includes(q),
  )
}

export function sortProductionCollaboratorsByName(
  items: ProductionCollaboratorSummary[],
): ProductionCollaboratorSummary[] {
  return [...items].sort((a, b) =>
    a.fullName.localeCompare(b.fullName, 'pt-BR'),
  )
}

/** PIN operacional: apenas dígitos, 4 a 8 caracteres. */
export function isValidProductionPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin)
}

export const PRODUCTION_DEFAULT_INITIAL_PIN = '1234'

export function isProductionDefaultInitialPin(pin: string): boolean {
  return pin === PRODUCTION_DEFAULT_INITIAL_PIN
}

export function resolveProductionCredentialBadge(
  status: ProductionCollaboratorSummary['productionCredentialStatus'],
): { label: string; className: string } | null {
  if (status === 'NEEDS_INITIAL_PIN') {
    return {
      label: 'PIN pendente',
      className:
        'rounded-full border border-amber-500/30 bg-amber-950/50 px-2.5 py-0.5 text-xs font-medium text-amber-200',
    }
  }
  if (status === 'DISABLED') {
    return {
      label: 'Desabilitado',
      className:
        'rounded-full border border-slate-500/30 bg-slate-900/60 px-2.5 py-0.5 text-xs font-medium text-slate-300',
    }
  }
  if (status === 'LOCKED') {
    return {
      label: 'Bloqueado',
      className:
        'rounded-full border border-red-500/30 bg-red-950/40 px-2.5 py-0.5 text-xs font-medium text-red-200',
    }
  }
  return null
}

/** Iniciais para avatar placeholder (ex.: "Maria Silva" → "MS"). */
export function computeProductionCollaboratorInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase()
  }
  const first = parts[0]![0] ?? ''
  const last = parts[parts.length - 1]![0] ?? ''
  return `${first}${last}`.toUpperCase()
}

export function resolveProductionCollaboratorInitials(
  collaborator: Pick<ProductionCollaboratorSummary, 'fullName' | 'initials'>,
): string {
  const trimmed = collaborator.initials?.trim()
  if (trimmed) return trimmed
  return computeProductionCollaboratorInitials(collaborator.fullName)
}

/** Formata minutos como "Xh Ym" ou "Xm". Retorna "—" para null/0. */
export function formatProductionMinutes(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

export type ProductionOperationalStatusDisplay = {
  label: string
  colorClass: string
}

/** Converte o status operacional da atividade em label e cor para a UI. */
export function resolveProductionOperationalStatusDisplay(
  item: Pick<
    ProductionWorkQueueItem,
    'activityOperationalStatus' | 'isActivityCompleted' | 'isOverdue' | 'isOutOfSequence'
  >,
): ProductionOperationalStatusDisplay {
  if (item.isActivityCompleted) {
    return { label: 'Concluída', colorClass: 'text-emerald-400' }
  }
  if (item.isOutOfSequence) {
    return { label: 'Fora da sequência', colorClass: 'text-amber-400' }
  }
  if (item.isOverdue) {
    return { label: 'Em atraso', colorClass: 'text-red-400' }
  }
  const status = item.activityOperationalStatus
  if (status === 'IN_PROGRESS') {
    return { label: 'Em andamento', colorClass: 'text-blue-400' }
  }
  if (status === 'COMPLETED') {
    return { label: 'Concluída', colorClass: 'text-emerald-400' }
  }
  return { label: 'A iniciar', colorClass: 'text-slate-400' }
}

/** Mensagem quando o botão «Apontar horas» está desabilitado. */
export function productionTrackTimeDisabledTitle(
  item: Pick<
    ProductionWorkQueueItem,
    'canTrackTime' | 'isActivityCompleted' | 'requiresOutOfSequenceJustification'
  >,
): string {
  if (item.canTrackTime) return ''
  if (item.isActivityCompleted) {
    return 'Esta atividade já foi concluída.'
  }
  if (item.requiresOutOfSequenceJustification) {
    return 'Informe uma justificativa para apontar fora da sequência.'
  }
  return 'Apontamento indisponível para esta atividade.'
}

/** Filtra itens da fila pelo filtro selecionado. */
export function filterProductionWorkQueue(
  items: ProductionWorkQueueItem[],
  filter: ProductionWorkQueueFilter,
): ProductionWorkQueueItem[] {
  if (filter === 'completed') {
    return items.filter((item) => item.isActivityCompleted || item.group === 'completed')
  }
  if (filter === 'pending') {
    return items.filter((item) => !item.isActivityCompleted && item.group !== 'completed')
  }
  return items
}

/** Formata uma data ISO (YYYY-MM-DD) como "DD/MM/YYYY". */
export function formatProductionDate(isoDate: string): string {
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}
