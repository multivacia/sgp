import { describe, expect, it } from 'vitest'
import {
  backlogHasScopeAtivas,
  completedAtWithinPeriod,
  parseBacklogCompletedPeriod,
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
    expect(backlogHasScopeAtivas(params('situacao=finalizadas'))).toBe(false)
  })
})

describe('normalizeBacklogSearchParams', () => {
  it('com scope=ativas remove situacao conflitante', () => {
    const n = normalizeBacklogSearchParams(
      params('scope=ativas&situacao=finalizadas'),
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

  it('com situacao diferente de finalizadas remove days quando há janela', () => {
    const n = normalizeBacklogSearchParams(params('situacao=em_elaboracao&days=30'))
    expect(n).not.toBeNull()
    expect(n!.get('situacao')).toBe('em_elaboracao')
    expect(n!.has('days')).toBe(false)
  })

  it('não remove days com situacao=finalizadas e janela válida', () => {
    expect(normalizeBacklogSearchParams(params('situacao=finalizadas&days=30'))).toBeNull()
  })

  it('remove completedWithinDays quando days também existe (days vence)', () => {
    const n = normalizeBacklogSearchParams(
      params('situacao=finalizadas&days=30&completedWithinDays=60'),
    )
    expect(n).not.toBeNull()
    expect(n!.get('days')).toBe('30')
    expect(n!.has('completedWithinDays')).toBe(false)
  })

  it('retorna null quando já está normalizado', () => {
    expect(normalizeBacklogSearchParams(params('situacao=finalizadas&days=7'))).toBeNull()
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
    const sp = params('q=acme&priority=alta&responsible=João&situacao=em_elaboracao')
    const q = listConveyorsQueryFromBacklogUrl(sp, parseBacklogSituationFilter(sp))
    expect(q).toEqual({
      q: 'acme',
      priority: 'alta',
      responsible: 'João',
      operationalStatus: 'EM_ELABORACAO',
    })
  })

  it('não envia operationalStatus para em_atraso', () => {
    const sp = params('situacao=em_atraso')
    const situation = parseBacklogSituationFilter(sp)
    expect(listConveyorsQueryFromBacklogUrl(sp, situation)).toEqual({})
  })
})

describe('período de conclusão vindo do Dashboard (completedFrom/completedTo)', () => {
  it('parse: só aceita par válido e ordenado', () => {
    expect(
      parseBacklogCompletedPeriod(new URLSearchParams('completedFrom=2026-10-01&completedTo=2026-10-20')),
    ).toEqual({ startDate: '2026-10-01', endDate: '2026-10-20' })
    expect(parseBacklogCompletedPeriod(new URLSearchParams('completedFrom=2026-10-01'))).toBeNull()
    expect(
      parseBacklogCompletedPeriod(new URLSearchParams('completedFrom=2026-10-21&completedTo=2026-10-20')),
    ).toBeNull()
    expect(
      parseBacklogCompletedPeriod(new URLSearchParams('completedFrom=2026-02-30&completedTo=2026-03-01')),
    ).toBeNull()
  })

  it('normalização: período prevalece sobre days; removido fora de finalizadas ou inválido', () => {
    const withDays = normalizeBacklogSearchParams(
      new URLSearchParams('situacao=finalizadas&completedFrom=2026-10-01&completedTo=2026-10-20&days=30'),
    )
    expect(withDays?.get('days')).toBeNull()
    expect(withDays?.get('completedFrom')).toBe('2026-10-01')

    const otherSituation = normalizeBacklogSearchParams(
      new URLSearchParams('situacao=em_atraso&completedFrom=2026-10-01&completedTo=2026-10-20'),
    )
    expect(otherSituation?.has('completedFrom')).toBe(false)

    const invalid = normalizeBacklogSearchParams(
      new URLSearchParams('situacao=finalizadas&completedFrom=2026-10-21&completedTo=2026-10-20'),
    )
    expect(invalid?.has('completedTo')).toBe(false)

    expect(
      normalizeBacklogSearchParams(
        new URLSearchParams('situacao=finalizadas&completedFrom=2026-10-01&completedTo=2026-10-20'),
      ),
    ).toBeNull()
  })

  it('completedAtWithinPeriod usa o dia civil de São Paulo, inclusivo', () => {
    const p = { startDate: '2026-10-01', endDate: '2026-10-20' }
    expect(completedAtWithinPeriod('2026-10-01T03:00:00.000Z', p)).toBe(true) // 00:00 SP de 01/10
    expect(completedAtWithinPeriod('2026-10-01T02:59:59.999Z', p)).toBe(false) // 30/09 em SP
    expect(completedAtWithinPeriod('2026-10-21T02:59:59.999Z', p)).toBe(true) // 23:59:59 SP de 20/10
    expect(completedAtWithinPeriod('2026-10-21T03:00:00.000Z', p)).toBe(false) // 21/10 em SP
    expect(completedAtWithinPeriod(null, p)).toBe(false)
  })
})
