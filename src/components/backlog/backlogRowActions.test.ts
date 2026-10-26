import { describe, expect, it } from 'vitest'
import { resolveBacklogArchiveAction, shouldShowBacklogDeleteAction } from './backlogRowActions'
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

describe('resolveBacklogArchiveAction (Arquivar/Desarquivar)', () => {
  const row = (
    status: BacklogRow['status'],
    panelSection?: BacklogRow['panelSection'],
  ): Pick<BacklogRow, 'status' | 'esteiraId' | 'panelSection'> => ({
    status,
    esteiraId: 'uuid-1',
    panelSection,
  })

  it('encerrada no Operacional oferece Arquivar', () => {
    expect(resolveBacklogArchiveAction(row('finalizada', 'OPERACIONAL'), true)).toBe('archive')
    expect(resolveBacklogArchiveAction(row('cancelada', 'OPERACIONAL'), true)).toBe('archive')
  })

  it('esteira no Histórico oferece Desarquivar', () => {
    expect(resolveBacklogArchiveAction(row('finalizada', 'HISTORICO'), true)).toBe('unarchive')
    expect(resolveBacklogArchiveAction(row('cancelada', 'HISTORICO'), true)).toBe('unarchive')
  })

  it('sem conveyors.edit_status não mostra ação', () => {
    expect(resolveBacklogArchiveAction(row('finalizada', 'OPERACIONAL'), false)).toBeNull()
    expect(resolveBacklogArchiveAction(row('cancelada', 'HISTORICO'), false)).toBeNull()
  })

  it('esteira aberta, sem seção da API ou sem id não mostra ação', () => {
    for (const s of [
      'em_elaboracao',
      'aguardando_planejamento',
      'em_planejamento',
      'a_iniciar',
      'em_andamento',
    ] as const) {
      expect(resolveBacklogArchiveAction(row(s, 'OPERACIONAL'), true)).toBeNull()
    }
    expect(resolveBacklogArchiveAction(row('finalizada'), true)).toBeNull()
    expect(
      resolveBacklogArchiveAction(
        { status: 'finalizada', esteiraId: undefined, panelSection: 'OPERACIONAL' },
        true,
      ),
    ).toBeNull()
  })
})
