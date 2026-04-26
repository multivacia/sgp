export const COLABS_DEFAULT_PAGE_SIZE = 25
export const COLABS_PAGE_SIZE_OPTIONS = [25, 50, 100] as const

export type CollaboratorsListUrlState = {
  page: number
  pageSize: number
  search: string
  sectorId: string
  roleId: string
  status: 'ALL' | 'ACTIVE' | 'INACTIVE'
  focusCollaboratorId: string | null
}

function parsePositiveInt(s: string | null, fallback: number): number {
  const n = Number.parseInt(s ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function parseCollaboratorsListUrlState(
  sp: URLSearchParams,
): CollaboratorsListUrlState {
  const page = Math.max(1, parsePositiveInt(sp.get('page'), 1))
  const psRaw = sp.get('pageSize')
  const psNum = Number.parseInt(psRaw ?? '', 10)
  const pageSize = (COLABS_PAGE_SIZE_OPTIONS as readonly number[]).includes(psNum)
    ? psNum
    : COLABS_DEFAULT_PAGE_SIZE

  const stRaw = (sp.get('status') ?? 'ALL').toUpperCase()
  const status = ['ALL', 'ACTIVE', 'INACTIVE'].includes(stRaw)
    ? (stRaw as CollaboratorsListUrlState['status'])
    : 'ALL'

  return {
    page,
    pageSize,
    search: sp.get('search')?.trim() ?? '',
    sectorId: sp.get('sectorId')?.trim() ?? '',
    roleId: sp.get('roleId')?.trim() ?? '',
    status,
    focusCollaboratorId: sp.get('collaboratorId')?.trim() || null,
  }
}

export function serializeCollaboratorsListUrl(
  state: CollaboratorsListUrlState,
): URLSearchParams {
  const q = new URLSearchParams()
  if (state.page > 1) q.set('page', String(state.page))
  if (state.pageSize !== COLABS_DEFAULT_PAGE_SIZE) q.set('pageSize', String(state.pageSize))
  if (state.search.trim()) q.set('search', state.search.trim())
  if (state.sectorId) q.set('sectorId', state.sectorId)
  if (state.roleId) q.set('roleId', state.roleId)
  if (state.status !== 'ALL') q.set('status', state.status)
  if (state.focusCollaboratorId) q.set('collaboratorId', state.focusCollaboratorId)
  return q
}

export function collaboratorsUrlStateToListApi(state: CollaboratorsListUrlState): {
  limit: number
  offset: number
  search?: string
  sectorId?: string
  roleId?: string
  status: 'ALL' | 'ACTIVE' | 'INACTIVE'
} {
  const offset = (state.page - 1) * state.pageSize
  return {
    limit: state.pageSize,
    offset,
    search: state.search.trim() || undefined,
    sectorId: state.sectorId || undefined,
    roleId: state.roleId || undefined,
    status: state.status,
  }
}
