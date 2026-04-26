import { describe, expect, it } from 'vitest'
import {
  parseUsersListUrlState,
  serializeUsersListUrl,
  USERS_DEFAULT_PAGE_SIZE,
  usersUrlStateToListApi,
} from './usersListUrlState'

describe('usersListUrlState', () => {
  it('parse defaults', () => {
    const s = parseUsersListUrlState(new URLSearchParams())
    expect(s.page).toBe(1)
    expect(s.pageSize).toBe(USERS_DEFAULT_PAGE_SIZE)
    expect(s.focusUserId).toBeNull()
  })

  it('round-trip omits defaults', () => {
    const s = parseUsersListUrlState(new URLSearchParams())
    const q = serializeUsersListUrl(s)
    expect([...q.keys()].length).toBe(0)
  })

  it('usersUrlStateToListApi offset', () => {
    const api = usersUrlStateToListApi({
      page: 3,
      pageSize: 25,
      search: '',
      roleId: '',
      focusUserId: null,
    })
    expect(api.offset).toBe(50)
    expect(api.limit).toBe(25)
  })
})
