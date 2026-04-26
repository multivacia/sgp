/**
 * Detalhe das esteiras — universo oficial (ET-001 … ET-005).
 * A estrutura operacional é derivada de matrix_nodes (ITEM→TASK→SECTOR→ACTIVITY)
 * via `matrix-bravo-build-tree` + enriquecimento em `esteira-oficial-from-matrix`.
 */

import { getMaterializadaEsteiraDetalhe } from './esteira-materializada-registry'
import {
  ESTEIRA_ET001 as ET001,
  ESTEIRA_ET002 as ET002,
  ESTEIRA_ET003 as ET003,
  ESTEIRA_ET004 as ET004,
  ESTEIRA_ET005 as ET005,
} from './esteira-oficial-from-matrix'

export type {
  AtividadePrioridade,
  AtividadeStatusDetalhe,
  EsteiraAtividadeMock,
  EsteiraDetalheMock,
  EsteiraStatusGeral,
  EsteiraTarefaMock,
  TarefaStatusAgregado,
} from './esteira-detalhe-types'

export { computeResumoEsteira, computeTarefaResumo } from './esteira-detalhe-compute'

/** ET-001 — caso principal (rico). Em execução. */
export const ESTEIRA_ET001_ID = 'et-001'

/** ET-002 — foco bancos dianteiros. */
export const ESTEIRA_ET002_ID = 'et-002'

/** ET-003 — caso linear (teto). */
export const ESTEIRA_ET003_ID = 'et-003'

/** ET-004 — higienização HVAC / dutos. */
export const ESTEIRA_ET004_ID = 'et-004'

/** ET-005 — volante / airbag (revestimento). */
export const ESTEIRA_ET005_ID = 'et-005'

/** Estimativas e realizados coerentes com a matriz oficial Bravo + overlay legado. */
export const ESTEIRA_ET001 = ET001

export const ESTEIRA_ET002 = ET002

export const ESTEIRA_ET003 = ET003

export const ESTEIRA_ET004 = ET004

export const ESTEIRA_ET005 = ET005

export const OFFICIAL_ESTEIRA_IDS = [
  'et-001',
  'et-002',
  'et-003',
  'et-004',
  'et-005',
] as const

export const ESTEIRAS_OFICIAIS_DETALHE: Record<
  (typeof OFFICIAL_ESTEIRA_IDS)[number],
  import('./esteira-detalhe-types').EsteiraDetalheMock
> = {
  'et-001': ESTEIRA_ET001,
  'et-002': ESTEIRA_ET002,
  'et-003': ESTEIRA_ET003,
  'et-004': ESTEIRA_ET004,
  'et-005': ESTEIRA_ET005,
}

export function listOfficialEsteiras() {
  return OFFICIAL_ESTEIRA_IDS.map((id) => ESTEIRAS_OFICIAIS_DETALHE[id])
}

export function getEsteiraDetalheMock(id: string) {
  if (id in ESTEIRAS_OFICIAIS_DETALHE) {
    return ESTEIRAS_OFICIAIS_DETALHE[id as keyof typeof ESTEIRAS_OFICIAIS_DETALHE]
  }
  return getMaterializadaEsteiraDetalhe(id)
}
