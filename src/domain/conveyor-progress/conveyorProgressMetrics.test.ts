import { describe, expect, it } from 'vitest'
import {
  computeConveyorProgressMetrics,
  computeTimeConsumptionPct,
  consolidateWeightedOperationalProgress,
  resolveActivityOperationalProgressPct,
} from './conveyorProgressMetrics'

describe('conveyorProgressMetrics', () => {
  it('calcula faltante e consumo temporal', () => {
    expect(computeConveyorProgressMetrics(90, 60).remainingMinutes).toBe(30)
  })

  it('calcula excedente sem confundir com evolução operacional', () => {
    expect(computeConveyorProgressMetrics(60, 80).exceededMinutes).toBe(20)
    expect(computeConveyorProgressMetrics(60, 80).remainingMinutes).toBe(0)
  })

  it('expõe consumo temporal separado da evolução', () => {
    expect(computeConveyorProgressMetrics(200, 50).timeConsumptionPct).toBe(25)
    expect(computeTimeConsumptionPct(205, 185)).toBe(90.2)
  })

  it('resolve evolução operacional independente do tempo consumido', () => {
    expect(
      resolveActivityOperationalProgressPct({
        isCompleted: false,
        latestSessionCompletionPct: 50,
      }),
    ).toBe(50)
  })

  it('pondera evolução operacional agregada por tempo previsto', () => {
    expect(
      consolidateWeightedOperationalProgress([
        { operationalProgressPct: 50, plannedMinutes: 205 },
        { operationalProgressPct: 100, plannedMinutes: 95 },
      ]).operationalProgressPct,
    ).toBe(66)
  })
})
