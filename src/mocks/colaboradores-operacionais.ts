/**
 * Fonte oficial mockada de colaboradores operacionais — única base de identidade forte
 * para a espinha dorsal (atividades, apontamentos, jornada, dashboard).
 *
 * Leituras e mutações passam pelo repositório central (`colaboradores-operacionais-repository.ts`).
 */

import type { ColaboradorOperacional } from './colaboradores-operacionais-repository'
import {
  getColaboradorById,
  listColaboradoresOperacionais,
  normalizarNomeColaboradorBusca,
} from './colaboradores-operacionais-repository'

export type {
  ColaboradorOperacional,
  ColaboradorOperacionalInput,
  ColaboradorOperacionalUpdate,
  CodigoValidacaoColaborador,
  ResultadoMutacaoColaborador,
  ValidacaoColaboradorOperacional,
} from './colaboradores-operacionais-repository'

export {
  __resetColaboradoresRepositoryForTests,
  atualizarColaboradorOperacional,
  criarColaboradorOperacional,
  definirAtivoColaboradorOperacional,
  getColaboradorById,
  getColaboradoresVersion,
  listColaboradoresOperacionais,
  listColaboradoresOperacionaisAtivosParaSelecao,
  normalizarNomeColaboradorBusca,
  subscribeColaboradores,
} from './colaboradores-operacionais-repository'

/** Referência leve para exibição e agregações. */
export type ColaboradorOperacionalRef = {
  colaboradorId: string
  nome: string
  codigoExibicao?: string
}

export type GapResponsavelColaborador =
  | 'sem_responsavel_linha'
  | 'rotulo_operacional_equipe'
  | 'nome_sem_correspondencia_na_fonte'
  | 'nome_ambiguo_na_fonte'
  | 'id_inexistente_na_fonte'

/** Resultado de resolução para modelagem central — exibição principal sempre por nome legível. */
export type ColaboradorLinhaResolvido = {
  colaboradorId?: string
  colaboradorNome: string
  colaboradorCodigo?: string
  /** Cadastro inativo na fonte, mas ainda resolvível para leitura histórica. */
  colaboradorRegistroInativo?: boolean
  responsavelResolvido: boolean
  gapResponsavel?: GapResponsavelColaborador
  /** Chave estrutural estável para jornada/dashboard (nunca exibir como label principal). */
  chaveAgregacao: string
}

/** Rótulo materializado quando não há responsável no formulário — não é colaborador da fonte. */
export const ROTULO_EQUIPE_NOME = 'Equipe'

/** Chave de agregação para o rótulo operacional “Equipe” (não confundir com colaborador real). */
export const ROTULO_EQUIPE_CHAVE = '__sgp_rotulo_equipe__'

/** Mesma chave usada em jornada/dashboard para linha sem responsável. */
export const RESPONSAVEL_LINHA_VAZIA_CHAVE = '__sgp_sem_responsavel__'

function chaveNomeFallback(normalizado: string): string {
  return `nome:${normalizado}`
}

function chaveIdForte(id: string): string {
  return `id:${id}`
}

function flagInativo(c: ColaboradorOperacional): boolean {
  return c.ativo === false
}

/**
 * Retorna colaboradores cujo nome normalizado coincide exatamente com o texto.
 * Mais de um resultado indica ambiguidade estrutural na fonte.
 * Inclui inativos — necessário para leitura histórica e resolução de linhas legadas.
 */
export function findColaboradoresPorNomeNormalizado(
  nomeLinha: string,
): ColaboradorOperacional[] {
  const n = normalizarNomeColaboradorBusca(nomeLinha)
  if (!n) return []
  return listColaboradoresOperacionais().filter(
    (c) => normalizarNomeColaboradorBusca(c.nome) === n,
  )
}

/**
 * Resolve identidade operacional a partir da linha da atividade (id opcional + texto).
 * Não inventa colaboradores: ids desconhecidos e nomes sem match ficam explícitos em `gapResponsavel`.
 */
export function resolveColaboradorNaLinhaAtividade(input: {
  colaboradorId?: string
  responsavel: string
}): ColaboradorLinhaResolvido {
  const raw = input.responsavel ?? ''
  const t = raw.trim()

  if (t.length === 0) {
    return {
      colaboradorNome: 'Sem responsável na linha',
      responsavelResolvido: false,
      gapResponsavel: 'sem_responsavel_linha',
      chaveAgregacao: RESPONSAVEL_LINHA_VAZIA_CHAVE,
    }
  }

  if (
    normalizarNomeColaboradorBusca(t) ===
    normalizarNomeColaboradorBusca(ROTULO_EQUIPE_NOME)
  ) {
    return {
      colaboradorNome: ROTULO_EQUIPE_NOME,
      responsavelResolvido: false,
      gapResponsavel: 'rotulo_operacional_equipe',
      chaveAgregacao: ROTULO_EQUIPE_CHAVE,
    }
  }

  if (input.colaboradorId?.trim()) {
    const c = getColaboradorById(input.colaboradorId)
    if (c) {
      return {
        colaboradorId: c.colaboradorId,
        colaboradorNome: c.nome,
        colaboradorCodigo: c.codigo ?? c.matricula,
        colaboradorRegistroInativo: flagInativo(c),
        responsavelResolvido: true,
        chaveAgregacao: chaveIdForte(c.colaboradorId),
      }
    }
    return {
      colaboradorNome: t,
      responsavelResolvido: false,
      gapResponsavel: 'id_inexistente_na_fonte',
      chaveAgregacao: chaveNomeFallback(normalizarNomeColaboradorBusca(t)),
    }
  }

  const matches = findColaboradoresPorNomeNormalizado(t)
  if (matches.length === 1) {
    const c = matches[0]!
    return {
      colaboradorId: c.colaboradorId,
      colaboradorNome: c.nome,
      colaboradorCodigo: c.codigo ?? c.matricula,
      colaboradorRegistroInativo: flagInativo(c),
      responsavelResolvido: true,
      chaveAgregacao: chaveIdForte(c.colaboradorId),
    }
  }
  if (matches.length === 0) {
    return {
      colaboradorNome: t,
      responsavelResolvido: false,
      gapResponsavel: 'nome_sem_correspondencia_na_fonte',
      chaveAgregacao: chaveNomeFallback(normalizarNomeColaboradorBusca(t)),
    }
  }
  return {
    colaboradorNome: t,
    responsavelResolvido: false,
    gapResponsavel: 'nome_ambiguo_na_fonte',
    chaveAgregacao: chaveNomeFallback(normalizarNomeColaboradorBusca(t)),
  }
}

/** Converte colaborador da fonte em referência leve para UI secundária. */
export function toColaboradorRef(c: ColaboradorOperacional): ColaboradorOperacionalRef {
  return {
    colaboradorId: c.colaboradorId,
    nome: c.nome,
    codigoExibicao: c.codigo ?? c.matricula,
  }
}

/**
 * Primeiro match exato por nome para dropdown de **nova** seleção — só retorna se único e ativo.
 * Linhas legadas sem id usam `resolveColaboradorNaLinhaAtividade` (inclui inativos).
 */
export function getColaboradorByNomeDropdown(
  nome: string,
): ColaboradorOperacional | undefined {
  const m = findColaboradoresPorNomeNormalizado(nome)
  if (m.length !== 1) return undefined
  const c = m[0]!
  return c.ativo ? c : undefined
}

/**
 * Lista para reatribuição no gestor: ativos + eventual responsável atual inativo (visibilidade).
 */
export function listColaboradoresParaReatribuicaoGestor(input: {
  colaboradorIdAtividade?: string
}): ColaboradorOperacional[] {
  const ativos = listColaboradoresOperacionais().filter((c) => c.ativo)
  const atual = input.colaboradorIdAtividade
    ? getColaboradorById(input.colaboradorIdAtividade)
    : undefined
  if (atual && !atual.ativo) {
    const ids = new Set(ativos.map((c) => c.colaboradorId))
    if (!ids.has(atual.colaboradorId)) {
      return [atual, ...ativos]
    }
  }
  return ativos
}
