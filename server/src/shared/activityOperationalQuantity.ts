/** Quantidade planejada padrão — atividades/etapas existentes e novas sem valor explícito. */
export const DEFAULT_PLANNED_QUANTITY = 1

/**
 * Quantidade ao criar/materializar esteira (POST /conveyors e estrutura inicial).
 * Ignora `plannedQuantity` do payload — ajuste operacional é pós-criação.
 */
export function resolveInitialConveyorStepPlannedQuantity(): number {
  return DEFAULT_PLANNED_QUANTITY
}

const QUANTITY_UNIT_LABEL = 'un.'

/**
 * Quantidade planejada positiva (inteiro). Valores inválidos ou ausentes → 1.
 */
export function resolveActivityPlannedQuantity(
  raw: number | string | null | undefined,
): number {
  if (raw == null || raw === '') return DEFAULT_PLANNED_QUANTITY
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw
  if (!Number.isFinite(n) || n < 1) return DEFAULT_PLANNED_QUANTITY
  return Math.floor(n)
}

/** Tempo planejado unitário (minutos) — coluna `planned_minutes` existente. */
export function resolveActivityPlannedUnitMinutes(
  raw: number | string | null | undefined,
): number {
  if (raw == null || raw === '') return 0
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : raw
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

/**
 * SQL: carga planejada total (min) de STEP em `conveyor_nodes`.
 * `planned_minutes` = tempo unitário; `planned_quantity` = quantidade do STEP.
 */
export function sqlConveyorStepPlannedTotalMinutes(stepAlias = 'step'): string {
  return `(GREATEST(0, COALESCE(${stepAlias}.planned_minutes, 0)) * GREATEST(1, COALESCE(${stepAlias}.planned_quantity, 1)))`
}

/** Tempo planejado total = unitário × quantidade planejada. */
export function resolveActivityPlannedTotalMinutes(
  unitMinutes: number | string | null | undefined,
  plannedQuantity?: number | string | null | undefined,
): number {
  const unit = resolveActivityPlannedUnitMinutes(unitMinutes)
  const qty = resolveActivityPlannedQuantity(plannedQuantity)
  return unit * qty
}

export function formatPlannedQuantity(quantity: number): string {
  const q = resolveActivityPlannedQuantity(quantity)
  return `${q} ${QUANTITY_UNIT_LABEL}`
}

export type UnitAndTotalMinutesFormat = {
  quantity: number
  unitMinutes: number
  totalMinutes: number
  /** Ex.: "3 un. × 40 min = 2h" quando qty > 1; só minutos quando qty = 1. */
  compact: string
}

/**
 * Texto compacto para UI — evita poluição quando quantidade = 1.
 */
export function formatUnitAndTotalMinutes(
  unitMinutes: number | null | undefined,
  plannedQuantity?: number | null | undefined,
  formatMinutes: (m: number) => string = (m) => `${m} min`,
): string {
  const qty = resolveActivityPlannedQuantity(plannedQuantity)
  const unit = resolveActivityPlannedUnitMinutes(unitMinutes)
  const total = unit * qty
  if (qty <= 1) {
    return formatMinutes(unit)
  }
  return `${qty} ${QUANTITY_UNIT_LABEL} × ${formatMinutes(unit)} = ${formatMinutes(total)}`
}

/** Soma quantidades executadas informadas; ausente (null) não entra na soma. */
export function sumExecutedQuantityFromEntries(
  entries: Array<{ executed_quantity?: number | null; executedQuantity?: number | null }>,
): number {
  let sum = 0
  for (const e of entries) {
    const raw = e.executedQuantity ?? e.executed_quantity
    if (raw == null) continue
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) continue
    sum += Math.floor(n)
  }
  return sum
}

export function sumExecutedMinutesFromEntries(
  entries: Array<{ minutes: number }>,
): number {
  return entries.reduce((s, e) => s + Math.max(0, Math.floor(e.minutes) || 0), 0)
}

/**
 * Média real (min/un.). Retorna null se não houver quantidade executada informada > 0.
 */
export function resolveActualMinutesPerUnit(
  executedMinutesTotal: number,
  executedQuantityTotal: number,
): number | null {
  if (executedQuantityTotal <= 0) return null
  const mins = Math.max(0, executedMinutesTotal)
  return mins / executedQuantityTotal
}

export function resolveQuantityProgressPercent(
  executedQuantityTotal: number,
  plannedQuantity: number,
): number | null {
  const planned = resolveActivityPlannedQuantity(plannedQuantity)
  if (planned <= 0) return null
  return executedQuantityTotal / planned
}

export function resolveTimeProgressPercent(
  executedMinutesTotal: number,
  plannedTotalMinutes: number,
): number | null {
  if (plannedTotalMinutes <= 0) return null
  return executedMinutesTotal / plannedTotalMinutes
}

export function resolveRemainingQuantity(
  executedQuantityTotal: number,
  plannedQuantity: number,
): number {
  const planned = resolveActivityPlannedQuantity(plannedQuantity)
  return Math.max(0, planned - Math.max(0, executedQuantityTotal))
}

export function resolveRemainingPlannedMinutes(
  executedMinutesTotal: number,
  plannedTotalMinutes: number,
): number {
  return Math.max(0, plannedTotalMinutes - Math.max(0, executedMinutesTotal))
}

/** Valida quantidade planejada para persistência (API). */
export function assertPlannedQuantityPositiveInt(value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error('plannedQuantity deve ser inteiro >= 1')
  }
}

/** Valida quantidade executada em apontamento (0 permitido; negativo rejeitado). */
export function normalizeExecutedQuantityInput(
  raw: number | null | undefined,
): number | null {
  if (raw == null) return null
  if (!Number.isFinite(raw) || raw < 0) {
    throw new Error('executedQuantity deve ser número >= 0')
  }
  return Math.floor(raw)
}
