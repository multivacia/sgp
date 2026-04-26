import { createMatrixNode } from '../../../services/operation-matrix/operationMatrixApiService'
import type {
  CriarMatrizManualEtapa,
  CriarMatrizManualOpcao,
} from './criarMatrizManualDraft'
import { reconcileEtapaCollaborators } from './criarMatrizManualDraft'
import { buildMatrixActivityMetadataJson } from './matrixActivityCollaboratorsMeta'

/**
 * Cria TASK → SECTOR → ACTIVITY sob o item raiz, na ordem dos rascunhos.
 */
export async function createManualOpcoesUnderItem(
  itemId: string,
  opcoes: CriarMatrizManualOpcao[],
): Promise<void> {
  for (const op of opcoes) {
    const task = await createMatrixNode({
      nodeType: 'TASK',
      parentId: itemId,
      name: op.name.trim(),
      description: op.description.trim() || null,
      isActive: true,
    })
    for (const area of op.areas) {
      const sector = await createMatrixNode({
        nodeType: 'SECTOR',
        parentId: task.id,
        name: area.name.trim(),
        isActive: true,
      })
      for (const etapa of area.etapas) {
        await createActivityUnderSector(sector.id, etapa)
      }
    }
  }
}

async function createActivityUnderSector(
  sectorId: string,
  etapa: CriarMatrizManualEtapa,
): Promise<void> {
  const r = reconcileEtapaCollaborators(etapa)
  const pm = r.plannedMinutes
  const primary = r.primaryCollaboratorId
  const supportIds = r.collaboratorIds.filter((id) => id !== primary)

  await createMatrixNode({
    nodeType: 'ACTIVITY',
    parentId: sectorId,
    name: r.name.trim(),
    isActive: true,
    plannedMinutes: pm == null || Number.isNaN(pm) ? null : Math.round(pm),
    defaultResponsibleId: primary ?? null,
    teamIds: [...new Set(r.teamIds)],
    metadataJson: buildMatrixActivityMetadataJson(supportIds),
  })
}
