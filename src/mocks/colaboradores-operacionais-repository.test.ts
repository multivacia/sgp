import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetColaboradoresRepositoryForTests,
  atualizarColaboradorOperacional,
  criarColaboradorOperacional,
  definirAtivoColaboradorOperacional,
  getColaboradorById,
  listColaboradoresOperacionais,
  listColaboradoresOperacionaisAtivosParaSelecao,
} from './colaboradores-operacionais-repository'
import {
  getNovaEsteiraResponsaveisNomes,
  getNovaEsteiraResponsaveisNomesComLegado,
} from './nova-esteira-form-options'
import {
  getColaboradorByNomeDropdown,
  listColaboradoresOperacionais as listViaFacade,
  resolveColaboradorNaLinhaAtividade,
} from './colaboradores-operacionais'

const META_ROLE_COLAB = { roleId: '22222222-2222-2222-2222-222222222222' }

describe('colaboradores-operacionais-repository', () => {
  beforeEach(() => {
    __resetColaboradoresRepositoryForTests()
  })

  it('CRUD preserva colaboradorId na criação e leitura', () => {
    const r = criarColaboradorOperacional({
      nome: 'Teste Alfa',
      codigo: 'TAL',
      setorPrincipal: 'X',
      metadata: META_ROLE_COLAB,
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.colaborador.colaboradorId).toMatch(/^colab-n-/)
    expect(getColaboradorById(r.colaborador.colaboradorId)?.nome).toBe('Teste Alfa')
  })

  it('rejeita nome vazio e nome duplicado normalizado', () => {
    expect(criarColaboradorOperacional({ nome: '  ' }).ok).toBe(false)
    const a = criarColaboradorOperacional({
      nome: 'Único Um',
      setorPrincipal: 'S',
      metadata: META_ROLE_COLAB,
    })
    expect(a.ok).toBe(true)
    const b = criarColaboradorOperacional({
      nome: 'único  um',
      setorPrincipal: 'S',
      metadata: META_ROLE_COLAB,
    })
    expect(b.ok).toBe(false)
    if (b.ok) return
    expect(b.erros.some((e) => e.codigo === 'nome_duplicado')).toBe(true)
  })

  it('rejeita código duplicado', () => {
    criarColaboradorOperacional({
      nome: 'A',
      codigo: 'ZZ',
      setorPrincipal: 'S',
      metadata: META_ROLE_COLAB,
    })
    const r = criarColaboradorOperacional({
      nome: 'B',
      codigo: 'ZZ',
      setorPrincipal: 'S',
      metadata: META_ROLE_COLAB,
    })
    expect(r.ok).toBe(false)
  })

  it('edição não altera colaboradorId', () => {
    const c = criarColaboradorOperacional({
      nome: 'Para Editar',
      setorPrincipal: 'S',
      metadata: META_ROLE_COLAB,
    })
    expect(c.ok).toBe(true)
    if (!c.ok) return
    const id = c.colaborador.colaboradorId
    const u = atualizarColaboradorOperacional(id, { nome: 'Editado Nome' })
    expect(u.ok).toBe(true)
    if (!u.ok) return
    expect(u.colaborador.colaboradorId).toBe(id)
  })

  it('ativação/inativação mantém registro na fonte', () => {
    const c = getColaboradorById('colab-carlos')
    expect(c?.ativo).toBe(true)
    definirAtivoColaboradorOperacional('colab-carlos', false)
    expect(getColaboradorById('colab-carlos')?.ativo).toBe(false)
    expect(listColaboradoresOperacionais().some((x) => x.colaboradorId === 'colab-carlos')).toBe(
      true,
    )
  })

  it('lista de seleção nova esteira só inclui ativos', () => {
    definirAtivoColaboradorOperacional('colab-carlos', false)
    const nomes = getNovaEsteiraResponsaveisNomes()
    expect(nomes.includes('Carlos')).toBe(false)
    const comLegado = getNovaEsteiraResponsaveisNomesComLegado('Carlos')
    expect(comLegado.includes('Carlos')).toBe(true)
  })

  it('facade lista espelha o repositório (fonte única)', () => {
    expect(listViaFacade().length).toBe(listColaboradoresOperacionais().length)
    criarColaboradorOperacional({
      nome: 'Espelho',
      setorPrincipal: 'S',
      metadata: META_ROLE_COLAB,
    })
    expect(listViaFacade().length).toBe(listColaboradoresOperacionais().length)
  })

  it('inativo continua resolvível na linha com selo', () => {
    definirAtivoColaboradorOperacional('colab-carlos', false)
    const r = resolveColaboradorNaLinhaAtividade({
      colaboradorId: 'colab-carlos',
      responsavel: 'ignorado',
    })
    expect(r.colaboradorId).toBe('colab-carlos')
    expect(r.colaboradorRegistroInativo).toBe(true)
    expect(getColaboradorByNomeDropdown('Carlos')).toBeUndefined()
  })

  it('ativos para seleção exclui inativos', () => {
    definirAtivoColaboradorOperacional('colab-ana', false)
    const ativos = listColaboradoresOperacionaisAtivosParaSelecao()
    expect(ativos.some((c) => c.colaboradorId === 'colab-ana')).toBe(false)
  })
})
