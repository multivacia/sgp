import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import type { ManualOptionDraft, NovaEsteiraAlocacaoLinha } from './matrixToConveyorCreateInput'
import { validateManualStepAssignees, validateManualStructure } from './matrixToConveyorCreateInput'

/** IDs de matriz (raiz ITEM) inferidos a partir de `catalogSourceKey` das tarefas importadas. */
export function matrixRootIdsFromManualRoots(roots: ManualOptionDraft[]): string[] {
  const ids = new Set<string>()
  for (const r of roots) {
    const k = r.catalogSourceKey
    if (!k?.startsWith('mroot:')) continue
    const rest = k.slice('mroot:'.length)
    const id = rest.split(':')[0]?.trim()
    if (id) ids.add(id)
  }
  return [...ids]
}

export function sumPlannedMinutesInMatrixTree(tree: MatrixNodeTreeApi | undefined): number {
  if (!tree) return 0
  let total = 0
  function walk(n: MatrixNodeTreeApi) {
    if (n.node_type === 'ACTIVITY') {
      total += Math.max(0, Math.floor(Number(n.planned_minutes ?? 0)))
    }
    for (const c of n.children ?? []) walk(c)
  }
  walk(tree)
  return total
}

export function countStepsInRoots(roots: ManualOptionDraft[]): number {
  return roots.reduce((n, o) => n + o.areas.reduce((a, ar) => a + ar.steps.length, 0), 0)
}

export function countSectorsInRoots(roots: ManualOptionDraft[]): number {
  return roots.reduce((n, o) => n + o.areas.length, 0)
}

export function pendenciasParaResumo(
  nomeEsteira: string,
  roots: ManualOptionDraft[],
  aloc: Record<string, NovaEsteiraAlocacaoLinha[]>,
): string[] {
  const out: string[] = []
  if (!nomeEsteira.trim()) out.push('Indique o nome da esteira.')
  if (roots.length === 0) {
    out.push('Adicione pelo menos uma tarefa.')
    return out
  }
  const s = validateManualStructure(roots)
  if (s) out.push(s)
  const a = validateManualStepAssignees(roots, aloc)
  if (a) out.push(a)
  return out
}

export function labelOrigemTarefa(op: ManualOptionDraft): 'base' | 'extra' | 'manual' {
  const k = op.catalogSourceKey
  if (!k) return 'manual'
  if (k.startsWith('mroot:')) return 'base'
  if (k.startsWith('t:')) return 'extra'
  return 'manual'
}

export type JornadaStepId = 'dados' | 'estrutura' | 'revisao'

export type JornadaStepVisual = 'pendente' | 'atual' | 'concluida'

export type JornadaStepDefinition = {
  id: JornadaStepId
  label: string
  status: JornadaStepVisual
}

/**
 * Trilho de jornada alinhado às validações já usadas no submit (`estruturaOk` no pai).
 * Sem regras paralelas: `estruturaOk` deve refletir `validateManualStructure` + assignees + roots.length > 0.
 */
export function deriveJornadaStepperSteps(
  nomeEsteira: string,
  estruturaOk: boolean,
): JornadaStepDefinition[] {
  const dadosOk = nomeEsteira.trim().length > 0
  let foco: 1 | 2 | 3 = 1
  if (!dadosOk) foco = 1
  else if (!estruturaOk) foco = 2
  else foco = 3

  const defs: { id: JornadaStepId; label: string; n: 1 | 2 | 3 }[] = [
    { id: 'dados', label: 'Dados básicos', n: 1 },
    { id: 'estrutura', label: 'Estrutura', n: 2 },
    { id: 'revisao', label: 'Revisão', n: 3 },
  ]

  return defs.map((d) => {
    let status: JornadaStepVisual
    if (d.n < foco) status = 'concluida'
    else if (d.n === foco) status = 'atual'
    else status = 'pendente'
    return { id: d.id, label: d.label, status }
  })
}
