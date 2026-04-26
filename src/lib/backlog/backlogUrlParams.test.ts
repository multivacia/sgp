import { describe, expect, it } from 'vitest'
import {
  backlogHasScopeAtivas,
  listConveyorsQueryFromBacklogUrl,
  normalizeBacklogSearchParams,
  parseBacklogDaysWindow,
  parseBacklogSituationFilter,
} from './backlogUrlParams'

function params(qs: string) {
  return new URLSearchParams(qs)
}

describe('parseBacklogDaysWindow', () => {
  it('usa days em detrimento de completedWithinDays quando ambos existem', () => {
    expect(parseBacklogDaysWindow(params('days=30&completedWithinDays=7'))).toBe(30)
    expect(parseBacklogDaysWindow(params('days=14&completedWithinDays=90'))).toBe(14)
  })

  it('aceita só completedWithinDays quando days está ausente', () => {
    expect(parseBacklogDaysWindow(params('completedWithinDays=21'))).toBe(21)
  })

  it('retorna 0 para valor fora do intervalo 1–365', () => {
    expect(parseBacklogDaysWindow(params('days=0'))).toBe(0)
    expect(parseBacklogDaysWindow(params('days=400'))).toBe(0)
    expect(parseBacklogDaysWindow(params('days=abc'))).toBe(0)
  })
})

describe('backlogHasScopeAtivas', () => {
  it('reconhece scope=ativas', () => {
    expect(backlogHasScopeAtivas(params('scope=ativas'))).toBe(true)
  })

  it('reconhece situacao=ativas legado', () => {
    expect(backlogHasScopeAtivas(params('situacao=ativas'))).toBe(true)
  })

  it('não confunde outras situações', () => {
    expect(backlogHasScopeAtivas(params('situacao=concluidas'))).toBe(false)
  })
})

describe('normalizeBacklogSearchParams', () => {
  it('com scope=ativas remove situacao conflitante', () => {
    const n = normalizeBacklogSearchParams(
      params('scope=ativas&situacao=concluidas'),
    )
    expect(n).not.toBeNull()
    expect(n!.get('scope')).toBe('ativas')
    expect(n!.has('situacao')).toBe(false)
  })

  it('com scope=ativas remove days e completedWithinDays (janela só faz sentido com concluídas)', () => {
    const n = normalizeBacklogSearchParams(
      params('scope=ativas&days=30&completedWithinDays=7'),
    )
    expect(n).not.toBeNull()
    expect(n!.get('scope')).toBe('ativas')
    expect(n!.has('days')).toBe(false)
    expect(n!.has('completedWithinDays')).toBe(false)
  })

  it('com situacao diferente de concluidas remove days quando há janela', () => {
    const n = normalizeBacklogSearchParams(params('situacao=no_backlog&days=30'))
    expect(n).not.toBeNull()
    expect(n!.get('situacao')).toBe('no_backlog')
    expect(n!.has('days')).toBe(false)
  })

  it('não remove days com situacao=concluidas e janela válida', () => {
    expect(normalizeBacklogSearchParams(params('situacao=concluidas&days=30'))).toBeNull()
  })

  it('remove completedWithinDays quando days também existe (days vence)', () => {
    const n = normalizeBacklogSearchParams(
      params('situacao=concluidas&days=30&completedWithinDays=60'),
    )
    expect(n).not.toBeNull()
    expect(n!.get('days')).toBe('30')
    expect(n!.has('completedWithinDays')).toBe(false)
  })

  it('retorna null quando já está normalizado', () => {
    expect(normalizeBacklogSearchParams(params('situacao=concluidas&days=7'))).toBeNull()
    expect(normalizeBacklogSearchParams(params(''))).toBeNull()
  })

  it('remove q vazio e priority inválido', () => {
    const a = normalizeBacklogSearchParams(params('q=&priority=foo'))
    expect(a).not.toBeNull()
    expect(a!.has('q')).toBe(false)
    expect(a!.has('priority')).toBe(false)
  })

  it('remove responsible só com espaços', () => {
    const a = normalizeBacklogSearchParams(params('responsible=++'))
    expect(a).not.toBeNull()
    expect(a!.has('responsible')).toBe(false)
  })
})

describe('listConveyorsQueryFromBacklogUrl', () => {
  it('mapeia q, priority, responsible e operationalStatus só quando aplicável', () => {
    const sp = params('q=acme&priority=alta&responsible=João&situacao=no_backlog')
    const q = listConveyorsQueryFromBacklogUrl(sp, parseBacklogSituationFilter(sp))
    expect(q).toEqual({
      q: 'acme',
      priority: 'alta',
      responsible: 'João',
      operationalStatus: 'NO_BACKLOG',
    })
  })

  it('não envia operationalStatus para em_atraso', () => {
    const sp = params('situacao=em_atraso')
    const situation = parseBacklogSituationFilter(sp)
    expect(listConveyorsQueryFromBacklogUrl(sp, situation)).toEqual({})
  })
})
