/**
 * Catálogo da Nova Esteira — templates `NovaEsteiraBlocoOperacional` derivados do catálogo operacional.
 */

import {
  BLOCOS_OPERACIONAIS_CATALOGO,
  getBlocoOperacionalDef,
  type BlocoOperacionalDef,
} from './blocos-operacionais-catalog'
import type { NovaEsteiraBlocoOperacional } from './nova-esteira-bloco-contrato'

function templateDoDef(def: BlocoOperacionalDef, ordem: number): NovaEsteiraBlocoOperacional {
  const ne = def.novaEsteira
  return {
    id: def.id,
    code: def.id,
    nome: def.nome,
    tipo: ne.tipo,
    descricao: def.operacional?.intencao
      ? `${def.nomeLista} — ${def.operacional.intencao}`
      : `${def.nomeLista} — item do catálogo operacional mock`,
    ordem,
    ativo: false,
    configurado: false,
    obrigatorio: ne.obrigatorioMontagem,
    preRequisitos: def.preRequisitosCatalogoIds,
    incompatibilidades: ne.incompatibilidadesCatalogoIds,
    dependenciasOpcionais: ne.dependenciasOpcionaisCatalogoIds,
    pendencias: [],
    impactos: [],
    resumoOperacional: undefined,
    status: 'nao_iniciado',
    metadata: { catalogoId: def.id, origem: 'catalogo' as const },
  }
}

/** Catálogo completo como blocos template (ordenado pelo índice do catálogo). */
export function getNovaEsteiraBlocosMock(): NovaEsteiraBlocoOperacional[] {
  return BLOCOS_OPERACIONAIS_CATALOGO.map((def, i) => templateDoDef(def, i + 1))
}

/** Template por id de catálogo (determinístico). */
export function getBlocoById(id: string): NovaEsteiraBlocoOperacional | undefined {
  const def = getBlocoOperacionalDef(id)
  if (!def) return undefined
  const idx = BLOCOS_OPERACIONAIS_CATALOGO.findIndex((d) => d.id === id)
  return templateDoDef(def, idx >= 0 ? idx + 1 : 0)
}
