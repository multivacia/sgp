/**
 * Fábrica de rascunhos — origens: em branco, cenário mock, duplicação (via repositório).
 */

import {
  getCenarioNovaEsteiraMock,
  NOVA_ESTEIRA_EXEMPLO_VAZIA,
  type NovaEsteiraCenarioId,
} from './nova-esteira-cenarios-mock'
import {
  buildSnapshotResumido,
  deriveStatusJornada,
} from './nova-esteira-persistencia-snapshot'
import { novoIdRascunhoNovaEsteira, timestampIso } from './nova-esteira-persistencia-ids'
import {
  NOVA_ESTEIRA_RASCUNHO_PERSISTIDO_VERSION,
  type NovaEsteiraRascunhoPersistido,
} from './nova-esteira-persistido'
import {
  duplicarRascunhoNovaEsteira,
  salvarRascunhoNovaEsteira,
} from './nova-esteira-drafts-repository'
import type {
  NovaEsteiraEtapaPersistida,
  NovaEsteiraJornadaOrigemPersistida,
} from './nova-esteira-persistido'
import type {
  LinhaBlocoOperacionalDraft,
  NovaEsteiraEstruturaOrigem,
  TarefaBlocoDraft,
} from './nova-esteira-domain'
import type { NovaEsteiraDraft } from './nova-esteira-composicao'
import type { NovaEsteiraOpcaoDraft } from './nova-esteira-jornada-draft'
import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'
import { flattenOpcoesParaTarefasDrafts } from './nova-esteira-opcoes-flatten'

/** Entrada espelhada do estado React da Nova Esteira — usada para draft canónico e persistência. */
export type NovaEsteiraDraftEstadoTela = {
  dados: NovaEsteiraDadosIniciais
  estruturaOrigem: NovaEsteiraEstruturaOrigem | null
  linhasManual: LinhaBlocoOperacionalDraft[]
  tarefas: TarefaBlocoDraft[]
  baseEsteiraAplicadaId: string | null
  opcoes?: NovaEsteiraOpcaoDraft[]
}

/**
 * Draft canónico: Mesa, composição, bloqueios e persistência devem usar o mesmo resultado.
 * Com hierarquia opção → área → etapa, força MONTAGEM_UNIFICADA e tarefas achatadas,
 * alinhado ao que a Mesa edita (evita BASE_ESTEIRA + `tarefas` vazias ignorando `opcoes`).
 */
export function buildNovaEsteiraDraftCanonico(
  input: NovaEsteiraDraftEstadoTela,
): NovaEsteiraDraft {
  const opcoes = input.opcoes ?? []
  if (opcoes.length > 0) {
    return {
      dados: input.dados,
      estruturaOrigem: 'MONTAGEM_UNIFICADA',
      linhasManual: [],
      tarefas: flattenOpcoesParaTarefasDrafts(opcoes),
      baseEsteiraAplicadaId: input.baseEsteiraAplicadaId,
      opcoes,
    }
  }

  const o = input.estruturaOrigem
  if (o === 'MANUAL') {
    return {
      dados: input.dados,
      estruturaOrigem: o,
      linhasManual: input.linhasManual,
      tarefas: [],
      baseEsteiraAplicadaId: input.baseEsteiraAplicadaId,
      opcoes,
    }
  }
  if (o === 'MONTAGEM_UNIFICADA') {
    return {
      dados: input.dados,
      estruturaOrigem: o,
      linhasManual: input.linhasManual,
      tarefas: input.tarefas,
      baseEsteiraAplicadaId: input.baseEsteiraAplicadaId,
      opcoes,
    }
  }
  if (o === 'BASE_ESTEIRA' || o === 'BASE_TAREFA') {
    return {
      dados: input.dados,
      estruturaOrigem: o,
      linhasManual: [],
      tarefas: input.tarefas,
      baseEsteiraAplicadaId: input.baseEsteiraAplicadaId,
      opcoes,
    }
  }
  return {
    dados: input.dados,
    estruturaOrigem: null,
    linhasManual: [],
    tarefas: [],
    baseEsteiraAplicadaId: input.baseEsteiraAplicadaId,
    opcoes,
  }
}

/** Persistência e autosave — delega ao draft canónico. */
export function draftAtualMontagemParaPersistencia(
  input: NovaEsteiraDraftEstadoTela,
): NovaEsteiraDraft {
  return buildNovaEsteiraDraftCanonico(input)
}

function baseRegistro(
  draft: NovaEsteiraDraft,
  origem: NovaEsteiraRascunhoPersistido['origem'],
  extra: Partial<NovaEsteiraRascunhoPersistido>,
): NovaEsteiraRascunhoPersistido {
  const now = timestampIso()
  const nomeRascunho = draft.dados.nome.trim() || 'Sem título'
  const lastSnapshot = buildSnapshotResumido(draft, {
    destinoPretendido: extra.destinoPretendido,
  })
  const statusJornada = deriveStatusJornada(draft, 'dados_iniciais', false, false)
  return {
    id: novoIdRascunhoNovaEsteira(),
    version: NOVA_ESTEIRA_RASCUNHO_PERSISTIDO_VERSION,
    origem,
    nomeRascunho,
    draft,
    etapaAtual: 'dados_iniciais',
    statusJornada,
    lastSnapshot,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    ...extra,
  }
}

export function criarDraftNovaEsteiraEmBranco(): NovaEsteiraRascunhoPersistido {
  const draft = structuredClone(NOVA_ESTEIRA_EXEMPLO_VAZIA) as NovaEsteiraDraft
  return baseRegistro(draft, 'blank', {})
}

export function criarDraftNovaEsteiraAPartirDeCenario(
  cenarioId: NovaEsteiraCenarioId,
): NovaEsteiraRascunhoPersistido | null {
  const c = getCenarioNovaEsteiraMock(cenarioId)
  if (!c) return null
  const draft = structuredClone(c.draft) as NovaEsteiraDraft
  return baseRegistro(draft, 'cenario', {
    cenarioId: c.id,
    destinoPretendido: c.destinoSugerido,
    descricao: c.label,
    tags: c.tags ? [...c.tags] : undefined,
    metadata: { cenarioVersion: c.version },
  })
}

export function duplicarDraftNovaEsteiraPersistido(
  id: string,
): NovaEsteiraRascunhoPersistido | null {
  return duplicarRascunhoNovaEsteira(id)
}

/** Persiste um registro novo retornado pela fábrica. */
export function persistirNovoRascunhoFabrica(
  registro: NovaEsteiraRascunhoPersistido,
): boolean {
  return salvarRascunhoNovaEsteira(registro)
}

/** Primeiro salvamento ou snapshot explícito — origem documentada (ex.: em branco). */
export function criarRegistroRascunhoSalvo(
  draft: NovaEsteiraDraft,
  etapa: NovaEsteiraEtapaPersistida,
  origem: NovaEsteiraJornadaOrigemPersistida,
  opts?: {
    cenarioId?: NovaEsteiraRascunhoPersistido['cenarioId']
    destinoPretendido?: NovaEsteiraRascunhoPersistido['destinoPretendido']
    tags?: string[]
    metadata?: Record<string, unknown>
  },
): NovaEsteiraRascunhoPersistido {
  const now = timestampIso()
  const lastSnapshot = buildSnapshotResumido(draft, {
    destinoPretendido: opts?.destinoPretendido,
  })
  const statusJornada = deriveStatusJornada(draft, etapa, false, false)
  return {
    id: novoIdRascunhoNovaEsteira(),
    version: NOVA_ESTEIRA_RASCUNHO_PERSISTIDO_VERSION,
    origem,
    cenarioId: opts?.cenarioId,
    nomeRascunho: draft.dados.nome.trim() || 'Sem título',
    draft,
    etapaAtual: etapa,
    statusJornada,
    lastSnapshot,
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    destinoPretendido: opts?.destinoPretendido,
    tags: opts?.tags,
    metadata: opts?.metadata,
  }
}

/** Cria a partir de cenário mock e persiste imediatamente. */
export function iniciarRascunhoDeCenario(
  cenarioId: NovaEsteiraCenarioId,
): NovaEsteiraRascunhoPersistido | null {
  const c = criarDraftNovaEsteiraAPartirDeCenario(cenarioId)
  if (!c) return null
  if (!salvarRascunhoNovaEsteira(c)) return null
  return c
}
