/**
 * Snapshot de registro da Nova Esteira — contrato explícito para API futura e auditoria mock.
 * A Base não é vínculo vivo: apenas referência histórica no snapshot (alinhado a conveyor_bases).
 */

import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'
import type {
  NovaEsteiraAreaDraft,
  NovaEsteiraEtapaDraft,
  NovaEsteiraOpcaoDraft,
} from './nova-esteira-jornada-draft'
import type { NovaEsteiraEstruturaOrigem } from './nova-esteira-domain'
import { totaisOpcoes } from './nova-esteira-opcoes-helpers'
import type { BaseEsteiraCatalogItem } from './bases-esteira-catalog'

/** Origem semântica do registro (MVP: BASE | MANUAL). HYBRID reservado. */
export type NovaEsteiraRegisterOriginType = 'MANUAL' | 'BASE' | 'HYBRID'

export type NovaEsteiraRegisterReviewStatus = 'incomplete' | 'ready'

export type NovaEsteiraRegisterStep = {
  id: string
  titulo: string
  orderIndex: number
  plannedMinutes: number
  sourceOrigin: string
  required: boolean
  defaultResponsibleId: string | null
}

export type NovaEsteiraRegisterArea = {
  id: string
  titulo: string
  orderIndex: number
  sourceOrigin: string
  steps: NovaEsteiraRegisterStep[]
}

export type NovaEsteiraRegisterOption = {
  id: string
  titulo: string
  orderIndex: number
  sourceOrigin: string
  areas: NovaEsteiraRegisterArea[]
}

export type NovaEsteiraRegisterTotals = {
  totalOptions: number
  totalAreas: number
  totalSteps: number
  totalMinutes: number
}

/**
 * Snapshot imutável no momento do registro.
 * baseId/baseCode/… preenchidos com catálogo mock ou futuros UUIDs de conveyor_bases.
 */
export type NovaEsteiraRegisterSnapshot = {
  dados: NovaEsteiraDadosIniciais
  originType: NovaEsteiraRegisterOriginType
  /** Catálogo mock (ex. be-001) ou futuro UUID de conveyor_bases */
  baseId: string | null
  baseCode: string | null
  baseName: string | null
  /** Versão da base (conveyor_bases.version); null no mock de catálogo */
  baseVersion: number | null
  /** Alinhado a conveyor_bases.source_type quando houver backend */
  sourceType: 'MANUAL' | 'MATRIX' | 'CONVEYOR' | null
  sourceRefId: string | null
  options: NovaEsteiraRegisterOption[]
  totals: NovaEsteiraRegisterTotals
  reviewStatus: NovaEsteiraRegisterReviewStatus
  estruturaOrigem: NovaEsteiraEstruturaOrigem | null
  registeredAtIso: string
}

function mapEtapa(
  e: NovaEsteiraEtapaDraft,
  orderIndex: number,
): NovaEsteiraRegisterStep {
  return {
    id: e.id,
    titulo: e.titulo,
    orderIndex,
    plannedMinutes: e.tempoEstimadoMin,
    sourceOrigin: e.origem,
    required: true,
    defaultResponsibleId: null,
  }
}

function mapArea(
  a: NovaEsteiraAreaDraft,
  orderIndex: number,
): NovaEsteiraRegisterArea {
  const etapas = [...a.etapas].sort((x, y) => x.ordem - y.ordem)
  return {
    id: a.id,
    titulo: a.titulo,
    orderIndex,
    sourceOrigin: a.origem,
    steps: etapas.map((e, i) => mapEtapa(e, i + 1)),
  }
}

function mapOpcao(
  o: NovaEsteiraOpcaoDraft,
  orderIndex: number,
): NovaEsteiraRegisterOption {
  const areas = [...o.areas].sort((a, b) => a.ordem - b.ordem)
  return {
    id: o.id,
    titulo: o.titulo,
    orderIndex,
    sourceOrigin: o.origem,
    areas: areas.map((a, i) => mapArea(a, i + 1)),
  }
}

export type BuildNovaEsteiraRegisterSnapshotInput = {
  dados: NovaEsteiraDadosIniciais
  estruturaOrigem: NovaEsteiraEstruturaOrigem | null
  opcoes: NovaEsteiraOpcaoDraft[]
  baseEsteiraAplicadaId: string | null
  /** Catálogo mock quando base aplicada; null se montagem pura */
  baseCatalogItem: BaseEsteiraCatalogItem | null
  prontaParaRegistrar: boolean
}

export function buildNovaEsteiraRegisterSnapshot(
  input: BuildNovaEsteiraRegisterSnapshotInput,
): NovaEsteiraRegisterSnapshot {
  const ord = [...input.opcoes].sort((a, b) => a.ordem - b.ordem)
  const options = ord.map((o, i) => mapOpcao(o, i + 1))
  const t = totaisOpcoes(input.opcoes)

  const veioDeBase =
    input.estruturaOrigem === 'BASE_ESTEIRA' &&
    Boolean(input.baseEsteiraAplicadaId && input.baseCatalogItem)

  const originType: NovaEsteiraRegisterOriginType = veioDeBase ? 'BASE' : 'MANUAL'

  return {
    dados: { ...input.dados },
    originType,
    baseId: veioDeBase ? input.baseCatalogItem!.id : null,
    baseCode: null,
    baseName: veioDeBase ? input.baseCatalogItem!.nome : null,
    baseVersion: null,
    sourceType: veioDeBase ? null : 'MANUAL',
    sourceRefId: null,
    options,
    totals: {
      totalOptions: ord.length,
      totalAreas: t.areas,
      totalSteps: t.etapas,
      totalMinutes: t.minutos,
    },
    reviewStatus: input.prontaParaRegistrar ? 'ready' : 'incomplete',
    estruturaOrigem: input.estruturaOrigem,
    registeredAtIso: new Date().toISOString(),
  }
}
