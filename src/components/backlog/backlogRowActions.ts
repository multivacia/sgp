import type { BacklogRow } from '../../mocks/backlog'

const DELETE_ELIGIBLE_STATUSES = new Set([
  'em_elaboracao',
  'aguardando_planejamento',
  'em_planejamento',
  'a_iniciar',
])

export type BacklogArchiveAction = 'archive' | 'unarchive'

/**
 * Ação de arquivamento válida para a linha (backend revalida):
 * encerrada no Operacional → `archive`; no Histórico → `unarchive`; demais → `null`.
 * Exige `conveyors.edit_status` e linha vinda da API (com `panelSection`).
 */
export function resolveBacklogArchiveAction(
  row: Pick<BacklogRow, 'status' | 'esteiraId' | 'panelSection'>,
  canEditStatus: boolean,
): BacklogArchiveAction | null {
  if (!canEditStatus || !row.esteiraId || !row.panelSection) return null
  if (row.status !== 'finalizada' && row.status !== 'cancelada') return null
  return row.panelSection === 'HISTORICO' ? 'unarchive' : 'archive'
}

/** Exibe “Excluir” quando status permite tentativa; backend valida apontamentos. */
export function shouldShowBacklogDeleteAction(
  row: Pick<BacklogRow, 'status' | 'esteiraId'>,
  canManageConveyors: boolean,
): boolean {
  return (
    canManageConveyors &&
    DELETE_ELIGIBLE_STATUSES.has(row.status) &&
    Boolean(row.esteiraId)
  )
}
