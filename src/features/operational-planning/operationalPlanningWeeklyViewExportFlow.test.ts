import { describe, expect, it, vi } from 'vitest'
import {
  isOperationalPlanningWeeklyViewExportActionDisabled,
  isOperationalPlanningWeeklyViewExportButtonDisabled,
  resolveOperationalPlanningExportMutualExclusion,
  resolveOperationalPlanningWeeklyViewExportWeekStart,
  runOperationalPlanningWeeklyViewExportFlow,
} from './operationalPlanningWeeklyViewExportFlow'
import {
  isOperationalPlanningExportButtonDisabled,
  resolveOperationalPlanningExportButtonLabel,
} from './operationalPlanningExportFlow'

describe('resolveOperationalPlanningWeeklyViewExportWeekStart', () => {
  it('usa weekPayload.week.weekStartDate quando presente — filtros visuais não alteram o resultado', () => {
    expect(
      resolveOperationalPlanningWeeklyViewExportWeekStart('2026-09-07', '2026-01-01'),
    ).toBe('2026-09-07')
  })

  it('usa weekMonday como fallback quando não há weekPayload ainda', () => {
    expect(resolveOperationalPlanningWeeklyViewExportWeekStart(null, '2026-01-05')).toBe(
      '2026-01-05',
    )
    expect(resolveOperationalPlanningWeeklyViewExportWeekStart(undefined, '2026-01-05')).toBe(
      '2026-01-05',
    )
  })
})

describe('isOperationalPlanningWeeklyViewExportActionDisabled', () => {
  it('desabilitado quando não há itens planejados (draftItems vazio)', () => {
    expect(
      isOperationalPlanningWeeklyViewExportActionDisabled({ draftItemsCount: 0, busy: false }),
    ).toBe(true)
  })

  it('desabilitado quando busy=true mesmo com itens planejados', () => {
    expect(
      isOperationalPlanningWeeklyViewExportActionDisabled({ draftItemsCount: 3, busy: true }),
    ).toBe(true)
  })

  it('habilitado quando há itens e não está busy', () => {
    expect(
      isOperationalPlanningWeeklyViewExportActionDisabled({ draftItemsCount: 3, busy: false }),
    ).toBe(false)
  })
})

describe('runOperationalPlanningWeeklyViewExportFlow', () => {
  it('sem alterações locais (dirty=false): exporta direto com o weekStartDate informado, sem chamar persistDraft', async () => {
    const persistDraft = vi.fn()
    const exportWeeklyView = vi.fn().mockResolvedValue(undefined)

    const result = await runOperationalPlanningWeeklyViewExportFlow({
      dirty: false,
      weekStartDate: '2026-09-07',
      persistDraft,
      exportWeeklyView,
    })

    expect(persistDraft).not.toHaveBeenCalled()
    expect(exportWeeklyView).toHaveBeenCalledWith('2026-09-07')
    expect(result).toEqual({ exported: true, usedWeekStart: '2026-09-07' })
  })

  it('com alterações locais (dirty=true): salva ANTES de exportar e usa o weekStartDate salvo', async () => {
    const calls: string[] = []
    const persistDraft = vi.fn().mockImplementation(async () => {
      calls.push('persistDraft')
      return { week: { weekStartDate: '2026-09-14' } }
    })
    const exportWeeklyView = vi.fn().mockImplementation(async () => {
      calls.push('exportWeeklyView')
    })

    const result = await runOperationalPlanningWeeklyViewExportFlow({
      dirty: true,
      weekStartDate: '2026-09-07',
      persistDraft,
      exportWeeklyView,
    })

    expect(calls).toEqual(['persistDraft', 'exportWeeklyView'])
    expect(exportWeeklyView).toHaveBeenCalledWith('2026-09-14')
    expect(result).toEqual({ exported: true, usedWeekStart: '2026-09-14' })
  })

  it('falha ao salvar (persistDraft retorna null) impede a exportação — nenhum download é iniciado', async () => {
    const persistDraft = vi.fn().mockResolvedValue(null)
    const exportWeeklyView = vi.fn()

    const result = await runOperationalPlanningWeeklyViewExportFlow({
      dirty: true,
      weekStartDate: '2026-09-07',
      persistDraft,
      exportWeeklyView,
    })

    expect(persistDraft).toHaveBeenCalledTimes(1)
    expect(exportWeeklyView).not.toHaveBeenCalled()
    expect(result).toEqual({ exported: false, usedWeekStart: null })
  })

  it('propaga erro lançado por exportWeeklyView (ex.: falha de rede) sem engolir a exceção', async () => {
    const persistDraft = vi.fn()
    const exportWeeklyView = vi.fn().mockRejectedValue(new Error('network down'))

    await expect(
      runOperationalPlanningWeeklyViewExportFlow({
        dirty: false,
        weekStartDate: '2026-09-07',
        persistDraft,
        exportWeeklyView,
      }),
    ).rejects.toThrow('network down')
  })
})

describe('resolveOperationalPlanningExportMutualExclusion', () => {
  it('nenhuma exportação em andamento: nenhum botão bloqueado pelo outro', () => {
    expect(
      resolveOperationalPlanningExportMutualExclusion({
        isExporting: false,
        isExportingWeeklyView: false,
      }),
    ).toEqual({ originalBlockedByOther: false, weeklyViewBlockedByOther: false })
  })

  it('exportação original em andamento bloqueia o botão de visão semanal', () => {
    const mutex = resolveOperationalPlanningExportMutualExclusion({
      isExporting: true,
      isExportingWeeklyView: false,
    })
    expect(mutex.weeklyViewBlockedByOther).toBe(true)
    expect(mutex.originalBlockedByOther).toBe(false)
  })

  it('exportação de visão semanal em andamento bloqueia o botão original', () => {
    const mutex = resolveOperationalPlanningExportMutualExclusion({
      isExporting: false,
      isExportingWeeklyView: true,
    })
    expect(mutex.originalBlockedByOther).toBe(true)
    expect(mutex.weeklyViewBlockedByOther).toBe(false)
  })

  it('simula clique nos dois botões: o segundo fica bloqueado enquanto o primeiro está em andamento', () => {
    // Clique no botão original primeiro (isExporting=true) — visão semanal deve ficar bloqueada.
    const mutexAfterOriginalClick = resolveOperationalPlanningExportMutualExclusion({
      isExporting: true,
      isExportingWeeklyView: false,
    })
    const weeklyViewDisabled = isOperationalPlanningWeeklyViewExportButtonDisabled({
      disabled:
        isOperationalPlanningWeeklyViewExportActionDisabled({ draftItemsCount: 3, busy: false }) ||
        mutexAfterOriginalClick.weeklyViewBlockedByOther,
      state: 'idle',
    })
    expect(weeklyViewDisabled).toBe(true)

    // O botão original continua clicável (seu próprio estado é 'exporting', mas o teste aqui
    // valida apenas que ele não fica bloqueado por si mesmo via mutex).
    expect(mutexAfterOriginalClick.originalBlockedByOther).toBe(false)
  })
})

describe('regressão — primeira exportação (Excel do planejamento) continua com os mesmos 3 rótulos', () => {
  it('idle → "Exportar Excel", dirty → "Salvar e exportar", exporting → "Exportando..."', () => {
    expect(resolveOperationalPlanningExportButtonLabel('idle')).toBe('Exportar Excel')
    expect(resolveOperationalPlanningExportButtonLabel('dirty')).toBe('Salvar e exportar')
    expect(resolveOperationalPlanningExportButtonLabel('exporting')).toBe('Exportando...')
  })

  it('continua bloqueando clique duplo durante exporting', () => {
    expect(
      isOperationalPlanningExportButtonDisabled({ disabled: false, state: 'exporting' }),
    ).toBe(true)
  })
})
