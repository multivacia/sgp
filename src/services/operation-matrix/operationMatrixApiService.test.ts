import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../lib/api/client', () => ({
  requestJson: vi.fn(),
  requestJsonEnvelope: vi.fn(),
}))

vi.mock('../../lib/api/env', () => ({
  getApiBaseUrl: vi.fn(() => ''),
}))

import { requestJsonEnvelope } from '../../lib/api/client'
import {
  EXPORT_MATRIX_ITEM_ACTION_LABEL,
  EXPORT_MATRIX_ITEM_FAIL_MESSAGE,
  buildMatrixExportFallbackFilename,
  duplicateMatrixItem,
  duplicateMatrixNode,
  exportMatrixItemToExcel,
} from './operationMatrixApiService'

describe('duplicateMatrixItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('chama POST /api/v1/operation-matrix/items/:id/duplicate e retorna data + warnings vazio', async () => {
    vi.mocked(requestJsonEnvelope).mockResolvedValue({
      data: { id: 'new-id', name: 'Padrão (Cópia)', is_active: true },
      meta: {},
    })
    const out = await duplicateMatrixItem('abc-123')
    expect(requestJsonEnvelope).toHaveBeenCalledWith(
      'POST',
      '/api/v1/operation-matrix/items/abc-123/duplicate',
    )
    expect(out).toEqual({
      data: { id: 'new-id', name: 'Padrão (Cópia)', is_active: true },
      warnings: [],
    })
  })

  it('codifica o id na URL', async () => {
    vi.mocked(requestJsonEnvelope).mockResolvedValue({
      data: { id: 'x', name: 'n', is_active: false },
      meta: {},
    })
    await duplicateMatrixItem('a/b')
    expect(requestJsonEnvelope).toHaveBeenCalledWith(
      'POST',
      '/api/v1/operation-matrix/items/a%2Fb/duplicate',
    )
  })

  it('preserva meta.warnings vazio, com 1 item e com múltiplos itens', async () => {
    vi.mocked(requestJsonEnvelope).mockResolvedValueOnce({
      data: { id: 'i1', name: 'M', is_active: true },
      meta: { warnings: [] },
    })
    expect((await duplicateMatrixItem('i1')).warnings).toEqual([])

    const oneWarning = [
      {
        code: 'MATRIX_ACTIVITY_RESPONSIBLE_NOT_COPIED',
        sourceActivityId: 'a1',
        duplicatedActivityId: 'a1-copy',
        activityName: 'Atividade 1',
        sourceResponsibleId: 'c1',
        reason: 'TEAM_MEMBERSHIP_INACTIVE',
        message: 'Aviso 1',
      },
    ]
    vi.mocked(requestJsonEnvelope).mockResolvedValueOnce({
      data: { id: 'i2', name: 'M', is_active: true },
      meta: { warnings: oneWarning },
    })
    expect((await duplicateMatrixItem('i2')).warnings).toEqual(oneWarning)

    const manyWarnings = [
      ...oneWarning,
      {
        code: 'MATRIX_ACTIVITY_RESPONSIBLE_NOT_COPIED',
        sourceActivityId: 'a2',
        duplicatedActivityId: 'a2-copy',
        activityName: 'Atividade 2',
        sourceResponsibleId: 'c2',
        reason: 'RESPONSIBLE_INACTIVE',
        message: 'Aviso 2',
      },
    ]
    vi.mocked(requestJsonEnvelope).mockResolvedValueOnce({
      data: { id: 'i3', name: 'M', is_active: true },
      meta: { warnings: manyWarnings },
    })
    const result = await duplicateMatrixItem('i3')
    expect(result.warnings).toHaveLength(2)
    expect(result.warnings).toEqual(manyWarnings)
  })
})

describe('duplicateMatrixNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('chama POST /api/v1/operation-matrix/nodes/:id/duplicate e preserva meta.warnings', async () => {
    vi.mocked(requestJsonEnvelope).mockResolvedValue({
      data: { id: 'node-1' } as never,
      meta: {
        warnings: [
          {
            code: 'MATRIX_ACTIVITY_RESPONSIBLE_NOT_COPIED',
            sourceActivityId: 'a1',
            duplicatedActivityId: 'a1-copy',
            activityName: 'Atividade duplicada',
            sourceResponsibleId: 'c1',
            reason: 'RESPONSIBLE_NOT_IN_TEAM',
            message: 'Responsável não copiado.',
          },
        ],
      },
    })
    const out = await duplicateMatrixNode('node-src')
    expect(requestJsonEnvelope).toHaveBeenCalledWith(
      'POST',
      '/api/v1/operation-matrix/nodes/node-src/duplicate',
    )
    expect(out.warnings).toHaveLength(1)
    expect(out.warnings[0]?.activityName).toBe('Atividade duplicada')
    expect(out.data).toEqual({ id: 'node-1' })
  })

  it('não quebra quando meta.warnings está ausente (retorna array vazio)', async () => {
    vi.mocked(requestJsonEnvelope).mockResolvedValue({
      data: { id: 'node-2' } as never,
      meta: {},
    })
    const out = await duplicateMatrixNode('node-2')
    expect(out.warnings).toEqual([])
  })
})

describe('exportMatrixItemToExcel', () => {
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
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    })
    vi.stubGlobal('document', {
      createElement,
      body: { appendChild },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('expõe o rótulo da ação de exportação', () => {
    expect(EXPORT_MATRIX_ITEM_ACTION_LABEL).toBe('Exportar para Excel')
  })

  it('chama GET /api/v1/operation-matrix/items/:id/export.xlsx e dispara download', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['xlsx'], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'content-disposition'
            ? 'attachment; filename="matriz-MX-01-2026-05-13.xlsx"'
            : null,
      },
    })

    await exportMatrixItemToExcel('abc-123', { matrixName: 'Matriz Padrão' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/operation-matrix/items/abc-123/export.xlsx',
      { method: 'GET', credentials: 'include' },
    )
    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    expect(createElement).toHaveBeenCalledWith('a')
    const anchor = createElement.mock.results.find(
      (result) => result.value && 'download' in (result.value as object),
    )?.value as { download?: string }
    expect(anchor?.download).toBe('matriz-MX-01-2026-05-13.xlsx')
  })

  it('usa fallback local com nome da matriz quando Content-Disposition estiver ausente', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['xlsx']),
      headers: { get: () => null },
    })

    await exportMatrixItemToExcel('abc-123', {
      matrixName: 'Matriz Padrão Bravo',
      matrixCode: 'MX-01',
    })

    const anchor = createElement.mock.results.find(
      (result) => result.value && 'download' in (result.value as object),
    )?.value as { download?: string }
    expect(anchor?.download).toMatch(/^matriz-Matriz-Padr-o-Bravo-\d{4}-\d{2}-\d{2}\.xlsx$/)
  })

  it('buildMatrixExportFallbackFilename prioriza nome sanitizado e data', () => {
    const exportedAt = new Date('2026-05-13T12:00:00')
    expect(
      buildMatrixExportFallbackFilename(
        'Matriz Padrão Bravo',
        'MX-01',
        'abc-123',
        exportedAt,
      ),
    ).toBe('matriz-Matriz-Padr-o-Bravo-2026-05-13.xlsx')
  })

  it('codifica o id na URL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['xlsx']),
      headers: { get: () => null },
    })

    await exportMatrixItemToExcel('a/b')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/operation-matrix/items/a%2Fb/export.xlsx',
      { method: 'GET', credentials: 'include' },
    )
  })

  it('lança mensagem amigável quando a exportação falha', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
    })

    await expect(exportMatrixItemToExcel('abc')).rejects.toMatchObject({
      message: EXPORT_MATRIX_ITEM_FAIL_MESSAGE,
      status: 500,
    })
  })
})
