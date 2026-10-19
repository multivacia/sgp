import { describe, expect, it } from 'vitest'
import {
  backlogHasScopeAtivas,
  listConveyorsQueryFromBacklogUrl,
  normalizeBacklogSearchParams,
  parseBacklogDaysWindow,
  parseBacklogSituationFilter,
  parseBacklogTab,
  preserveBacklogTab,
  withBacklogTab,
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

describe('aba do Painel operacional (aba=)', () => {
  it('padrão é Operacional; aba=historico e aba=todas são lidas da URL', () => {
    expect(parseBacklogTab(params(''))).toBe('operacional')
    expect(parseBacklogTab(params('aba=operacional'))).toBe('operacional')
    expect(parseBacklogTab(params('aba=historico'))).toBe('historico')
    expect(parseBacklogTab(params('aba=todas'))).toBe('todas')
    expect(parseBacklogTab(params('aba=xyz'))).toBe('operacional')
  })

  it('link do dashboard situacao=finalizadas&days=N (sem aba) abre a lista combinada', () => {
    for (const n of [7, 30, 90]) {
      expect(parseBacklogTab(params(`situacao=finalizadas&days=${n}`))).toBe('todas')
    }
    // Sem days, sem aba: Operacional (o dashboard grava aba=todas explicitamente).
    expect(parseBacklogTab(params('situacao=finalizadas'))).toBe('operacional')
    expect(parseBacklogTab(params('situacao=canceladas'))).toBe('operacional')
    expect(parseBacklogTab(params('scope=ativas'))).toBe('operacional')
    // aba explícita prevalece.
    expect(parseBacklogTab(params('situacao=finalizadas&days=30&aba=historico'))).toBe(
      'historico',
    )
  })

  it('withBacklogTab grava a aba sem quebrar scope, situacao, days e q; remove page', () => {
    const h = withBacklogTab(params('scope=ativas&q=abc&page=3'), 'historico')
    expect(h.get('aba')).toBe('historico')
    expect(h.get('scope')).toBe('ativas')
    expect(h.get('q')).toBe('abc')
    expect(h.has('page')).toBe(false)

    const f = withBacklogTab(params('situacao=finalizadas&days=30'), 'historico')
    expect(f.get('aba')).toBe('historico')
    expect(f.get('situacao')).toBe('finalizadas')
    expect(f.get('days')).toBe('30')
  })

  it('voltar ao Operacional remove aba; com URL de dashboard grava aba=operacional', () => {
    const a = withBacklogTab(params('aba=historico&situacao=canceladas'), 'operacional')
    expect(a.has('aba')).toBe(false)
    expect(a.get('situacao')).toBe('canceladas')
    expect(parseBacklogTab(a)).toBe('operacional')

    const b = withBacklogTab(params('aba=todas&situacao=finalizadas&days=30'), 'operacional')
    expect(b.get('aba')).toBe('operacional')
    expect(b.get('days')).toBe('30')
    expect(parseBacklogTab(b)).toBe('operacional')
  })

  it('preserveBacklogTab mantém a lista combinada quando um filtro remove days', () => {
    const current = params('situacao=finalizadas&days=30')
    const next = params('situacao=em_planejamento')
    expect(parseBacklogTab(preserveBacklogTab(current, next))).toBe('todas')

    const keepOp = preserveBacklogTab(params('aba=historico'), params('situacao=finalizadas'))
    expect(keepOp.get('aba')).toBe('historico')
  })

  it('normalize mantém aba válida e remove aba desconhecida', () => {
    expect(normalizeBacklogSearchParams(params('aba=historico&scope=ativas'))).toBeNull()
    expect(normalizeBacklogSearchParams(params('aba=todas&situacao=finalizadas&days=30'))).toBeNull()
    const n = normalizeBacklogSearchParams(params('aba=arquivadas&situacao=finalizadas'))
    expect(n).not.toBeNull()
    expect(n!.has('aba')).toBe(false)
    expect(n!.get('situacao')).toBe('finalizadas')
  })
})
