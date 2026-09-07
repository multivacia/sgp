import type {
  CreateConveyorStepAssigneeInput,
  PatchConveyorStructureEditBody,
  PatchConveyorStructureEditOptionInput,
} from '../../../domain/conveyors/conveyor.types'
import type { ManualOptionDraft } from './matrixToConveyorCreateInput'

/**
 * Builder exclusivo de EDIÇÃO (PATCH /conveyors/:id/structure) — distinto de
 * `buildManualConveyorInput` (POST /conveyors, criação), que nunca deve
 * receber `id`.
 *
 * Usa `ManualOptionDraft.id`/`ManualAreaDraft.id`/`ManualStepDraft.id` (NUNCA
 * `key`, que é sempre um UUID novo ou existente) para decidir INSERT (sem
 * `id`, nó criado nesta sessão) vs UPDATE (com `id`, nó veio do baseline da
 * API).
 */
export function buildConveyorStructureEditInput(
  roots: ManualOptionDraft[],
  assigneesByStepKey: Record<string, CreateConveyorStepAssigneeInput[]>,
): PatchConveyorStructureEditBody {
  const options: PatchConveyorStructureEditOptionInput[] = roots.map((op, oi) => ({
    ...(op.id ? { id: op.id } : {}),
    titulo: op.titulo.trim(),
    orderIndex: oi + 1,
    sourceOrigin: 'manual',
    areas: op.areas.map((ar, ai) => ({
      ...(ar.id ? { id: ar.id } : {}),
      titulo: ar.titulo.trim(),
      orderIndex: ai + 1,
      sourceOrigin: 'manual',
      steps: ar.steps.map((st, si) => ({
        ...(st.id ? { id: st.id } : {}),
        titulo: st.titulo.trim(),
        orderIndex: si + 1,
        plannedMinutes: Math.max(0, Math.floor(st.plannedMinutes)),
        plannedQuantity: 1,
        sourceKey: st.sourceKey ?? null,
        sourceOrigin: 'manual',
        required: true,
        assignees: assigneesByStepKey[st.key] ?? [],
      })),
    })),
  }))

  return {
    originType: 'MANUAL',
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    matrixRootItemId: null,
    options,
  }
}
