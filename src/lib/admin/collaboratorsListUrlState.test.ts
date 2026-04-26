import { describe, expect, it } from 'vitest'
import {
  collaboratorsUrlStateToListApi,
  COLABS_DEFAULT_PAGE_SIZE,
  parseCollaboratorsListUrlState,
  serializeCollaboratorsListUrl,
} from './collaboratorsListUrlState'

describe('collaboratorsListUrlState', () => {
  it('parse defaults', () => {
    const s = parseCollaboratorsListUrlState(new URLSearchParams())
    expect(s.page).toBe(1)
    expect(s.pageSize).toBe(COLABS_DEFAULT_PAGE_SIZE)
    expect(s.focusCollaboratorId).toBeNull()
  })

  it('role_id flows to api', () => {
    const sp = new URLSearchParams('roleId=22222222-2222-2222-2222-222222222222')
    const s = parseCollaboratorsListUrlState(sp)
    expect(s.roleId).toBe('22222222-2222-2222-2222-222222222222')
    const api = collaboratorsUrlStateToListApi(s)
    expect(api.roleId).toBe('22222222-2222-2222-2222-222222222222')
  })

  it('serialize keeps collaboratorId focus', () => {
    const s = parseCollaboratorsListUrlState(new URLSearchParams())
    const q = serializeCollaboratorsListUrl({
      ...s,
      focusCollaboratorId: '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c',
    })
    expect(q.get('collaboratorId')).toBe('3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c')
  })
})
