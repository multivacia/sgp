import { describe, expect, it } from 'vitest'
import type { TimeEntryCandidateItem } from './my-activities.types'

describe('TimeEntryCandidateItem (shape)', () => {
  it('inclui tempos previsto, realizado e pendente', () => {
    const x: TimeEntryCandidateItem = {
      conveyorId: '00000000-0000-4000-8000-000000000001',
      conveyorCode: null,
      conveyorName: 'Esteira',
      clientName: null,
      vehicleLabel: null,
      plate: null,
      stepNodeId: '00000000-0000-4000-8000-000000000002',
      stepName: 'PASSO',
      areaName: 'Área',
      roleInStep: 'primary',
      assignmentType: 'COLLABORATOR',
      plannedMinutes: 60,
      realizedMinutes: 15,
      pendingMinutes: 45,
    }
    expect(x.pendingMinutes).toBe(45)
    expect(x.realizedMinutes).toBe(15)
  })
})
