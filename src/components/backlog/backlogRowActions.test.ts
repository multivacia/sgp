import { describe, expect, it } from 'vitest'
import { shouldShowBacklogDeleteAction } from './backlogRowActions'
import type { BacklogRow } from '../../mocks/backlog'

const baseRow = (status: BacklogRow['status']): Pick<BacklogRow, 'status' | 'esteiraId'> => ({
  status,
  esteiraId: 'uuid-1',
})

describe('shouldShowBacklogDeleteAction', () => {
  it('mostra excluir em rascunho e etapas pré-execução', () => {
    expect(shouldShowBacklogDeleteAction(baseRow('em_elaboracao'), true)).toBe(true)
    expect(shouldShowBacklogDeleteAction(baseRow('a_iniciar'), true)).toBe(true)
  })

  it('oculta excluir em andamento/finalizada', () => {
    expect(shouldShowBacklogDeleteAction(baseRow('em_andamento'), true)).toBe(false)
    expect(shouldShowBacklogDeleteAction(baseRow('finalizada'), true)).toBe(false)
  })

  it('exige permissão de gestão', () => {
    expect(shouldShowBacklogDeleteAction(baseRow('em_elaboracao'), false)).toBe(false)
  })
})
