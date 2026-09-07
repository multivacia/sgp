/**
 * Política de salvar (aba Estrutura). Desde o diff incremental de estrutura
 * (PATCH /conveyors/:id/structure preserva ids, funciona em qualquer status),
 * não há mais bloqueio "tudo ou nada" por status — a estrutura pode ser
 * editada em qualquer status operacional. Inclusão tardia (append-only,
 * "Incluir novo item") continua disponível como ação adicional — ver
 * `showLateAppendAction` em `ConveyorCreateEditPage.tsx`.
 */

export const LATE_STRUCTURE_APPEND_SUCCESS_MESSAGE =
  'Novo item incluído. As novas atividades estão disponíveis no Backlog do Planejamento Semanal.'

export function resolveCanSaveConveyorChanges(input: {
  hasDadosChanges: boolean
  hasStructureChanges: boolean
  estruturaOk: boolean
}): boolean {
  if (input.hasDadosChanges) return true
  if (!input.hasStructureChanges) return false
  return input.estruturaOk
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
}): { patchDados: boolean; patchStructure: boolean } {
  if (input.mode === 'create') {
    return { patchDados: false, patchStructure: false }
  }
  return {
    patchDados: input.hasDadosChanges,
    patchStructure: input.hasStructureChanges,
  }
}
