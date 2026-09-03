import { describe, expect, it, vi } from 'vitest'
import {
  isOperationalPlanningExportActionDisabled,
  resolveOperationalPlanningExportWeekStart,
  runOperationalPlanningExportFlow,
} from './operationalPlanningExportFlow'

describe('resolveOperationalPlanningExportWeekStart', () => {
  it('usa weekPayload.week.weekStartDate quando presente — filtros visuais não alteram o resultado', () => {
    expect(resolveOperationalPlanningExportWeekStart('2026-09-07', '2026-01-01')).toBe(
      '2026-09-07',
    )
  })

  it('usa weekMonday como fallback quando não há weekPayload ainda', () => {
    expect(resolveOperationalPlanningExportWeekStart(null, '2026-01-05')).toBe('2026-01-05')
    expect(resolveOperationalPlanningExportWeekStart(undefined, '2026-01-05')).toBe('2026-01-05')
  })
})

describe('isOperationalPlanningExportActionDisabled', () => {
  it('desabilitado quando não há itens planejados (draftItems vazio)', () => {
    expect(
      isOperationalPlanningExportActionDisabled({ draftItemsCount: 0, busy: false }),
    ).toBe(true)
  })

  it('desabilitado quando busy=true mesmo com itens planejados', () => {
    expect(
      isOperationalPlanningExportActionDisabled({ draftItemsCount: 3, busy: true }),
    ).toBe(true)
  })

  it('habilitado quando há itens e não está busy', () => {
    expect(
      isOperationalPlanningExportActionDisabled({ draftItemsCount: 3, busy: false }),
    ).toBe(false)
  })
})

describe('runOperationalPlanningExportFlow', () => {
  it('sem alterações locais (dirty=false): exporta direto com o weekStartDate informado, sem chamar persistDraft', async () => {
    const persistDraft = vi.fn()
    const exportWeek = vi.fn().mockResolvedValue(undefined)

    const result = await runOperationalPlanningExportFlow({
      dirty: false,
      weekStartDate: '2026-09-07',
      persistDraft,
      exportWeek,
    })

    expect(persistDraft).not.toHaveBeenCalled()
    expect(exportWeek).toHaveBeenCalledWith('2026-09-07')
    expect(result).toEqual({ exported: true, usedWeekStart: '2026-09-07' })
  })

  it('com alterações locais (dirty=true): salva ANTES de exportar e usa o weekStartDate salvo', async () => {
    const calls: string[] = []
    const persistDraft = vi.fn().mockImplementation(async () => {
      calls.push('persistDraft')
      return { week: { weekStartDate: '2026-09-14' } }
    })
    const exportWeek = vi.fn().mockImplementation(async () => {
      calls.push('exportWeek')
    })

    const result = await runOperationalPlanningExportFlow({
      dirty: true,
      weekStartDate: '2026-09-07',
      persistDraft,
      exportWeek,
    })

    expect(calls).toEqual(['persistDraft', 'exportWeek'])
    expect(exportWeek).toHaveBeenCalledWith('2026-09-14')
    expect(result).toEqual({ exported: true, usedWeekStart: '2026-09-14' })
  })

  it('falha ao salvar (persistDraft retorna null) impede a exportação — nenhum download é iniciado', async () => {
    const persistDraft = vi.fn().mockResolvedValue(null)
    const exportWeek = vi.fn()

    const result = await runOperationalPlanningExportFlow({
      dirty: true,
      weekStartDate: '2026-09-07',
      persistDraft,
      exportWeek,
    })

    expect(persistDraft).toHaveBeenCalledTimes(1)
    expect(exportWeek).not.toHaveBeenCalled()
    expect(result).toEqual({ exported: false, usedWeekStart: null })
  })

  it('propaga erro lançado por exportWeek (ex.: falha de rede) sem engolir a exceção', async () => {
    const persistDraft = vi.fn()
    const exportWeek = vi.fn().mockRejectedValue(new Error('network down'))

    await expect(
      runOperationalPlanningExportFlow({
        dirty: false,
        weekStartDate: '2026-09-07',
        persistDraft,
        exportWeek,
      }),
    ).rejects.toThrow('network down')
  })
})
