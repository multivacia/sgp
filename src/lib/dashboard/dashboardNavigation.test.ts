/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openBacklogInNewTab } from './dashboardNavigation'

describe('openBacklogInNewTab', () => {
  afterEach(() => vi.restoreAllMocks())

  it('concluídas do Dashboard levam o mesmo período (completedFrom/completedTo), sem days', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    openBacklogInNewTab('finalizadas', {
      completedPeriod: { startDate: '2026-10-01', endDate: '2026-10-20' },
    })
    const url = new URL(String(open.mock.calls[0]?.[0]))
    expect(url.pathname).toBe('/app/backlog')
    expect(url.searchParams.get('situacao')).toBe('finalizadas')
    expect(url.searchParams.get('completedFrom')).toBe('2026-10-01')
    expect(url.searchParams.get('completedTo')).toBe('2026-10-20')
    expect(url.searchParams.has('days')).toBe(false)
  })

  it('chamadas antigas com days continuam funcionando', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    openBacklogInNewTab('finalizadas', { days: 30 })
    expect(new URL(String(open.mock.calls[0]?.[0])).searchParams.get('days')).toBe('30')
  })
})
