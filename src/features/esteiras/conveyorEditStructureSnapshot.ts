import type { ConveyorStructure } from '../../domain/conveyors/conveyor.types'
import type {
  ManualOptionDraft,
  NovaEsteiraAlocacaoLinha,
} from './nova-esteira/matrixToConveyorCreateInput'

/** Linha de alocação normalizada para comparação estável (modo edit). */
type NormalizedAllocSnapshotRow = {
  type: 'COLLABORATOR' | 'TEAM'
  collaboratorId: string | null
  teamId: string | null
  isPrimary: boolean
}

function normalizeAllocRowsForSnapshot(
  rows: NovaEsteiraAlocacaoLinha[],
): NormalizedAllocSnapshotRow[] {
  const out: NormalizedAllocSnapshotRow[] = rows.map((r) => {
    const type = r.type === 'TEAM' ? 'TEAM' : 'COLLABORATOR'
    return {
      type,
      collaboratorId:
        type === 'COLLABORATOR' ? (r.collaboratorId?.trim() || null) : null,
      teamId: type === 'TEAM' ? (r.teamId?.trim() || null) : null,
      isPrimary: Boolean(r.isPrimary),
    }
  })
  out.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type)
    const ac = a.collaboratorId ?? ''
    const bc = b.collaboratorId ?? ''
    if (ac !== bc) return ac.localeCompare(bc)
    const at = a.teamId ?? ''
    const bt = b.teamId ?? ''
    if (at !== bt) return at.localeCompare(bt)
    return Number(a.isPrimary) - Number(b.isPrimary)
  })
  return out
}

/**
 * Detalhe da API: ids de opção/área/etapa vêm do servidor e alinham com `conveyor_node_assignees`.
 */
export function structureToManualRootsFromApiDetail(
  structure: ConveyorStructure,
): ManualOptionDraft[] {
  return [...structure.options]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((op) => ({
      key: op.id,
      titulo: op.name,
      areas: [...op.areas]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((ar) => ({
          key: ar.id,
          titulo: ar.name,
          steps: [...ar.steps]
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((st) => ({
              key: st.id,
              titulo: st.name,
              plannedMinutes: Math.max(0, Math.floor(Number(st.plannedMinutes ?? 0))),
              plannedQuantity: Math.max(1, Math.floor(Number(st.plannedQuantity ?? 1))),
              operationalStatus: st.operationalStatus,
            })),
        })),
    }))
}

export function detailStructureToManualAloc(
  structure: ConveyorStructure,
): Record<string, NovaEsteiraAlocacaoLinha[]> {
  const out: Record<string, NovaEsteiraAlocacaoLinha[]> = {}
  for (const op of structure.options) {
    for (const ar of op.areas) {
      for (const st of ar.steps) {
        const assignees = st.assignees ?? []
        if (assignees.length === 0) continue
        out[st.id] = assignees.map((a) => {
          if (a.type === 'TEAM') {
            return {
              type: 'TEAM' as const,
              teamId: a.teamId ?? undefined,
              isPrimary: false,
            }
          }
          return {
            type: 'COLLABORATOR' as const,
            collaboratorId: a.collaboratorId ?? undefined,
            isPrimary: a.isPrimary,
          }
        })
      }
    }
  }
  return out
}

/**
 * Snapshot persistível no modo edit: estrutura (títulos/minutos) + alocações por etapa,
 * com ordem de linhas de alocação normalizada (evita falso negativo só por permuta no array).
 */
export function buildPersistableStructureSnapshot(
  roots: ManualOptionDraft[],
  manualAloc: Record<string, NovaEsteiraAlocacaoLinha[]>,
): string {
  return JSON.stringify(
    roots.map((o) => ({
      t: o.titulo.trim(),
      a: o.areas.map((ar) => ({
        t: ar.titulo.trim(),
        s: ar.steps.map((st) => ({
          t: st.titulo.trim(),
          m: Math.max(0, Math.floor(st.plannedMinutes)),
          alloc: normalizeAllocRowsForSnapshot(manualAloc[st.key] ?? []),
        })),
      })),
    })),
  )
}

export function hasPersistableStructureChanges(
  roots: ManualOptionDraft[],
  manualAloc: Record<string, NovaEsteiraAlocacaoLinha[]>,
  baselineStructureSig: string,
): boolean {
  return buildPersistableStructureSnapshot(roots, manualAloc) !== baselineStructureSig
}

export function buildStructureBaselineFromApiDetail(structure: ConveyorStructure): {
  roots: ManualOptionDraft[]
  manualAloc: Record<string, NovaEsteiraAlocacaoLinha[]>
  baselineStructureSig: string
} {
  const roots = structureToManualRootsFromApiDetail(structure)
  const manualAloc = detailStructureToManualAloc(structure)
  return {
    roots,
    manualAloc,
    baselineStructureSig: buildPersistableStructureSnapshot(roots, manualAloc),
  }
}
