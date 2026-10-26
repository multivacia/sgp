import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseBacklogTab } from '../backlog/backlogUrlParams'
import { openBacklogInNewTab } from './dashboardNavigation'

function captureOpen(fn: () => void): URLSearchParams {
  const open = vi.fn()
  vi.stubGlobal('window', { open, location: { origin: 'http://sgp.local' } })
  fn()
  expect(open).toHaveBeenCalledTimes(1)
  const url = new URL(String(open.mock.calls[0]![0]))
  expect(url.pathname).toBe('/app/backlog')
  return url.searchParams
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('openBacklogInNewTab — destino no Painel operacional', () => {
  it('Finalizadas com período personalizado abre aba=todas com completedFrom/completedTo, sem days', () => {
    const sp = captureOpen(() =>
      openBacklogInNewTab('finalizadas', {
        completedPeriod: { startDate: '2026-10-01', endDate: '2026-10-20' },
      }),
    )
    expect(sp.get('situacao')).toBe('finalizadas')
    expect(sp.get('completedFrom')).toBe('2026-10-01')
    expect(sp.get('completedTo')).toBe('2026-10-20')
    expect(sp.has('days')).toBe(false)
    expect(sp.get('aba')).toBe('todas')
    expect(parseBacklogTab(sp)).toBe('todas')
  })

  it('Finalizadas — últimos N dias abre a lista combinada (aba=todas) mantendo situacao e days', () => {
    for (const n of [7, 30, 90]) {
      const sp = captureOpen(() => openBacklogInNewTab('finalizadas', { days: n }))
      expect(sp.get('situacao')).toBe('finalizadas')
      expect(sp.get('days')).toBe(String(n))
      expect(sp.get('aba')).toBe('todas')
      expect(parseBacklogTab(sp)).toBe('todas')
    }
  })

  it('Finalizadas e Canceladas sem período também abrem a lista combinada', () => {
    const fin = captureOpen(() => openBacklogInNewTab('finalizadas'))
    expect(fin.get('aba')).toBe('todas')
    expect(fin.has('days')).toBe(false)
    const canc = captureOpen(() => openBacklogInNewTab('canceladas'))
    expect(canc.get('aba')).toBe('todas')
    expect(canc.get('situacao')).toBe('canceladas')
  })

  it('demais links continuam abrindo a aba Operacional', () => {
    const ativas = captureOpen(() => openBacklogInNewTab('ativas'))
    expect(ativas.get('scope')).toBe('ativas')
    expect(ativas.has('aba')).toBe(false)
    expect(parseBacklogTab(ativas)).toBe('operacional')

    const atraso = captureOpen(() => openBacklogInNewTab('em_atraso'))
    expect(atraso.has('aba')).toBe(false)
    expect(parseBacklogTab(atraso)).toBe('operacional')

    const open = vi.fn()
    vi.stubGlobal('window', { open, location: { origin: 'http://sgp.local' } })
    openBacklogInNewTab()
    expect(String(open.mock.calls[0]![0])).toBe('http://sgp.local/app/backlog')
  })
})
