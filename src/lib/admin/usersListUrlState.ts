/** Estado de listagem de usuários na URL (SPA). `offset`/`limit` só na chamada à API. */

export const USERS_DEFAULT_PAGE_SIZE = 25
export const USERS_PAGE_SIZE_OPTIONS = [25, 50, 100] as const

export type UsersListUrlState = {
  page: number
  pageSize: number
  search: string
  roleId: string
  focusUserId: string | null
}

function parsePositiveInt(s: string | null, fallback: number): number {
  const n = Number.parseInt(s ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function parseUsersListUrlState(sp: URLSearchParams): UsersListUrlState {
  const page = Math.max(1, parsePositiveInt(sp.get('page'), 1))
  const psRaw = sp.get('pageSize')
  const psNum = Number.parseInt(psRaw ?? '', 10)
  const pageSize = (USERS_PAGE_SIZE_OPTIONS as readonly number[]).includes(psNum)
    ? psNum
    : USERS_DEFAULT_PAGE_SIZE

  return {
    page,
    pageSize,
    search: sp.get('search')?.trim() ?? '',
    roleId: sp.get('roleId')?.trim() ?? '',
    focusUserId: sp.get('userId')?.trim() || null,
  }
}

export function serializeUsersListUrl(state: UsersListUrlState): URLSearchParams {
  const q = new URLSearchParams()
  if (state.page > 1) q.set('page', String(state.page))
  if (state.pageSize !== USERS_DEFAULT_PAGE_SIZE) q.set('pageSize', String(state.pageSize))
  if (state.search.trim()) q.set('search', state.search.trim())
  if (state.roleId) q.set('roleId', state.roleId)
  if (state.focusUserId) q.set('userId', state.focusUserId)
  return q
}

export function usersUrlStateToListApi(state: UsersListUrlState): {
  limit: number
  offset: number
  search?: string
  roleId?: string
} {
  const offset = (state.page - 1) * state.pageSize
  return {
    limit: state.pageSize,
    offset,
    search: state.search.trim() || undefined,
    roleId: state.roleId || undefined,
  }
}
