import { describe, expect, it } from 'vitest'
import { buildOperationalJourneyExportPath } from './operationalJourneyApiService'

describe('buildOperationalJourneyExportPath', () => {
  it('envia colaboradores selecionados e os mesmos filtros da tela, sem limit', () => {
    const path = buildOperationalJourneyExportPath(['a', 'b'], {
      periodPreset: 'custom',
      from: '2026-09-01T03:00:00.000Z',
      to: '2026-09-08T02:59:59.999Z',
      conveyorId: 'conv-1',
      limit: 20,
    })
    const [base, qs] = path.split('?')
    expect(base).toBe('/api/v1/collaborators/operational-journey/export.xlsx')
    const p = new URLSearchParams(qs)
    expect(p.get('collaboratorIds')).toBe('a,b')
    expect(p.get('periodPreset')).toBe('custom')
    expect(p.get('from')).toBe('2026-09-01T03:00:00.000Z')
    expect(p.get('conveyorId')).toBe('conv-1')
    expect(p.has('limit')).toBe(false)
  })
})
