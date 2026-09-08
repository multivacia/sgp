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
