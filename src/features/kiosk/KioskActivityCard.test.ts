import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { KioskActivityCard } from './KioskActivityCard'
import kioskActivityCardSource from './KioskActivityCard.tsx?raw'
import type { ProductionWorkQueueItem } from '../../domain/production/production.types'

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

describe('KioskActivityCard', () => {
  it('quando canTrackTime=true, renderiza ProgressRing e metadados, sem alertas grandes/presets/slider no HTML do card', () => {
    const html = renderToStaticMarkup(
      createElement(KioskActivityCard, {
        item: baseItem({ isOutOfSequence: true, requiresOutOfSequenceJustification: true }),
        onSuccess: () => {},
      }),
    )

    // ProgressRing e metadados presentes
    expect(html).toContain('svg')
    expect(html).toContain('Atividade de teste')
    expect(html).toContain('Setor')
    expect(html).toContain('Tarefa')
    expect(html).toContain('OS 001')

    // CTA único que abre o sheet
    expect(html).toContain('Registrar apontamento')

    // Grandes alertas/presets/slider não devem estar no HTML estático do próprio card
    // (o sheet só é montado via portal quando sheetOpen=true, o que não ocorre no render inicial)
    expect(html).not.toContain('Tempo acima do previsto')
    expect(html).not.toContain('Existem etapas anteriores pendentes')
    expect(html).not.toContain('grid-cols-2')
    expect(html).not.toContain('Evolução da atividade (nesta sessão)')
    expect(html).not.toContain('Concluir atividade ao registrar')
  })

  it('quando canTrackTime=false, mantém bloco "Apontamento não disponível" inalterado e sem CTA de sheet', () => {
    const html = renderToStaticMarkup(
      createElement(KioskActivityCard, {
        item: baseItem({ canTrackTime: false, isActivityCompleted: false }),
        onSuccess: () => {},
      }),
    )

    expect(html).toContain('Apontamento não disponível para esta atividade no momento.')
    expect(html).not.toContain('Registrar apontamento')
  })

  it('quando canTrackTime=false e isActivityCompleted=true, mantém mensagem de atividade concluída', () => {
    const html = renderToStaticMarkup(
      createElement(KioskActivityCard, {
        item: baseItem({ canTrackTime: false, isActivityCompleted: true }),
        onSuccess: () => {},
      }),
    )

    expect(html).toContain('Esta atividade já foi concluída operacionalmente.')
  })

  it('preserva o texto do estado de sucesso "Apontamento registrado!" inalterado no código-fonte', () => {
    expect(kioskActivityCardSource).toContain('Apontamento registrado!')
    expect(kioskActivityCardSource).toContain('Avançando para a próxima atividade…')
    expect(kioskActivityCardSource).toContain('Atividade concluída. Avançando…')
    expect(kioskActivityCardSource).toContain('setTimeout(() => {')
    expect(kioskActivityCardSource).toContain('3000')
  })
})
