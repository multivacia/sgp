import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import { buildMatrixTreeAggregateMaps } from '../matrixTreeAggregates'
import { validateCatalogOpcoesDraftForSubmit } from './catalogOpcaoDraftValidation'
import { sortMatrixChildNodes, type CatalogOpcaoDraftInstance } from './cloneCatalogTaskSubtreeForDraft'
import type { CriarMatrizManualOpcao } from './criarMatrizManualDraft'
import { validateManualOpcoesForSubmit } from './criarMatrizManualDraft'
import { buildDraftCatalogItemTree } from './novaMatrizCatalogDraftTree'

export type MatrizJornadaStepId = 'dados' | 'estrutura' | 'revisao'

export type MatrizJornadaStepVisual = 'pendente' | 'atual' | 'concluida'

export type MatrizJornadaStepDefinition = {
  id: MatrizJornadaStepId
  label: string
  status: MatrizJornadaStepVisual
}

/**
 * Igual à jornada da Nova Esteira: `dadosOk` só com nome; `estruturaOk` alinhado ao submit
 * (`validateManualOpcoesForSubmit` + `validateCatalogOpcoesDraftForSubmit`).
 */
export function deriveMatrizJornadaStepperSteps(
  nomeMatriz: string,
  estruturaOk: boolean,
): MatrizJornadaStepDefinition[] {
  const dadosOk = nomeMatriz.trim().length > 0
  let foco: 1 | 2 | 3 = 1
  if (!dadosOk) foco = 1
  else if (!estruturaOk) foco = 2
  else foco = 3

  const defs: { id: MatrizJornadaStepId; label: string; n: 1 | 2 | 3 }[] = [
    { id: 'dados', label: 'Dados básicos', n: 1 },
    { id: 'estrutura', label: 'Estrutura', n: 2 },
    { id: 'revisao', label: 'Revisão', n: 3 },
  ]

  return defs.map((d) => {
    let status: MatrizJornadaStepVisual
    if (d.n < foco) status = 'concluida'
    else if (d.n === foco) status = 'atual'
    else status = 'pendente'
    return { id: d.id, label: d.label, status }
  })
}

export function matrizEstruturaOk(
  manualOpcoes: CriarMatrizManualOpcao[],
  catalogOpcoesDraft: CatalogOpcaoDraftInstance[],
): boolean {
  return (
    validateManualOpcoesForSubmit(manualOpcoes) === null &&
    validateCatalogOpcoesDraftForSubmit(catalogOpcoesDraft) === null
  )
}

/** Mensagens para o carrinho — mesmas regras que o submit, sem validação paralela. */
export function pendenciasNovaMatrizResumo(
  nomeMatriz: string,
  manualOpcoes: CriarMatrizManualOpcao[],
  catalogOpcoesDraft: CatalogOpcaoDraftInstance[],
): string[] {
  const out: string[] = []
  if (!nomeMatriz.trim()) out.push('Indique o nome da matriz.')
  const m = validateManualOpcoesForSubmit(manualOpcoes)
  if (m) out.push(m)
  const c = validateCatalogOpcoesDraftForSubmit(catalogOpcoesDraft)
  if (c) out.push(c)
  return out
}

function manualAggregate(manualOpcoes: CriarMatrizManualOpcao[]): {
  nOpcoes: number
  nAreas: number
  nEtapas: number
  minutos: number
} {
  let nAreas = 0
  let nEtapas = 0
  let minutos = 0
  for (const op of manualOpcoes) {
    for (const ar of op.areas) {
      nAreas++
      for (const et of ar.etapas) {
        nEtapas++
        const pm = et.plannedMinutes
        if (pm != null && !Number.isNaN(pm)) minutos += Math.max(0, Math.floor(pm))
      }
    }
  }
  return { nOpcoes: manualOpcoes.length, nAreas, nEtapas, minutos }
}

export function summarizeMatrixTaskDraftRoot(root: MatrixNodeTreeApi): {
  nAreas: number
  nEtapas: number
  minutos: number
} {
  let nAreas = 0
  let nEtapas = 0
  let minutos = 0
  for (const sec of sortMatrixChildNodes(root)) {
    if (sec.node_type !== 'SECTOR') continue
    nAreas++
    for (const act of sortMatrixChildNodes(sec)) {
      if (act.node_type !== 'ACTIVITY') continue
      nEtapas++
      minutos += Math.max(0, Math.floor(Number(act.planned_minutes ?? 0)))
    }
  }
  return { nAreas, nEtapas, minutos }
}

export function aggregateNovaMatrizCombos(
  catalogOpcoesDraft: CatalogOpcaoDraftInstance[],
  manualOpcoes: CriarMatrizManualOpcao[],
  collaboratorIds: ReadonlySet<string>,
): {
  nOpcoes: number
  nAreas: number
  nEtapas: number
  minutos: number
} {
  const draftTree = buildDraftCatalogItemTree(catalogOpcoesDraft)
  const maps = buildMatrixTreeAggregateMaps(draftTree, collaboratorIds)
  const g = maps.global
  const man = manualAggregate(manualOpcoes)
  return {
    nOpcoes: catalogOpcoesDraft.length + man.nOpcoes,
    nAreas: g.sectorCount + man.nAreas,
    nEtapas: g.activityCount + man.nEtapas,
    minutos: g.plannedMinutesSum + man.minutos,
  }
}
