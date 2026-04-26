/**
 * Contrato formal do rascunho persistido da Nova Esteira (mock/local).
 * Serializável, versionável — sem regra de UI; o domínio continua fonte de verdade ao retomar.
 *
 * Semântica (manutenção):
 * - `draft` + recomputação em `nova-esteira-composicao` = estado de domínio (fonte de verdade ao vivo).
 * - `lastSnapshot.*` = cache derivado para listagem (statusGeralComposicao, podeMaterializar, contagem).
 *   Não revalida sozinho regras; ao abrir rascunho a UI recomputa composição a partir de `draft`.
 * - `statusJornada` = estado persistido da jornada (em edição, pronto para revisar/materializar,
 *   materializado, arquivado). Derivado no repositório com `deriveStatusJornada`, exceto travas
 *   explícitas (materializado, arquivado).
 * - `materializacaoVinculada` = vínculo lateral pós-criação (mock); não substitui o pipeline.
 * - Na UI: etapa local (`dados_iniciais` | `estrutura_montagem` | `revisao`), hints em `nova-esteira-estado-visual` (estado visual
 *   da montagem), e `success` na página = navegação local pós-materialização.
 */

import type { NovaEsteiraComposicaoStatus } from './nova-esteira-bloco-contrato'
import type { NovaEsteiraDraft } from './nova-esteira-composicao'
import type { NovaEsteiraCenarioId } from './nova-esteira-cenarios-mock'

/** Versão do envelope em storage (incrementar em migrações de store). */
export const NOVA_ESTEIRA_DRAFT_STORAGE_VERSION = 1 as const

/** Versão do contrato de cada registro persistido. */
export const NOVA_ESTEIRA_RASCUNHO_PERSISTIDO_VERSION = 1 as const

/** Versão do snapshot resumido embutido. */
export const NOVA_ESTEIRA_SNAPSHOT_RESUMIDO_VERSION = 1 as const

export type NovaEsteiraJornadaOrigemPersistida =
  | 'blank'
  | 'cenario'
  | 'duplicacao'
  | 'rascunho'

export type NovaEsteiraEtapaPersistida =
  | 'dados_iniciais'
  | 'estrutura_montagem'
  | 'revisao'

export type NovaEsteiraStatusJornada =
  | 'em_edicao'
  | 'pronto_revisao'
  | 'pronto_materializar'
  | 'materializado'
  | 'arquivado'

export type NovaEsteiraDestinoPretendido = 'backlog' | 'exec'

/**
 * Vínculo lateral com o resultado da materialização mock — não substitui o pipeline.
 */
export type NovaEsteiraMaterializacaoVinculada = {
  /** ID da linha no runtime (BacklogRow.id). */
  esteiraRowId: string
  /** Semente determinística da materialização (auditoria). */
  materializacaoSeed: string
  destino: NovaEsteiraDestinoPretendido
  concluidoEm: string
  /** ID do rascunho que originou a materialização (redundância útil em export). */
  rascunhoOrigemId: string
}

/**
 * Snapshot resumido para listagem e leitura rápida — nunca substitui recomputar composição no domínio.
 */
export type NovaEsteiraRascunhoSnapshotResumido = {
  version: typeof NOVA_ESTEIRA_SNAPSHOT_RESUMIDO_VERSION
  statusGeralComposicao: NovaEsteiraComposicaoStatus
  podeMaterializar: boolean
  motivoPrincipalBloqueio?: string
  contagem: {
    validos: number
    pendentes: number
    invalidos: number
  }
  destinoPretendido?: NovaEsteiraDestinoPretendido
  resumoComposicaoCurto: string
  nomeExibicao: string
  estruturaOrigemLabel?: string
}

export type NovaEsteiraRascunhoPersistido = {
  id: string
  version: typeof NOVA_ESTEIRA_RASCUNHO_PERSISTIDO_VERSION
  origem: NovaEsteiraJornadaOrigemPersistida
  cenarioId?: NovaEsteiraCenarioId
  nomeRascunho: string
  descricao?: string
  destinoPretendido?: NovaEsteiraDestinoPretendido
  draft: NovaEsteiraDraft
  etapaAtual: NovaEsteiraEtapaPersistida
  tags?: string[]
  statusJornada: NovaEsteiraStatusJornada
  lastSnapshot: NovaEsteiraRascunhoSnapshotResumido
  createdAt: string
  updatedAt: string
  lastOpenedAt?: string
  materializacaoVinculada?: NovaEsteiraMaterializacaoVinculada
  metadata?: Record<string, unknown>
}

export type NovaEsteiraDraftStoreEnvelopeV1 = {
  schemaVersion: typeof NOVA_ESTEIRA_DRAFT_STORAGE_VERSION
  drafts: NovaEsteiraRascunhoPersistido[]
}
