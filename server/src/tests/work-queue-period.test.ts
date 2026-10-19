import { describe, expect, it } from 'vitest'
import {
  MAX_WORK_QUEUE_PERIOD_DAYS,
  resolveWorkQueuePeriod,
} from '../modules/my-work-queue/work-queue-period.js'

describe('resolveWorkQueuePeriod', () => {
  it('sem datas → null (modo diário)', () => {
    expect(resolveWorkQueuePeriod(undefined, undefined)).toBeNull()
    expect(resolveWorkQueuePeriod('', '  ')).toBeNull()
  })

  it('intervalo completo é mantido (inclusivo)', () => {
    expect(resolveWorkQueuePeriod('2026-10-01', '2026-10-07')).toEqual({
      from: '2026-10-01',
      to: '2026-10-07',
    })
    expect(resolveWorkQueuePeriod('2026-10-07', '2026-10-07')).toEqual({
      from: '2026-10-07',
      to: '2026-10-07',
    })
  })

  it('só início / só fim completam até a janela máxima', () => {
    expect(MAX_WORK_QUEUE_PERIOD_DAYS).toBe(92)
    expect(resolveWorkQueuePeriod('2026-01-01', null)).toEqual({
      from: '2026-01-01',
      to: '2026-04-02',
    })
    expect(resolveWorkQueuePeriod(null, '2026-04-02')).toEqual({
      from: '2026-01-01',
      to: '2026-04-02',
    })
  })

  it('início > fim e janela longa geram erro de validação', () => {
    expect(() => resolveWorkQueuePeriod('2026-10-08', '2026-10-07')).toThrow(/data inicial/)
    expect(() => resolveWorkQueuePeriod('2026-01-01', '2026-04-03')).toThrow(/no máximo 92/)
  })
})
