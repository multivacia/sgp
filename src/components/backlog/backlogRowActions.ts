import type { BacklogRow } from '../../mocks/backlog'

/** Exibe “Excluir” somente pelo status técnico mapeado (`no_backlog`), não pelo bucket visual. */
export function shouldShowBacklogDeleteAction(
  row: Pick<BacklogRow, 'status' | 'esteiraId'>,
  canManageConveyors: boolean,
): boolean {
  return canManageConveyors && row.status === 'no_backlog' && Boolean(row.esteiraId)
}
