import { describe, expect, it } from 'vitest'
import {
  MAX_JORNADA_COLABORADORES,
  parseColaboradorIdsParam,
} from './jornadaColaboradorScope'

describe('parseColaboradorIdsParam', () => {
  it('lê a lista de colaboradores e remove duplicados preservando a ordem', () => {
    expect(parseColaboradorIdsParam('b, a ,b', null)).toEqual(['b', 'a'])
  })

  it('cai no parâmetro legado colaboradorId quando a lista está ausente ou vazia', () => {
    expect(parseColaboradorIdsParam(null, 'a')).toEqual(['a'])
    expect(parseColaboradorIdsParam('  ', 'a')).toEqual(['a'])
  })

  it('seleção vazia → nenhum colaborador', () => {
    expect(parseColaboradorIdsParam(null, null)).toEqual([])
    expect(parseColaboradorIdsParam(',, ,', null)).toEqual([])
  })

  it('limita ao teto de colaboradores da jornada consolidada', () => {
    const ids = Array.from({ length: MAX_JORNADA_COLABORADORES + 5 }, (_, i) => `c${i}`)
    expect(parseColaboradorIdsParam(ids.join(','), null)).toHaveLength(
      MAX_JORNADA_COLABORADORES,
    )
  })
})
