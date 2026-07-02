import { describe, expect, it } from 'vitest'
import {
  computeProductionCollaboratorInitials,
  filterProductionCollaboratorsByName,
  filterProductionWorkQueue,
  formatProductionDate,
  formatProductionMinutes,
  isProductionDefaultInitialPin,
  isValidProductionPin,
  normalizeProductionSearchText,
  productionTrackTimeDisabledTitle,
  resolveProductionCredentialBadge,
  resolveProductionOperationalStatusDisplay,
  sortProductionCollaboratorsByName,
} from './production.helpers'
import type { ProductionCollaboratorSummary, ProductionWorkQueueItem } from './production.types'

const sample = (
  id: string,
  fullName: string,
  productionCredentialStatus: ProductionCollaboratorSummary['productionCredentialStatus'] = 'READY',
): ProductionCollaboratorSummary => ({
  id,
  fullName,
  name: fullName,
  displayName: fullName,
  avatarUrl: null,
  initials: 'XX',
  teamName: null,
  productionCredentialStatus,
})

describe('production.helpers', () => {
  describe('normalizeProductionSearchText / filterProductionCollaboratorsByName', () => {
    it('ignora acentos e caixa na busca', () => {
      const items = [
        sample('1', 'José da Silva'),
        sample('2', 'Maria Oliveira'),
      ]
      expect(
        filterProductionCollaboratorsByName(items, 'jose'),
      ).toEqual([items[0]])
      expect(
        filterProductionCollaboratorsByName(items, 'MARIA'),
      ).toEqual([items[1]])
    })

    it('retorna todos quando busca vazia', () => {
      const items = [sample('1', 'Ana'), sample('2', 'Beto')]
      expect(filterProductionCollaboratorsByName(items, '  ')).toEqual(items)
    })

    it('normalizeProductionSearchText remove diacríticos', () => {
      expect(normalizeProductionSearchText('ÇÃo')).toBe('cao')
    })
  })

  describe('isValidProductionPin', () => {
    it('aceita PIN de 4 a 8 dígitos', () => {
      expect(isValidProductionPin('1234')).toBe(true)
      expect(isValidProductionPin('12345678')).toBe(true)
    })

    it('rejeita vazio, texto, menos de 4 e mais de 8', () => {
      expect(isValidProductionPin('')).toBe(false)
      expect(isValidProductionPin('12ab')).toBe(false)
      expect(isValidProductionPin('123')).toBe(false)
      expect(isValidProductionPin('123456789')).toBe(false)
    })
  })

  describe('isProductionDefaultInitialPin', () => {
    it('identifica PIN inicial padrão', () => {
      expect(isProductionDefaultInitialPin('1234')).toBe(true)
      expect(isProductionDefaultInitialPin('5678')).toBe(false)
    })
  })

  describe('resolveProductionCredentialBadge', () => {
    it('retorna badge para PIN pendente', () => {
      expect(resolveProductionCredentialBadge('NEEDS_INITIAL_PIN')?.label).toBe(
        'PIN pendente',
      )
    })

    it('não retorna badge para READY', () => {
      expect(resolveProductionCredentialBadge('READY')).toBeNull()
    })
  })

  describe('sortProductionCollaboratorsByName', () => {
    it('ordena por nome pt-BR', () => {
      const items = [
        sample('2', 'Zeca'),
        sample('1', 'Ana'),
      ]
      expect(sortProductionCollaboratorsByName(items).map((i) => i.fullName)).toEqual([
        'Ana',
        'Zeca',
      ])
    })
  })

  describe('computeProductionCollaboratorInitials', () => {
    it('usa primeira e última palavra', () => {
      expect(computeProductionCollaboratorInitials('Maria Silva')).toBe('MS')
    })
  })
})

const baseItem = (
  overrides: Partial<ProductionWorkQueueItem> = {},
): ProductionWorkQueueItem => ({
  workPlanItemId: 'wpi-1',
  conveyorId: 'cv-1',
  conveyorTitle: 'OS 001',
  activityNodeId: 'act-1',
  activityTitle: 'Trocar pastilhas',
  taskTitle: 'Freios',
  sectorTitle: 'Mecânica',
  plannedDate: '2026-05-28',
  plannedMinutes: 90,
  realizedMinutes: 0,
  pendingMinutes: 90,
  activityOperationalStatus: null,
  isActivityCompleted: false,
  isOverdue: false,
  isOutOfSequence: false,
  isNextRecommended: false,
  previousOpenCount: 0,
  previousOpenActivities: [],
  hasPreviousOpenActivitiesFromOtherCollaborators: false,
  previousOpenActivitiesFromOtherCollaborators: [],
  previousOpenActivitiesWarningMessage: null,
  group: 'today',
  canTrackTime: true,
  canCompleteStep: true,
  requiresOutOfSequenceJustification: false,
  ...overrides,
})

describe('formatProductionMinutes', () => {
  it('retorna "—" para null', () => {
    expect(formatProductionMinutes(null)).toBe('—')
  })

  it('retorna "—" para 0', () => {
    expect(formatProductionMinutes(0)).toBe('—')
  })

  it('formata apenas minutos', () => {
    expect(formatProductionMinutes(30)).toBe('30min')
  })

  it('formata apenas horas', () => {
    expect(formatProductionMinutes(120)).toBe('2h')
  })

  it('formata horas e minutos', () => {
    expect(formatProductionMinutes(90)).toBe('1h 30min')
  })
})

describe('formatProductionDate', () => {
  it('converte ISO para DD/MM/YYYY', () => {
    expect(formatProductionDate('2026-05-28')).toBe('28/05/2026')
  })

  it('retorna o valor original para input inválido', () => {
    expect(formatProductionDate('invalid')).toBe('invalid')
  })
})

describe('resolveProductionOperationalStatusDisplay', () => {
  it('atividade concluída → label Concluída', () => {
    const d = resolveProductionOperationalStatusDisplay(
      baseItem({ isActivityCompleted: true }),
    )
    expect(d.label).toBe('Concluída')
  })

  it('fora da sequência → label específica', () => {
    const d = resolveProductionOperationalStatusDisplay(
      baseItem({ isOutOfSequence: true }),
    )
    expect(d.label).toBe('Fora da sequência')
  })

  it('em atraso → label Em atraso', () => {
    const d = resolveProductionOperationalStatusDisplay(
      baseItem({ isOverdue: true }),
    )
    expect(d.label).toBe('Em atraso')
  })

  it('status IN_PROGRESS → Em andamento', () => {
    const d = resolveProductionOperationalStatusDisplay(
      baseItem({ activityOperationalStatus: 'IN_PROGRESS' }),
    )
    expect(d.label).toBe('Em andamento')
  })

  it('sem status → A iniciar', () => {
    const d = resolveProductionOperationalStatusDisplay(baseItem())
    expect(d.label).toBe('A iniciar')
  })
})

describe('productionTrackTimeDisabledTitle', () => {
  it('fora de sequência com canTrackTime → vazio (apontável com justificativa)', () => {
    expect(
      productionTrackTimeDisabledTitle(
        baseItem({
          canTrackTime: true,
          requiresOutOfSequenceJustification: true,
        }),
      ),
    ).toBe('')
  })

  it('bloqueado → mensagem genérica', () => {
    expect(
      productionTrackTimeDisabledTitle(
        baseItem({ canTrackTime: false, requiresOutOfSequenceJustification: false }),
      ),
    ).toContain('indisponível')
  })
})

describe('filterProductionWorkQueue', () => {
  const items = [
    baseItem({ workPlanItemId: '1', group: 'today', isActivityCompleted: false, canTrackTime: true }),
    baseItem({ workPlanItemId: '2', group: 'completed', isActivityCompleted: true, canTrackTime: false }),
    baseItem({ workPlanItemId: '3', group: 'overdue', isActivityCompleted: false, canTrackTime: true }),
  ]

  it('filtro "all" retorna todos', () => {
    expect(filterProductionWorkQueue(items, 'all')).toHaveLength(3)
  })

  it('filtro "pending" retorna não concluídos', () => {
    const result = filterProductionWorkQueue(items, 'pending')
    expect(result).toHaveLength(2)
    expect(result.every((i) => !i.isActivityCompleted)).toBe(true)
  })

  it('filtro "completed" retorna apenas concluídos', () => {
    const result = filterProductionWorkQueue(items, 'completed')
    expect(result).toHaveLength(1)
    expect(result[0]?.workPlanItemId).toBe('2')
  })
})
