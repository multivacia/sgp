import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { OperationalPlanningFactoryIntakeItem } from '../../domain/operational-planning/operational-planning.types'
import { FactoryIntakeItemCard } from './FactoryIntakeItemCard'

function item(overrides: Partial<OperationalPlanningFactoryIntakeItem> = {}): OperationalPlanningFactoryIntakeItem {
  return {
    conveyorOperationalPlanId: 'plan-1',
    conveyorOperationalPlanItemId: 'plan-item-1',
    conveyorId: 'conveyor-1',
    conveyorName: 'OS 7549',
    activityNodeId: 'node-1',
    plannedDate: null,
    plannedOrder: 1,
    plannedMinutes: 30,
    plannedCollaboratorId: null,
    plannedCollaboratorName: null,
    plannedTeamId: null,
    plannedTeamName: null,
    taskTitle: 'Bancos',
    sectorTitle: 'Costura',
    activityTitle: 'Costurar capa',
    activityOperationalStatus: null,
    realizedMinutes: 0,
    reviewRequired: false,
    syncStatus: null,
    factoryPlanningStatus: null,
    operationalPlanStatus: null,
    planItemStatus: 'LINKED',
    totalPlanItems: 1,
    linkedPlanItems: 0,
    pendingPlanItems: 1,
    ...overrides,
  }
}

function renderCard(activityOperationalStatus: string | null): string {
  return renderToStaticMarkup(
    <FactoryIntakeItemCard
      item={item({ activityOperationalStatus })}
      blocked={false}
      onAddClick={() => undefined}
    />,
  )
}

describe('FactoryIntakeItemCard — situação da atividade', () => {
  it.each([
    ['PENDING', 'Aberta'],
    ['IN_PROGRESS', 'Em andamento'],
    ['COMPLETED', 'Concluída'],
    ['REOPENED', 'Reaberta'],
    ['BLOCKED', 'Bloqueada'],
    ['ABORTED', 'Dispensada'],
  ])('%s mostra "Atividade: %s", sem o código cru', (status, label) => {
    const html = renderCard(status)

    expect(html).toContain(`Atividade: ${label}`)
    expect(html).not.toContain(status)
    expect(html).not.toContain('STEP')
  })

  it.each([[null], [''], ['NOT_STARTED']])('status %j não renderiza a linha "Atividade:"', (status) => {
    const html = renderCard(status)

    expect(html).not.toContain('Atividade:')
    expect(html).not.toContain('NOT_STARTED')
    expect(html).not.toContain('STEP')
    expect(html).toContain('Costurar capa')
  })
})
