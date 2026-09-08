import type { ConveyorOperationalStatus } from '../../domain/conveyors/conveyor.types'

/**
 * Política de edição estrutural (PATCH `/structure`).
 *
 * Com sync incremental no backend, a estrutura pode ser editada em qualquer
 * status operacional conhecido. A inclusão tardia (append-only) continua
 * disponível via `showLateAppendAction` em `ConveyorCreateEditPage.tsx`.
 */
export function canReplaceConveyorStructure(
  status: ConveyorOperationalStatus,
): boolean {
  void status
  return true
}

/** @deprecated Lock por status removido — sync incremental permite edição em qualquer status. */
export const STRUCTURE_TAB_BLOCKED_UX_MESSAGE =
  'A alteração da estrutura da esteira só é permitida enquanto a esteira está em elaboração ou aguardando planejamento. Os dados principais podem ser alterados sem afetar o histórico operacional.'

export const LATE_STRUCTURE_APPEND_SUCCESS_MESSAGE =
  'Novo item incluído. As novas atividades estão disponíveis no Backlog do Planejamento Semanal.'

/** Backlog = EM_ELABORACAO. Fora disso, alteração real exige justificativa. */
export const CONVEYOR_EDIT_REASON_MIN = 3
export const CONVEYOR_EDIT_REASON_MAX = 500
export const CONVEYOR_EDIT_REASON_VALIDATION_MESSAGE =
  'Motivo deve ter entre 3 e 500 caracteres.'

export const CONVEYOR_EDIT_REASON_MODAL_COPY = {
  title: 'Justificativa da alteração',
  description:
    'Esta esteira já saiu do Backlog. Informe o motivo da alteração para manter a rastreabilidade operacional.',
  fieldLabel: 'Motivo da alteração',
  placeholder: 'Informe o motivo da alteração...',
  cancelLabel: 'Cancelar',
  confirmLabel: 'Confirmar alteração',
} as const

/**
 * Exige motivo quando edição + status conhecido e diferente de EM_ELABORACAO (backlog).
 */
export function requiresEditReason(input: {
  mode: 'create' | 'edit'
  status: ConveyorOperationalStatus | null | undefined
}): boolean {
  return (
    input.mode === 'edit' &&
    input.status != null &&
    input.status !== 'EM_ELABORACAO'
  )
}

/** Abre o modal só se a política exige motivo e há PATCH real a enviar. */
export function shouldPromptEditReason(input: {
  mode: 'create' | 'edit'
  status: ConveyorOperationalStatus | null | undefined
  patchDados: boolean
  patchStructure: boolean
}): boolean {
  if (!requiresEditReason({ mode: input.mode, status: input.status })) return false
  return input.patchDados || input.patchStructure
}

export function validateConveyorEditReason(reason: string): string | null {
  const trimmed = reason.trim()
  if (
    trimmed.length < CONVEYOR_EDIT_REASON_MIN ||
    trimmed.length > CONVEYOR_EDIT_REASON_MAX
  ) {
    return CONVEYOR_EDIT_REASON_VALIDATION_MESSAGE
  }
  return null
}

export function resolveCanSaveConveyorChanges(input: {
  hasDadosChanges: boolean
  hasStructureChanges: boolean
  estruturaOk: boolean
  canReplaceStructure: boolean
}): boolean {
  if (input.hasDadosChanges) return true
  if (!input.hasStructureChanges) return false
  return input.estruturaOk && input.canReplaceStructure
}

export function shouldValidateStructureOnSubmit(input: {
  mode: 'create' | 'edit'
  hasStructureChanges: boolean
}): boolean {
  return input.mode === 'create' || input.hasStructureChanges
}

export function resolveConveyorEditSubmitPlan(input: {
  mode: 'create' | 'edit'
  hasDadosChanges: boolean
  hasStructureChanges: boolean
  canReplaceStructure: boolean
}): { patchDados: boolean; patchStructure: boolean } {
  if (input.mode === 'create') {
    return { patchDados: false, patchStructure: false }
  }
  return {
    patchDados: input.hasDadosChanges,
    patchStructure: input.hasStructureChanges && input.canReplaceStructure,
  }
}

/** Mesmo reason nos dois PATCHes quando ambos dirty. */
export function withSharedEditReason<T extends object>(
  body: T,
  reason: string | undefined,
): T & { reason?: string } {
  if (reason == null || reason === '') return body
  return { ...body, reason }
}
