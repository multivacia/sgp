import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { KioskRegisterSheet, type KioskRegisterSheetProps } from './KioskRegisterSheet'
import type { ProductionWorkQueueItem } from '../../domain/production/production.types'
import { emptyJustificationFieldValue } from '../../domain/operational/timeEntryJustificationField'

const baseItem = (
  overrides: Partial<ProductionWorkQueueItem> = {},
): ProductionWorkQueueItem => ({
  workPlanItemId: 'wpi-1',
  conveyorId: 'cv-1',
  conveyorTitle: 'OS 001',
  activityNodeId: 'act-1',
  activityTitle: 'Atividade de teste',
  taskTitle: 'Tarefa',
  sectorTitle: 'Setor',
  plannedDate: '2026-05-28',
  plannedMinutes: 15,
  realizedMinutes: 0,
  pendingMinutes: 15,
  activityOperationalStatus: 'PENDING',
  isActivityCompleted: false,
  isOverdue: false,
  isOutOfSequence: false,
  isNextRecommended: false,
  hasPreviousPendingStep: false,
  requiresOutOfSequenceJustification: false,
  previousOpenCount: 0,
  previousOpenActivities: [],
  allPreviousOpenActivities: [],
  awaitingPreviousActivities: [],
  hasPreviousOpenActivitiesFromOtherCollaborators: false,
  previousOpenActivitiesFromOtherCollaborators: [],
  previousOpenActivitiesWarningMessage: null,
  group: 'today',
  canTrackTime: true,
  canCompleteStep: true,
  ...overrides,
})

const baseProps = (
  overrides: Partial<KioskRegisterSheetProps> = {},
): KioskRegisterSheetProps => ({
  item: baseItem(),
  preset: null,
  minutesCustom: '',
  sessionPct: 0,
  markAsDone: false,
  submitting: false,
  error: null,
  confirmLowPct: false,
  needsOosJustification: false,
  needsExcessTimeJustification: false,
  needsOperationalJustification: false,
  outOfSequenceJustification: emptyJustificationFieldValue(),
  preferredCategory: null,
  canSubmit: true,
  onClose: () => {},
  onSelectPreset: () => {},
  onCustomInput: () => {},
  onSessionPctChange: () => {},
  onMarkAsDoneChange: () => {},
  onJustificationChange: () => {},
  onCatalogStateChange: () => {},
  onRegister: () => {},
  onConfirmLowPct: () => {},
  onCancelLowPct: () => {},
  ...overrides,
})

function render(overrides: Partial<KioskRegisterSheetProps> = {}): string {
  return renderToStaticMarkup(createElement(KioskRegisterSheet, baseProps(overrides)))
}

describe('KioskRegisterSheet', () => {
  it('renderiza o alerta de tempo acima do previsto quando needsExcessTimeJustification=true', () => {
    const html = render({ needsExcessTimeJustification: true })
    expect(html).toContain('Tempo acima do previsto — confirme o apontamento.')
  })

  it('não renderiza o alerta de tempo acima do previsto quando needsExcessTimeJustification=false', () => {
    const html = render({ needsExcessTimeJustification: false })
    expect(html).not.toContain('Tempo acima do previsto')
  })

  it('renderiza o alerta de fora de sequência e a lista de atividades pendentes quando needsOosJustification=true', () => {
    const html = render({
      needsOosJustification: true,
      item: baseItem({
        requiresOutOfSequenceJustification: true,
        allPreviousOpenActivities: [
          { activityTitle: 'Desmontagem', sectorTitle: 'Funilaria', taskTitle: 'Prep' },
        ],
      }),
    })
    expect(html).toContain('Fora de sequência — confirme o apontamento.')
    expect(html).toContain('Existem etapas anteriores pendentes. Informe uma justificativa para apontar.')
    expect(html).toContain('Desmontagem')
    expect(html).toContain('Funilaria')
  })

  it('não renderiza o alerta de fora de sequência quando needsOosJustification=false', () => {
    const html = render({ needsOosJustification: false })
    expect(html).not.toContain('Fora de sequência — confirme o apontamento.')
  })

  it('renderiza JustificationSelect somente quando needsOperationalJustification=true', () => {
    const htmlWith = render({ needsOperationalJustification: true })
    expect(htmlWith).toContain('Carregando justificativas…')

    const htmlWithout = render({ needsOperationalJustification: false })
    expect(htmlWithout).not.toContain('Carregando justificativas…')
  })

  it('renderiza o toggle "Concluir atividade ao registrar" somente quando item.canCompleteStep=true', () => {
    const htmlWith = render({ item: baseItem({ canCompleteStep: true }) })
    expect(htmlWith).toContain('Concluir atividade ao registrar')

    const htmlWithout = render({ item: baseItem({ canCompleteStep: false }) })
    expect(htmlWithout).not.toContain('Concluir atividade ao registrar')
  })

  it('renderiza o botão de submit com disabled quando submitting=true', () => {
    const html = render({ submitting: true, canSubmit: true })
    const buttonMatch = html.match(/<button[^>]*>Registrando…<\/button>/)
    expect(buttonMatch).not.toBeNull()
    expect(buttonMatch![0]).toContain('disabled=""')
  })

  it('renderiza o botão de submit com disabled quando canSubmit=false', () => {
    const html = render({ submitting: false, canSubmit: false })
    const buttonMatch = html.match(/<button[^>]*>Registrar apontamento<\/button>/)
    expect(buttonMatch).not.toBeNull()
    expect(buttonMatch![0]).toContain('disabled=""')
  })

  it('não desabilita o botão de submit quando submitting=false e canSubmit=true', () => {
    const html = render({ submitting: false, canSubmit: true })
    const buttonMatch = html.match(/<button[^>]*>Registrar apontamento<\/button>/)
    expect(buttonMatch).not.toBeNull()
    expect(buttonMatch![0]).not.toContain('disabled=""')
  })

  it('contém grid com exatamente 4 botões de preset em 2 colunas, nenhum com altura conhecida < 50px', () => {
    const html = render()
    expect(html).toContain('grid-cols-2')
    expect(html).toContain('15 min')
    expect(html).toContain('30 min')
    expect(html).toContain('45 min')
    expect(html).toContain('60 min')
    expect((html.match(/ min<\/button>/g) ?? []).length).toBe(4)
    expect(html).not.toContain('min-h-12')
  })
})
