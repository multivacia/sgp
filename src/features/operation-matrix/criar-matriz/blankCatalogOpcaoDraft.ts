import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'
import type { CatalogOpcaoDraftInstance } from './cloneCatalogTaskSubtreeForDraft'

/**
 * Nova opção criada no editor (sem clone de catálogo) — apenas rascunho local.
 * Metadados `source*` são placeholders para breadcrumb; não referenciam API.
 */
export function buildBlankCatalogOpcaoDraftInstance(
  name: string,
  description?: string | null,
): CatalogOpcaoDraftInstance {
  const n = name.trim()
  const taskId = globalThis.crypto.randomUUID()
  const now = new Date().toISOString()
  const draftRoot: MatrixNodeTreeApi = {
    id: taskId,
    parent_id: null,
    root_id: taskId,
    node_type: 'TASK',
    code: null,
    name: n,
    description: description?.trim() || null,
    order_index: 0,
    level_depth: 1,
    is_active: true,
    planned_minutes: null,
    default_responsible_id: null,
    team_ids: [],
    required: true,
    source_key: null,
    metadata_json: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    children: [],
  }
  return {
    instanceId: globalThis.crypto.randomUUID(),
    sourceTaskId: `local-blank-${taskId}`,
    sourceMatrixItemId: 'local-draft',
    sourceMatrixItemName: 'Opção nova',
    sourceTaskName: n || 'Nova opção',
    draftRoot,
  }
}
