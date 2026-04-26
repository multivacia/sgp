import { beforeEach, describe, expect, it } from 'vitest'
import {
  getColaboradorById,
  getColaboradorByNomeDropdown,
  listColaboradoresOperacionais,
  resolveColaboradorNaLinhaAtividade,
  ROTULO_EQUIPE_CHAVE,
  __resetColaboradoresRepositoryForTests,
} from './colaboradores-operacionais'

describe('colaboradores-operacionais', () => {
  beforeEach(() => {
    __resetColaboradoresRepositoryForTests()
  })
  it('lista oficial espelha getColaboradorById para cada id', () => {
    for (const c of listColaboradoresOperacionais()) {
      expect(getColaboradorById(c.colaboradorId)?.nome).toBe(c.nome)
    }
  })

  it('resolve por id forte', () => {
    const r = resolveColaboradorNaLinhaAtividade({
      colaboradorId: 'colab-carlos',
      responsavel: 'ignorado se id válido',
    })
    expect(r.colaboradorId).toBe('colab-carlos')
    expect(r.responsavelResolvido).toBe(true)
    expect(r.chaveAgregacao).toBe('id:colab-carlos')
  })

  it('infere id por nome único na fonte', () => {
    const r = resolveColaboradorNaLinhaAtividade({
      responsavel: '  Carlos  ',
    })
    expect(r.colaboradorId).toBe('colab-carlos')
    expect(r.chaveAgregacao).toBe('id:colab-carlos')
  })

  it('fallback textual sem match na fonte', () => {
    const r = resolveColaboradorNaLinhaAtividade({
      responsavel: 'Nome Legado XYZ',
    })
    expect(r.responsavelResolvido).toBe(false)
    expect(r.gapResponsavel).toBe('nome_sem_correspondencia_na_fonte')
    expect(r.chaveAgregacao.startsWith('nome:')).toBe(true)
  })

  it('rótulo Equipe não recebe colaborador inventado', () => {
    const r = resolveColaboradorNaLinhaAtividade({ responsavel: 'Equipe' })
    expect(r.responsavelResolvido).toBe(false)
    expect(r.gapResponsavel).toBe('rotulo_operacional_equipe')
    expect(r.chaveAgregacao).toBe(ROTULO_EQUIPE_CHAVE)
    expect(r.colaboradorId).toBeUndefined()
  })

  it('getColaboradorByNomeDropdown alinha com lista oficial', () => {
    const n = listColaboradoresOperacionais()[0]!.nome
    expect(getColaboradorByNomeDropdown(n)?.nome).toBe(n)
  })

  it('findColaboradoresPorNomeNormalizado: nomes distintos na fonte', () => {
    const todos = listColaboradoresOperacionais()
    const nomes = new Set(todos.map((c) => c.nome))
    expect(nomes.size).toBe(todos.length)
  })
})
