/**
 * Contrato oficial do bloco operacional na Nova Esteira (domínio mock, determinístico).
 * ARGOS: extensibilidade apenas em `NovaEsteiraFutureExtensions` no resultado da composição.
 */

/** @deprecated Prefer NovaEsteiraBlocoTipo */
export type BlocoOperacionalTipoLegado =
  | 'CATALOGO_OPERACIONAL'
  | 'REFERENCIA_BASE_TAREFA'
  | 'TEMPLATE_BASE_ESTEIRA'
  | 'RASCUNHO_INTERNO'

export type NovaEsteiraBlocoTipo =
  | 'base'
  | 'estrutura'
  | 'setor'
  | 'fluxo'
  | 'apoio'
  | 'controle'

export type NovaEsteiraBlocoStatus =
  | 'nao_iniciado'
  | 'incompleto'
  | 'configurado'
  | 'invalido'
  | 'bloqueado'

export type NovaEsteiraComposicaoStatus =
  | 'vazia'
  | 'incompleta'
  | 'valida'
  | 'invalida'
  | 'bloqueada'

/** Extensão futura ARGOS — neutra no protótipo; não preencher com heurística. */
export type NovaEsteiraFutureExtensions = {
  suggestions?: []
  recommendedNextStep?: null
  warnings?: []
  operationalScore?: null
  argosHints?: []
}

export function futureExtensionsNeutros(): NovaEsteiraFutureExtensions {
  return {
    suggestions: undefined,
    recommendedNextStep: null,
    warnings: undefined,
    operationalScore: null,
    argosHints: undefined,
  }
}

/**
 * Bloco operacional na montagem (instância avaliada ou template de catálogo).
 */
export type NovaEsteiraBlocoOperacional = {
  id: string
  code?: string
  nome: string
  tipo: NovaEsteiraBlocoTipo
  descricao?: string
  ordem: number
  ativo: boolean
  configurado: boolean
  obrigatorio?: boolean
  preRequisitos?: string[]
  incompatibilidades?: string[]
  dependenciasOpcionais?: string[]
  pendencias?: string[]
  impactos?: string[]
  resumoOperacional?: string
  status: NovaEsteiraBlocoStatus
  metadata?: Record<string, unknown>
}

export type NovaEsteiraMontagem = {
  baseSelecionada: string | null
  blocosDisponiveis: NovaEsteiraBlocoOperacional[]
  blocosAtivos: NovaEsteiraBlocoOperacional[]
  /** Configurados e válidos para a operação. */
  blocosValidos: NovaEsteiraBlocoOperacional[]
  blocosIncompletos: NovaEsteiraBlocoOperacional[]
  /** Bloqueados por pré-requisito de ordem/catálogo. */
  blocosDependentes: NovaEsteiraBlocoOperacional[]
  blocosInvalidos: NovaEsteiraBlocoOperacional[]
  /** União legível: incompletos + dependentes + não iniciados na montagem. */
  blocosPendentes: NovaEsteiraBlocoOperacional[]
  statusGeral: NovaEsteiraComposicaoStatus
  /** Inclui avisos informativos e operacionais. */
  pendenciasGerais: string[]
  /** Obrigatórios faltando, inválidos estruturais, bloqueios duros. */
  pendenciasCriticas: string[]
  /** Pré-requisitos de catálogo não satisfeitos (texto explícito). */
  dependenciasNaoResolvidas: string[]
  /** Conflitos de incompatibilidade ou dados inválidos. */
  inconsistencias: string[]
  /** Ordem sugerida para exibir por que não materializa. */
  motivosQueImpedemMaterializacao: string[]
  resumoOperacional: string
  /** Sugestões não bloqueantes quando a montagem já é válida (composição rica). */
  recomendacoesLeves?: string[]
  podeMaterializar: boolean
  futureExtensions: NovaEsteiraFutureExtensions
}

export type NovaEsteiraComposicaoResultado = {
  montagem: NovaEsteiraMontagem
  /** Blocos da montagem atual, ordenados por `ordem` (determinístico). */
  blocosOrdenados: NovaEsteiraBlocoOperacional[]
  mensagens: string[]
}

/** Contexto explícito para reavaliar um bloco (pré-requisitos na ordem). */
export type NovaEsteiraBlocoContextoAvaliacao = {
  catalogIdsAtivosNaOrdem: string[]
  catalogIdsAtivosConfigurados: Set<string>
}
