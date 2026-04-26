/**
 * Cenários mockados da Nova Esteira — identidade estável e shape reutilizável para
 * testes, preview, demo e futura persistência / versionamento (Prompt 7).
 */

import type { NovaEsteiraDraft } from './nova-esteira-composicao'
import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'

/** Versão do shape exportado (incrementar ao mudar campos obrigatórios do cenário). */
export const NOVA_ESTEIRA_CENARIO_VERSION = 1 as const

export type NovaEsteiraCenarioId =
  | 'vazia'
  | 'incompleta-sem-blocos'
  | 'minima-valida'
  | 'manual-valida'
  | 'dependencia-pendente'
  | 'invalida-bancos-incompativeis'
  | 'invalida-piso-incompativeis'
  | 'robusta-valida'
  | 'quase-pronta-pendencia-critica'
  | 'backlog-ready'
  | 'exec-ready'

export type NovaEsteiraCenarioMock = {
  id: NovaEsteiraCenarioId
  version: typeof NOVA_ESTEIRA_CENARIO_VERSION
  label: string
  descricao: string
  draft: NovaEsteiraDraft
  /** Destino sugerido na materialização mock (documentação / ARGOS futuro). */
  destinoSugerido?: 'backlog' | 'exec'
  tags?: string[]
}

export function dadosNovaEsteiraMockPadrao(
  over?: Partial<NovaEsteiraDadosIniciais>,
): NovaEsteiraDadosIniciais {
  return {
    nome: 'OS Exemplo · Tapeçaria',
    cliente: 'Cliente mock',
    veiculo: 'Gol',
    modeloVersao: '1.0',
    placa: 'ABC1D23',
    observacoes: '',
    responsavel: 'Equipe A',
    prazoEstimado: '10',
    prioridade: 'media',
    ...over,
  }
}

/** Nada preenchido — composição vazia. */
export const NOVA_ESTEIRA_EXEMPLO_VAZIA: NovaEsteiraDraft = {
  dados: { ...dadosNovaEsteiraMockPadrao(), nome: '' },
  estruturaOrigem: null,
  linhasManual: [],
  tarefas: [],
  baseEsteiraAplicadaId: null,
}

/** Origem escolhida mas sem blocos — incompleta. */
export const NOVA_ESTEIRA_EXEMPLO_INCOMPLETA: NovaEsteiraDraft = {
  dados: dadosNovaEsteiraMockPadrao(),
  estruturaOrigem: 'MANUAL',
  linhasManual: [],
  tarefas: [],
  baseEsteiraAplicadaId: null,
}

/** Montagem mínima válida (apenas bloco obrigatório configurado). */
export const NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL: NovaEsteiraDraft = {
  dados: dadosNovaEsteiraMockPadrao(),
  estruturaOrigem: 'MANUAL',
  linhasManual: [
    {
      instanceId: 'ex-val-1',
      catalogoId: 'bo-limpeza',
      modo: 'BASICO',
    },
  ],
  tarefas: [],
  baseEsteiraAplicadaId: null,
}

/** Manual com mais de um bloco — válida e mais próxima da operação. */
export const NOVA_ESTEIRA_EXEMPLO_MANUAL_VALIDA_RICA: NovaEsteiraDraft = {
  dados: dadosNovaEsteiraMockPadrao({ nome: 'OS Tapeçaria · Bancos e estrutura' }),
  estruturaOrigem: 'MANUAL',
  linhasManual: [
    { instanceId: 'ex-man-1', catalogoId: 'bo-limpeza', modo: 'BASICO' },
    { instanceId: 'ex-man-2', catalogoId: 'bo-desmontagem', modo: 'BASICO' },
    {
      instanceId: 'ex-man-3',
      catalogoId: 'bo-bancos-diant',
      subopcaoId: 'ambos',
      modo: 'BASICO',
    },
  ],
  tarefas: [],
  baseEsteiraAplicadaId: null,
}

/** Dois blocos incompatíveis (bancos) — inválida. */
export const NOVA_ESTEIRA_EXEMPLO_INVALIDA_CONFLITO: NovaEsteiraDraft = {
  dados: dadosNovaEsteiraMockPadrao(),
  estruturaOrigem: 'MANUAL',
  linhasManual: [
    {
      instanceId: 'ex-inc-1',
      catalogoId: 'bo-bancos-diant',
      subopcaoId: 'ambos',
      modo: 'BASICO',
    },
    {
      instanceId: 'ex-inc-2',
      catalogoId: 'bo-bancos-tras',
      subopcaoId: 'ambos',
      modo: 'BASICO',
    },
  ],
  tarefas: [],
  baseEsteiraAplicadaId: null,
}

/** Carpete e piso vinílico — inválida por incompatibilidade de setor. */
export const NOVA_ESTEIRA_EXEMPLO_INVALIDA_PISO: NovaEsteiraDraft = {
  dados: dadosNovaEsteiraMockPadrao({ nome: 'OS Piso — conflito' }),
  estruturaOrigem: 'MANUAL',
  linhasManual: [
    { instanceId: 'ex-piso-1', catalogoId: 'bo-limpeza', modo: 'BASICO' },
    { instanceId: 'ex-piso-2', catalogoId: 'bo-carpete', modo: 'BASICO' },
    { instanceId: 'ex-piso-3', catalogoId: 'bo-piso-vinil', modo: 'BASICO' },
  ],
  tarefas: [],
  baseEsteiraAplicadaId: null,
}

/** Pré-requisito não atendido na ordem — bloqueada. */
export const NOVA_ESTEIRA_EXEMPLO_BLOQUEADA_PREREQ: NovaEsteiraDraft = {
  dados: dadosNovaEsteiraMockPadrao(),
  estruturaOrigem: 'MANUAL',
  linhasManual: [
    {
      instanceId: 'ex-blq-1',
      catalogoId: 'bo-montagem-final',
      modo: 'BASICO',
    },
  ],
  tarefas: [],
  baseEsteiraAplicadaId: null,
}

/** Só setor sem limpeza — obrigatório crítico faltando. */
export const NOVA_ESTEIRA_EXEMPLO_QUASE_CRITICA: NovaEsteiraDraft = {
  dados: dadosNovaEsteiraMockPadrao({ nome: 'OS Quase — falta base obrigatória' }),
  estruturaOrigem: 'MANUAL',
  linhasManual: [
    {
      instanceId: 'ex-q-1',
      catalogoId: 'bo-carpete',
      modo: 'BASICO',
    },
  ],
  tarefas: [],
  baseEsteiraAplicadaId: null,
}

/** Montagem longa válida — vários setores, apoio e controles. */
export const NOVA_ESTEIRA_EXEMPLO_ROBUSTA_VALIDA: NovaEsteiraDraft = {
  dados: dadosNovaEsteiraMockPadrao({ nome: 'OS Completa · Interna premium' }),
  estruturaOrigem: 'MANUAL',
  linhasManual: [
    { instanceId: 'scn-rob-1', catalogoId: 'bo-limpeza', modo: 'BASICO' },
    { instanceId: 'scn-rob-2', catalogoId: 'bo-registro-entrada', modo: 'BASICO' },
    { instanceId: 'scn-rob-3', catalogoId: 'bo-desmontagem', modo: 'BASICO' },
    {
      instanceId: 'scn-rob-4',
      catalogoId: 'bo-bancos-diant',
      subopcaoId: 'ambos',
      modo: 'BASICO',
    },
    { instanceId: 'scn-rob-5', catalogoId: 'bo-carpete', modo: 'BASICO' },
    { instanceId: 'scn-rob-6', catalogoId: 'bo-retrovisores', subopcaoId: 'par', modo: 'BASICO' },
    { instanceId: 'scn-rob-7', catalogoId: 'bo-montagem-final', modo: 'BASICO' },
    { instanceId: 'scn-rob-8', catalogoId: 'bo-revisao-final', modo: 'BASICO' },
    { instanceId: 'scn-rob-9', catalogoId: 'bo-checkpoint-entrega', modo: 'BASICO' },
  ],
  tarefas: [],
  baseEsteiraAplicadaId: null,
}

const CENARIOS: NovaEsteiraCenarioMock[] = [
  {
    id: 'vazia',
    version: NOVA_ESTEIRA_CENARIO_VERSION,
    label: 'Rascunho vazio',
    descricao: 'Sem nome e sem estrutura — estado inicial.',
    draft: NOVA_ESTEIRA_EXEMPLO_VAZIA,
    tags: ['inicial'],
  },
  {
    id: 'incompleta-sem-blocos',
    version: NOVA_ESTEIRA_CENARIO_VERSION,
    label: 'Origem manual sem blocos',
    descricao: 'Falta incluir blocos no pedido.',
    draft: NOVA_ESTEIRA_EXEMPLO_INCOMPLETA,
    tags: ['incompleta'],
  },
  {
    id: 'minima-valida',
    version: NOVA_ESTEIRA_CENARIO_VERSION,
    label: 'Montagem mínima válida',
    descricao: 'Apenas limpeza inicial — materializa, com sugestões leves.',
    draft: NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL,
    destinoSugerido: 'backlog',
    tags: ['valida', 'minima'],
  },
  {
    id: 'manual-valida',
    version: NOVA_ESTEIRA_CENARIO_VERSION,
    label: 'Montagem manual válida',
    descricao: 'Limpeza, desmontagem e bancos — fluxo típico.',
    draft: NOVA_ESTEIRA_EXEMPLO_MANUAL_VALIDA_RICA,
    destinoSugerido: 'exec',
    tags: ['valida', 'manual'],
  },
  {
    id: 'dependencia-pendente',
    version: NOVA_ESTEIRA_CENARIO_VERSION,
    label: 'Dependência de ordem',
    descricao: 'Montagem final antes da desmontagem — bloqueada.',
    draft: NOVA_ESTEIRA_EXEMPLO_BLOQUEADA_PREREQ,
    tags: ['bloqueada', 'ordem'],
  },
  {
    id: 'invalida-bancos-incompativeis',
    version: NOVA_ESTEIRA_CENARIO_VERSION,
    label: 'Inválida — bancos incompatíveis',
    descricao: 'Dianteiro e traseiro simultâneos — regra de catálogo.',
    draft: NOVA_ESTEIRA_EXEMPLO_INVALIDA_CONFLITO,
    tags: ['invalida', 'incompatibilidade'],
  },
  {
    id: 'invalida-piso-incompativeis',
    version: NOVA_ESTEIRA_CENARIO_VERSION,
    label: 'Inválida — piso exclusivo',
    descricao: 'Carpete e vinílico no mesmo assoalho.',
    draft: NOVA_ESTEIRA_EXEMPLO_INVALIDA_PISO,
    tags: ['invalida', 'incompatibilidade'],
  },
  {
    id: 'robusta-valida',
    version: NOVA_ESTEIRA_CENARIO_VERSION,
    label: 'Montagem robusta válida',
    descricao: 'Cadeia completa com apoio e controles — leitura rica na revisão.',
    draft: NOVA_ESTEIRA_EXEMPLO_ROBUSTA_VALIDA,
    destinoSugerido: 'exec',
    tags: ['valida', 'robusta', 'demo'],
  },
  {
    id: 'quase-pronta-pendencia-critica',
    version: NOVA_ESTEIRA_CENARIO_VERSION,
    label: 'Quase pronta — pendência crítica',
    descricao: 'Bloco obrigatório (limpeza) ausente.',
    draft: NOVA_ESTEIRA_EXEMPLO_QUASE_CRITICA,
    tags: ['obrigatorio', 'critico'],
  },
  {
    id: 'backlog-ready',
    version: NOVA_ESTEIRA_CENARIO_VERSION,
    label: 'Pronta para backlog',
    descricao: 'Mesma composição robusta — destino sugerido backlog.',
    draft: NOVA_ESTEIRA_EXEMPLO_ROBUSTA_VALIDA,
    destinoSugerido: 'backlog',
    tags: ['valida', 'backlog'],
  },
  {
    id: 'exec-ready',
    version: NOVA_ESTEIRA_CENARIO_VERSION,
    label: 'Pronta para execução',
    descricao: 'Mesma composição robusta — destino sugerido execução.',
    draft: NOVA_ESTEIRA_EXEMPLO_ROBUSTA_VALIDA,
    destinoSugerido: 'exec',
    tags: ['valida', 'exec'],
  },
]

export function listCenariosNovaEsteiraMock(): NovaEsteiraCenarioMock[] {
  return CENARIOS
}

export function getCenarioNovaEsteiraMock(
  id: NovaEsteiraCenarioId,
): NovaEsteiraCenarioMock | undefined {
  return CENARIOS.find((c) => c.id === id)
}
