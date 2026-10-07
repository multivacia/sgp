import { describe, expect, it } from 'vitest'
import {
  foldSearchText,
  parseConveyorActivitySearch,
  sqlFold,
} from '../shared/accentInsensitiveSearch.js'

describe('accentInsensitiveSearch', () => {
  it('foldSearchText remove acentos, caixa e espaços extras', () => {
    expect(foldSearchText('  Revestir   BANCO  Çãó ')).toBe('revestir banco cao')
  })

  it('sem & → null (pesquisa livre inalterada)', () => {
    expect(parseConveyorActivitySearch('7070 XPTO')).toBeNull()
    expect(parseConveyorActivitySearch(undefined)).toBeNull()
  })

  it('separa esteira/OS e atividade, removendo espaços ao redor do &', () => {
    expect(parseConveyorActivitySearch('7070 & XPTO')).toEqual({
      conveyorTerm: '7070',
      activityTerm: 'xpto',
    })
    expect(parseConveyorActivitySearch('  7070&Banco ')).toEqual({
      conveyorTerm: '7070',
      activityTerm: 'banco',
    })
    expect(parseConveyorActivitySearch('7070 &')).toEqual({ conveyorTerm: '7070', activityTerm: null })
    expect(parseConveyorActivitySearch('& costura')).toEqual({
      conveyorTerm: null,
      activityTerm: 'costura',
    })
  })

  it('sqlFold usa translate/lower com mapas do mesmo tamanho', () => {
    const sql = sqlFold('cv.name')
    const m = /translate\(lower\(COALESCE\(cv\.name, ''\)\), '([^']+)', '([^']+)'\)/.exec(sql)
    expect(m).not.toBeNull()
    expect([...m![1]!].length).toBe([...m![2]!].length)
  })
})
