import { describe, expect, it } from 'vitest'
import {
  buildActivityTicketInputFromProgressContext,
  isProgressActivityPrintable,
  type ActivityTicketProgressContext,
} from './activityTicketProgressSource'
import { buildActivityTicketPrintModel } from './activityTicketPrintModel'

function context(
  partial?: Partial<ActivityTicketProgressContext>,
): ActivityTicketProgressContext {
  return {
    conveyorId: 'conv-1',
    conveyorTitle: 'Gol 1994',
    conveyorCode: 'OS-100',
    taskTitle: 'Bancos',
    sectorTitle: 'Costura',
    activity: {
      activityId: 'step-1',
      activityName: 'Costurar lateral',
      status: 'IN_PROGRESS',
      collaboratorName: 'Marcio',
      plannedMinutes: 60,
      realizedMinutes: 20,
      remainingMinutes: 40,
      exceededMinutes: 0,
      progressPercent: 33,
      timeEfficiency: {
        status: 'MAIS_RAPIDO',
        isPartial: true,
        includedInCalculation: true,
        efficiencyPct: 300,
        deviationMinutes: -40,
        deviationPct: -66.7,
      },
      timeEntries: [],
    },
    ...partial,
  }
}

describe('activityTicketProgressSource', () => {
  it('identifica atividade imprimível', () => {
    expect(isProgressActivityPrintable(context())).toBe(true)
    expect(
      isProgressActivityPrintable(
        context({ activity: { ...context().activity, activityId: '' } }),
      ),
    ).toBe(false)
  })

  it('monta input para ticket avulso a partir da evolução', () => {
    const input = buildActivityTicketInputFromProgressContext(context())
    const model = buildActivityTicketPrintModel(input)

    expect(model.conveyorTitle).toBe('Gol 1994')
    expect(model.conveyorCode).toBe('OS-100')
    expect(model.activityTitle).toBe('Costurar lateral')
    expect(model.taskTitle).toBe('Bancos')
    expect(model.sectorTitle).toBe('Costura')
    expect(model.responsibleName).toBe('Marcio')
    expect(model.realizedMinutes).toBe(20)
  })
})
