import { describe, expect, it } from 'vitest'
import { shouldShowBacklogDeleteAction } from './backlogRowActions'
import type { BacklogRow } from '../../mocks/backlog'

const baseRow: BacklogRow = {
  id: '1',
  ref: 'OS-1',
  name: 'Teste',
  origin: 'manual',
  activities: 1,
  responsible: '—',
  priority: 'media',
  status: 'no_backlog',
  enteredAt: new Date().toISOString(),
  esteiraId: 'uuid-1',
}

describe('shouldShowBacklogDeleteAction', () => {
  it('shows when status is no_backlog and user can manage', () => {
    expect(shouldShowBacklogDeleteAction(baseRow, true)).toBe(true)
  })

  it('hides when status is not no_backlog', () => {
    expect(
      shouldShowBacklogDeleteAction({ ...baseRow, status: 'em_revisao' }, true),
    ).toBe(false)
    expect(
      shouldShowBacklogDeleteAction({ ...baseRow, status: 'em_producao' }, true),
    ).toBe(false)
    expect(
      shouldShowBacklogDeleteAction({ ...baseRow, status: 'concluida' }, true),
    ).toBe(false)
  })

  it('hides without conveyors.create permission', () => {
    expect(shouldShowBacklogDeleteAction(baseRow, false)).toBe(false)
  })

  it('hides without esteiraId', () => {
    expect(
      shouldShowBacklogDeleteAction({ ...baseRow, esteiraId: undefined }, true),
    ).toBe(false)
  })
})
