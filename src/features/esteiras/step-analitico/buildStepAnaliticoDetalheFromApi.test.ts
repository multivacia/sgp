import { describe, expect, it } from 'vitest'
import { buildStepAnaliticoDetalheFromApi } from './buildStepAnaliticoDetalheFromApi'

describe('buildStepAnaliticoDetalheFromApi', () => {
  it('monta equipe principal + apoios e resumo a partir das listagens', () => {
    const d = buildStepAnaliticoDetalheFromApi({
      conveyorId: 'c1',
      stepNodeId: 's1',
      planejadoMin: 60,
      assignees: [
        {
          id: 'a1',
          type: 'COLLABORATOR',
          collaboratorId: 'col-a',
          collaboratorName: 'Ana',
          teamId: null,
          teamName: null,
          isPrimary: true,
          assignmentOrigin: 'manual',
          orderIndex: 0,
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
        },
        {
          id: 'a2',
          type: 'COLLABORATOR',
          collaboratorId: 'col-b',
          collaboratorName: 'Beto',
          teamId: null,
          teamName: null,
          isPrimary: false,
          assignmentOrigin: 'manual',
          orderIndex: 1,
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
        },
      ],
      timeEntries: [
        {
          id: 't1',
          collaboratorId: 'col-a',
          collaboratorName: 'Ana',
          conveyorNodeAssigneeId: 'a1',
          minutes: 30,
          notes: null,
          entryMode: 'manual',
          entryAt: '2026-01-02T12:00:00.000Z',
          createdAt: '2026-01-02T12:00:00.000Z',
          updatedAt: '2026-01-02T12:00:00.000Z',
          isDelegated: false,
          recordedByAppUserId: null,
          recordedByUserEmail: null,
          delegationReason: null,
        },
      ],
      cargaParcial: false,
    })
    expect(d.conveyorId).toBe('c1')
    expect(d.stepNodeId).toBe('s1')
    expect(d.equipe.principal?.nomeExibicao).toBe('Ana')
    expect(d.equipe.apoios).toHaveLength(1)
    expect(d.apontamentos.totalMinutosApontados).toBe(30)
    expect(d.apontamentos.quantidadeLancamentos).toBe(1)
    expect(d.historicoPreview[0]?.origem).toBe('api')
  })

  it('sem assignees: principal nulo e totais zerados', () => {
    const d = buildStepAnaliticoDetalheFromApi({
      conveyorId: 'c1',
      stepNodeId: 's1',
      planejadoMin: 0,
      assignees: [],
      timeEntries: [],
    })
    expect(d.equipe.principal).toBeNull()
    expect(d.apontamentos.totalMinutosApontados).toBe(0)
    expect(d.apontamentos.statusLeitura).toBe('no_prazo')
  })
})
