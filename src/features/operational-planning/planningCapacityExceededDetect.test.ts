import { describe, expect, it } from 'vitest'
import {
  detectPlanningCapacityExceededAlerts,
  formatPlanningCapacityAlertDetailLine,
  formatPlanningCapacityAlertSummary,
  formatPlanningCapacityDatePtBr,
  type PlanningCapacityDraftItemRef,
  type PlanningCapacityRowRef,
} from './planningCapacityExceededDetect'

const COLLAB = 'col-joao'
const DATE = '2026-08-25'

function item(
  partial: Partial<PlanningCapacityDraftItemRef> &
    Pick<PlanningCapacityDraftItemRef, 'plannedMinutes'>,
): PlanningCapacityDraftItemRef {
  return {
    plannedDate: DATE,
    assignedCollaboratorId: COLLAB,
    assignedCollaboratorName: 'João Silva',
    ...partial,
  }
}

function capacity(minutes: number, date = DATE): PlanningCapacityRowRef {
  return {
    collaboratorId: COLLAB,
    date,
    capacityMinutes: minutes,
  }
}

describe('detectPlanningCapacityExceededAlerts', () => {
  it('soma atividade previamente salva (360) + nova (180) = 540 e exibe excedente de 60', () => {
    const previous = [item({ plannedMinutes: 360 })]
    const next = [item({ plannedMinutes: 360 }), item({ plannedMinutes: 180 })]
    const alerts = detectPlanningCapacityExceededAlerts({
      previousItems: previous,
      nextItems: next,
      capacityRows: [capacity(480)],
    })
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({
      collaboratorId: COLLAB,
      collaboratorName: 'João Silva',
      date: DATE,
      capacityMinutes: 480,
      plannedMinutes: 540,
      excessMinutes: 60,
    })
    expect(formatPlanningCapacityAlertDetailLine(alerts[0]!)).toEqual({
      capacity: '8h',
      planned: '9h',
      excess: '1h',
    })
  })

  it('abre alerta quando inclusão leva 420+120 a 540 (excedente 60)', () => {
    const previous = [item({ plannedMinutes: 420 })]
    const next = [item({ plannedMinutes: 420 }), item({ plannedMinutes: 120 })]
    const alerts = detectPlanningCapacityExceededAlerts({
      previousItems: previous,
      nextItems: next,
      capacityRows: [capacity(480)],
    })
    expect(alerts).toHaveLength(1)
    expect(alerts[0]).toMatchObject({
      collaboratorId: COLLAB,
      collaboratorName: 'João Silva',
      date: DATE,
      capacityMinutes: 480,
      plannedMinutes: 540,
      excessMinutes: 60,
    })
  })

  it('não soma atividades de outro colaborador na mesma data', () => {
    const other = 'col-maria'
    const alerts = detectPlanningCapacityExceededAlerts({
      previousItems: [
        item({ plannedMinutes: 360 }),
        item({
          plannedMinutes: 300,
          assignedCollaboratorId: other,
          assignedCollaboratorName: 'Maria',
        }),
      ],
      nextItems: [
        item({ plannedMinutes: 360 }),
        item({ plannedMinutes: 100 }),
        item({
          plannedMinutes: 300,
          assignedCollaboratorId: other,
          assignedCollaboratorName: 'Maria',
        }),
      ],
      capacityRows: [capacity(480), { collaboratorId: other, date: DATE, capacityMinutes: 480 }],
    })
    expect(alerts).toHaveLength(0)
  })

  it('não soma atividades do mesmo colaborador em outra data', () => {
    const otherDate = '2026-08-26'
    const alerts = detectPlanningCapacityExceededAlerts({
      previousItems: [
        item({ plannedMinutes: 360 }),
        item({ plannedMinutes: 400, plannedDate: otherDate }),
      ],
      nextItems: [
        item({ plannedMinutes: 360 }),
        item({ plannedMinutes: 100 }),
        item({ plannedMinutes: 400, plannedDate: otherDate }),
      ],
      capacityRows: [capacity(480), capacity(480, otherDate)],
    })
    expect(alerts).toHaveLength(0)
  })

  it('não abre quando total fica exatamente na capacidade (420+60=480)', () => {
    const alerts = detectPlanningCapacityExceededAlerts({
      previousItems: [item({ plannedMinutes: 420 })],
      nextItems: [item({ plannedMinutes: 420 }), item({ plannedMinutes: 60 })],
      capacityRows: [capacity(480)],
    })
    expect(alerts).toEqual([])
  })

  it('respeita capacityMinutes do override (360) com planejamento 420', () => {
    const alerts = detectPlanningCapacityExceededAlerts({
      previousItems: [],
      nextItems: [item({ plannedMinutes: 420 })],
      capacityRows: [capacity(360)],
    })
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.excessMinutes).toBe(60)
    expect(alerts[0]?.capacityMinutes).toBe(360)
  })

  it('abre de novo quando célula já acima aumenta ainda mais (540→570)', () => {
    const alerts = detectPlanningCapacityExceededAlerts({
      previousItems: [item({ plannedMinutes: 540 })],
      nextItems: [item({ plannedMinutes: 540 }), item({ plannedMinutes: 30 })],
      capacityRows: [capacity(480)],
    })
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.plannedMinutes).toBe(570)
    expect(alerts[0]?.excessMinutes).toBe(90)
  })

  it('não abre quando a carga é reduzida mesmo acima do limite (570→510)', () => {
    const alerts = detectPlanningCapacityExceededAlerts({
      previousItems: [item({ plannedMinutes: 570 })],
      nextItems: [item({ plannedMinutes: 510 })],
      capacityRows: [capacity(480)],
    })
    expect(alerts).toEqual([])
  })

  it('avalia a célula de destino ao mover entre colaboradores', () => {
    const other = 'col-maria'
    const alerts = detectPlanningCapacityExceededAlerts({
      previousItems: [
        item({ plannedMinutes: 400 }),
        item({
          plannedMinutes: 100,
          assignedCollaboratorId: other,
          assignedCollaboratorName: 'Maria',
        }),
      ],
      nextItems: [
        item({ plannedMinutes: 400 }),
        item({
          plannedMinutes: 100,
          assignedCollaboratorId: COLLAB,
          assignedCollaboratorName: 'João Silva',
        }),
      ],
      capacityRows: [capacity(480), { collaboratorId: other, date: DATE, capacityMinutes: 480 }],
      collaboratorNameById: { [COLLAB]: 'João Silva', [other]: 'Maria' },
    })
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.collaboratorId).toBe(COLLAB)
    expect(alerts[0]?.plannedMinutes).toBe(500)
    expect(alerts[0]?.excessMinutes).toBe(20)
  })

  it('avalia a nova data ao mover entre dias', () => {
    const tue = '2026-08-25'
    const wed = '2026-08-26'
    const alerts = detectPlanningCapacityExceededAlerts({
      previousItems: [
        item({ plannedMinutes: 400, plannedDate: tue }),
        item({ plannedMinutes: 100, plannedDate: wed }),
      ],
      nextItems: [
        item({ plannedMinutes: 400, plannedDate: tue }),
        item({ plannedMinutes: 100, plannedDate: tue }),
      ],
      capacityRows: [capacity(480, tue), capacity(480, wed)],
    })
    expect(alerts).toHaveLength(1)
    expect(alerts[0]?.date).toBe(tue)
    expect(alerts[0]?.plannedMinutes).toBe(500)
  })

  it('não abre em reordenação com total inalterado', () => {
    const a = item({ plannedMinutes: 300 })
    const b = item({ plannedMinutes: 250 })
    const alerts = detectPlanningCapacityExceededAlerts({
      previousItems: [a, b],
      nextItems: [b, a],
      capacityRows: [capacity(480)],
    })
    expect(alerts).toEqual([])
  })

  it('não abre no carregamento inicial (previous vazio equivalente a next sobrecarregado sem aumento relativo via mesma hidratação)', () => {
    // Hidratação aplica previous=[] e next=servidor de uma vez — mas a UI não deve chamar
    // o detector nesse caminho. Se previous e next forem idênticos, também não dispara.
    const overloaded = [item({ plannedMinutes: 540 })]
    expect(
      detectPlanningCapacityExceededAlerts({
        previousItems: overloaded,
        nextItems: overloaded,
        capacityRows: [capacity(480)],
      }),
    ).toEqual([])
  })

  it('não abre sem capacityMinutes na linha (linha ausente)', () => {
    const alerts = detectPlanningCapacityExceededAlerts({
      previousItems: [],
      nextItems: [item({ plannedMinutes: 540 })],
      capacityRows: [],
    })
    expect(alerts).toEqual([])
  })

  it('não abre em remoção que reduz carga', () => {
    const alerts = detectPlanningCapacityExceededAlerts({
      previousItems: [item({ plannedMinutes: 300 }), item({ plannedMinutes: 300 })],
      nextItems: [item({ plannedMinutes: 300 })],
      capacityRows: [capacity(480)],
    })
    expect(alerts).toEqual([])
  })

  it('agrupa múltiplas células de destino em um único retorno', () => {
    const other = 'col-maria'
    const alerts = detectPlanningCapacityExceededAlerts({
      previousItems: [],
      nextItems: [
        item({ plannedMinutes: 500 }),
        item({
          plannedMinutes: 500,
          assignedCollaboratorId: other,
          assignedCollaboratorName: 'Maria',
        }),
      ],
      capacityRows: [
        capacity(480),
        { collaboratorId: other, date: DATE, capacityMinutes: 480 },
      ],
    })
    expect(alerts).toHaveLength(2)
  })
})

describe('formatPlanningCapacityDatePtBr / summary', () => {
  it('formata data ISO em pt-BR', () => {
    expect(formatPlanningCapacityDatePtBr('2026-08-25')).toBe('25/08/2026')
  })

  it('monta resumo com nome e data', () => {
    expect(
      formatPlanningCapacityAlertSummary({
        collaboratorId: COLLAB,
        collaboratorName: 'João Silva',
        date: DATE,
        capacityMinutes: 480,
        plannedMinutes: 540,
        excessMinutes: 60,
      }),
    ).toBe(
      'O planejamento de João Silva em 25/08/2026 ultrapassou a capacidade operacional disponível para o dia.',
    )
  })
})
