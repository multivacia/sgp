import { describe, expect, it } from 'vitest'
import {
  buildActivityOperationalProgress,
  formatUnitAndTotalMinutes,
  resolveActivityPlannedTotalMinutes,
} from './activityOperationalQuantity'
import { formatHumanMinutes } from '../../lib/formatters'

describe('activityOperationalQuantity (frontend)', () => {
  it('quantidade 1 — tempo total igual ao unitário', () => {
    expect(resolveActivityPlannedTotalMinutes(60, 1)).toBe(60)
  })

  it('quantidade > 1 — progresso parcial e média real', () => {
    const p = buildActivityOperationalProgress({
      plannedUnitMinutes: 15,
      plannedQuantity: 10,
      timeEntries: [
        { minutes: 50, executedQuantity: 2 },
        { minutes: 30, executedQuantity: 2 },
      ],
    })
    expect(p.plannedTotalMinutes).toBe(150)
    expect(p.executedQuantityTotal).toBe(4)
    expect(p.executedMinutesTotal).toBe(80)
    expect(p.actualMinutesPerUnit).toBe(20)
    expect(p.remainingQuantity).toBe(6)
  })

  it('executado maior que planejado — restante zero', () => {
    const p = buildActivityOperationalProgress({
      plannedUnitMinutes: 10,
      plannedQuantity: 2,
      timeEntries: [{ minutes: 30, executedQuantity: 5 }],
    })
    expect(p.remainingQuantity).toBe(0)
  })

  it('formatUnitAndTotalMinutes com formatHumanMinutes', () => {
    const s = formatUnitAndTotalMinutes(15, 10, formatHumanMinutes)
    expect(s).toContain('10 un.')
    expect(s).toContain('=')
  })
})
