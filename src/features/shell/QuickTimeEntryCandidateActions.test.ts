import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import { QuickTimeEntryCandidateActions } from './QuickTimeEntryCandidateActions'

function baseCandidate(
  overrides: Partial<TimeEntryCandidateItem> = {},
): TimeEntryCandidateItem {
  return {
    conveyorId: 'c1',
    conveyorCode: null,
    conveyorName: 'Esteira',
    clientName: null,
    vehicleLabel: null,
    plate: null,
    stepNodeId: 's1',
    stepName: 'Atividade',
    activityTitle: 'Atividade',
    areaName: 'Setor',
    sectorTitle: 'Setor',
    roleInStep: 'primary',
    assignmentType: 'COLLABORATOR',
    plannedMinutes: 30,
    realizedMinutes: 0,
    pendingMinutes: 30,
    isAssignedToMe: true,
    requiresJustification: false,
    isOutOfSequence: false,
    requiresOutOfSequenceJustification: false,
    previousOpenCount: 0,
    previousOpenActivities: [],
    canCompleteStep: true,
    ...overrides,
  }
}

describe('QuickTimeEntryCandidateActions', () => {
  it('renderiza Apontar e Concluir atividade para candidato elegível', () => {
    const html = renderToStaticMarkup(
      createElement(QuickTimeEntryCandidateActions, {
        candidate: baseCandidate(),
        onApontar: vi.fn(),
        onComplete: vi.fn(),
      }),
    )
    expect(html).toContain('Apontar')
    expect(html).toContain('Concluir atividade')
  })

  it('não renderiza Concluir atividade quando canCompleteStep=false', () => {
    const html = renderToStaticMarkup(
      createElement(QuickTimeEntryCandidateActions, {
        candidate: baseCandidate({ canCompleteStep: false }),
        onApontar: vi.fn(),
        onComplete: vi.fn(),
      }),
    )
    expect(html).toContain('Apontar')
    expect(html).not.toContain('Concluir atividade')
  })

  it('não renderiza Concluir atividade fora da alocação (usa formulário + markAsDone)', () => {
    const html = renderToStaticMarkup(
      createElement(QuickTimeEntryCandidateActions, {
        candidate: baseCandidate({
          isAssignedToMe: false,
          requiresJustification: true,
        }),
        onApontar: vi.fn(),
        onComplete: vi.fn(),
      }),
    )
    expect(html).toContain('Apontar')
    expect(html).not.toContain('Concluir atividade')
  })
})
