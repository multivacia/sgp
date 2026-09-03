import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest'
import {
  applyConveyorPlanValuesToWeekItem,
  exportOperationalPlanningWeekToExcel,
  getFactoryIntakeItems,
} from './operationalPlanningApiService'
import * as client from '../../lib/api/client'

describe('applyConveyorPlanValuesToWeekItem', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls apply-conveyor-plan-values endpoint', async () => {
    const spy = vi.spyOn(client, 'requestJson').mockResolvedValue({ hasPlan: false, week: {} })
    await applyConveyorPlanValuesToWeekItem('item-uuid-1')
    expect(spy).toHaveBeenCalledWith(
      'POST',
      '/api/v1/operational-planning/week-items/item-uuid-1/apply-conveyor-plan-values',
      { body: {} },
    )
  })
})

describe('getFactoryIntakeItems', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls factory-intake endpoint without query when weekStart omitted', async () => {
    const spy = vi.spyOn(client, 'requestJson').mockResolvedValue({ items: [] })
    await getFactoryIntakeItems()
    expect(spy).toHaveBeenCalledWith('GET', '/api/v1/operational-planning/factory-intake')
  })

  it('passes weekStart query param when provided', async () => {
    const spy = vi.spyOn(client, 'requestJson').mockResolvedValue({ items: [] })
    await getFactoryIntakeItems('2026-05-12')
    expect(spy).toHaveBeenCalledWith(
      'GET',
      '/api/v1/operational-planning/factory-intake?weekStart=2026-05-12',
    )
  })
})

describe('exportOperationalPlanningWeekToExcel', () => {
  const fetchMock = vi.fn()
  const createObjectURL = vi.fn(() => 'blob:mock')
  const revokeObjectURL = vi.fn()
  const click = vi.fn()
  const appendChild = vi.fn((node: unknown) => node)
  const createElement = vi.fn((tagName: string) => {
    if (tagName === 'a') {
      return {
        href: '',
        download: '',
        rel: '',
        click,
        remove: vi.fn(),
      }
    }
    return {}
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    vi.stubGlobal('document', { createElement, body: { appendChild } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('chama GET /operational-planning/week/export.xlsx com weekStart codificado e credentials: include', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () =>
        new Blob(['xlsx'], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'content-disposition'
            ? 'attachment; filename="planejamento-semanal-2026-09-07-a-2026-09-11-rascunho.xlsx"'
            : null,
      },
    })

    await exportOperationalPlanningWeekToExcel('2026-09-07')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/operational-planning/week/export.xlsx?weekStart=2026-09-07',
      { method: 'GET', credentials: 'include' },
    )
  })

  it('codifica caracteres especiais em weekStart na URL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['xlsx']),
      headers: { get: () => null },
    })

    await exportOperationalPlanningWeekToExcel('2026-09-07 x')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/operational-planning/week/export.xlsx?weekStart=2026-09-07%20x',
      { method: 'GET', credentials: 'include' },
    )
  })

  it('usa o nome de arquivo do Content-Disposition para o download', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['xlsx']),
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'content-disposition'
            ? 'attachment; filename="planejamento-semanal-2026-09-07-a-2026-09-11-publicado.xlsx"'
            : null,
      },
    })

    await exportOperationalPlanningWeekToExcel('2026-09-07')

    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    const anchor = createElement.mock.results.find(
      (result) => result.value && 'download' in (result.value as object),
    )?.value as { download?: string }
    expect(anchor?.download).toBe(
      'planejamento-semanal-2026-09-07-a-2026-09-11-publicado.xlsx',
    )
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('usa o ramo filename*=UTF-8\'\' (decodificado) quando o header combinado real (filename + filename*) é enviado pelo backend', async () => {
    // Header real enviado pelo controller: `attachment; filename="X"; filename*=UTF-8''X`
    // (ambos os ramos presentes ao mesmo tempo — ver operational-planning.controller.ts).
    // O valor do ramo `filename=` é propositalmente diferente/desatualizado aqui para provar
    // que o parser prioriza `filename*=UTF-8''` (decodificado), não o primeiro ramo que casar.
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['xlsx']),
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'content-disposition'
            ? 'attachment; filename="fallback-desatualizado.xlsx"; filename*=UTF-8\'\'planejamento-semanal-2026-09-07-a-2026-09-11-publicado.xlsx'
            : null,
      },
    })

    await exportOperationalPlanningWeekToExcel('2026-09-07')

    const anchor = createElement.mock.results.find(
      (result) => result.value && 'download' in (result.value as object),
    )?.value as { download?: string }
    expect(anchor?.download).toBe(
      'planejamento-semanal-2026-09-07-a-2026-09-11-publicado.xlsx',
    )
  })

  it('usa nome de arquivo fallback quando o header está ausente', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['xlsx']),
      headers: { get: () => null },
    })

    await exportOperationalPlanningWeekToExcel('2026-09-07')

    const anchor = createElement.mock.results.find(
      (result) => result.value && 'download' in (result.value as object),
    )?.value as { download?: string }
    expect(anchor?.download).toBe('planejamento-semanal-2026-09-07.xlsx')
  })

  it('usa nome de arquivo fallback quando o header está malformado', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['xlsx']),
      headers: { get: () => 'not-a-valid-content-disposition-header' },
    })

    await exportOperationalPlanningWeekToExcel('2026-09-07')

    const anchor = createElement.mock.results.find(
      (result) => result.value && 'download' in (result.value as object),
    )?.value as { download?: string }
    expect(anchor?.download).toBe('planejamento-semanal-2026-09-07.xlsx')
  })

  it('lança ApiError em falha de rede', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(exportOperationalPlanningWeekToExcel('2026-09-07')).rejects.toMatchObject({
      status: 503,
    })
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('extrai a mensagem de erro do corpo quando a resposta HTTP não é OK', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () =>
        JSON.stringify({
          error: { code: 'NOT_FOUND', message: 'Nenhum plano encontrado para esta semana.' },
        }),
    })

    await expect(exportOperationalPlanningWeekToExcel('2026-09-07')).rejects.toMatchObject({
      status: 404,
      message: 'Nenhum plano encontrado para esta semana.',
    })
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('usa mensagem amigável quando o corpo de erro não é JSON válido', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'not json',
    })

    await expect(exportOperationalPlanningWeekToExcel('2026-09-07')).rejects.toMatchObject({
      status: 500,
    })
  })
})
