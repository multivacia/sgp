import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type {
  ProductionCollaboratorSummary,
  ProductionWorkQueueItem,
} from '../../domain/production/production.types'
import { KioskPage } from './KioskPage'
import { KioskActivityCards } from './KioskActivityCards'

const collaborator: ProductionCollaboratorSummary = {
  id: 'col-1',
  fullName: 'Maria Silva',
  name: 'Maria Silva',
  displayName: 'Maria Silva',
  avatarUrl: null,
  initials: 'MS',
  teamName: 'Equipe A',
  productionCredentialStatus: 'READY',
}

function workQueueItem(
  overrides: Partial<ProductionWorkQueueItem> & Pick<ProductionWorkQueueItem, 'workPlanItemId'>,
): ProductionWorkQueueItem {
  return {
    conveyorId: 'cv-1',
    conveyorTitle: '7452',
    activityNodeId: overrides.workPlanItemId,
    activityTitle: overrides.workPlanItemId,
    taskTitle: 'Tarefa',
    sectorTitle: 'Setor',
    plannedDate: '2026-05-04',
    plannedMinutes: 60,
    realizedMinutes: 0,
    pendingMinutes: 60,
    activityOperationalStatus: 'PENDING',
    isActivityCompleted: false,
    isOverdue: false,
    isOutOfSequence: false,
    isNextRecommended: false,
    hasPreviousPendingStep: false,
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
    requiresOutOfSequenceJustification: false,
    ...overrides,
  }
}

describe('kiosk layout shell', () => {
  it('reserva área principal flexível e mantém rodapé da versão no fluxo do documento', () => {
    const html = renderToStaticMarkup(<KioskPage />)

    expect(html).toContain('data-sgp-surface="kiosk"')
    expect(html).toContain('data-sgp-kiosk-main=""')
    expect(html).toContain('min-h-dvh')
    expect(html).toContain('data-sgp-kiosk-main="" class="flex min-h-0 flex-1 flex-col overflow-hidden"')
    expect(html).toContain('data-sgp-version-stamp=""')
    expect(html).toContain('data-sgp-version-placement="footer"')
    expect(html).not.toContain('fixed bottom-0')
    expect(html).not.toMatch(/<footer[^>]*fixed/)
  })
})

describe('KioskActivityCards layout', () => {
  it('expõe navegação do carrossel acima do rodapé, sem posicionamento fixo', () => {
    const html = renderToStaticMarkup(
      <KioskActivityCards
        collaborator={collaborator}
        initialItems={[
          workQueueItem({ workPlanItemId: 'a-1', isNextRecommended: true }),
          workQueueItem({ workPlanItemId: 'a-2' }),
        ]}
        onExit={() => undefined}
      />,
    )

    expect(html).toContain('data-sgp-kiosk-carousel-nav=""')
    expect(html).toContain('aria-label="Atividade anterior"')
    expect(html).toContain('aria-label="Próxima atividade"')
    expect(html).toContain('flex min-h-0 flex-1 flex-col overflow-hidden')
    expect(html).toContain('min-h-0 flex-1 overflow-hidden')
    expect(html).not.toContain('data-sgp-kiosk-carousel-nav="" class="fixed')
  })

  it('usa container rolável no modo lista', () => {
    const html = renderToStaticMarkup(
      <KioskActivityCards
        collaborator={collaborator}
        initialItems={[workQueueItem({ workPlanItemId: 'a-1' })]}
        initialViewMode="list"
        onExit={() => undefined}
      />,
    )

    expect(html).toContain('data-sgp-kiosk-list-scroll=""')
    expect(html).toContain('data-sgp-kiosk-list-scroll="" class="min-h-0 flex-1 overflow-y-auto p-5"')
    expect(html).not.toContain('data-sgp-kiosk-carousel-nav=""')
  })
})
