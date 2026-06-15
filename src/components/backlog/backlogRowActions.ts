import type { BacklogRow } from '../../mocks/backlog'

const DELETE_ELIGIBLE_STATUSES = new Set([
  'em_elaboracao',
  'aguardando_planejamento',
  'em_planejamento',
  'a_iniciar',
])

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
