import { randomUUID } from 'node:crypto'
import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { resolveActivityPlannedQuantity } from '../../shared/activityOperationalQuantity.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import type {
  MatrixNodeApi,
  MatrixNodeTreeApi,
  MatrixSuggestionCatalogApi,
} from './operation-matrix.dto.js'
import { rowToMatrixNodeApi } from './operation-matrix.dto.js'
import type { CreateMatrixNodeBody, PatchMatrixNodeBody } from './operation-matrix.schemas.js'
import { pickDuplicateMatrixRootName } from './duplicateMatrixItemName.js'
import {
  buildMatrixExportFilename,
  buildMatrixExportWorkbookBuffer,
} from './operation-matrix.export.js'
import {
  buildNestedTree,
  findNodeRowById,
  insertNode,
  labelCatalogRowToApi,
  listExistingTeamIds,
  listMatrixSuggestionCatalogRows,
  listRootItems,
  listSubtreeFromNode,
  listSubtreeRowsForCopy,
  listTeamNamesByIds,
  listTreeRowsByRootId,
  matrixRootItemNameExists,
  nextSiblingOrderIndex,
  restoreCascade,
  replaceNodeTeamLinks,
  softDeleteCascade,
  swapSiblingOrder,
  updateNode,
  type ListRootFilters,
  type PatchNodeDbInput,
} from './operation-matrix.repository.js'

const ALLOWED_CHILD: Record<string, string[]> = {
  ITEM: ['TASK'],
  TASK: ['SECTOR'],
  SECTOR: ['ACTIVITY'],
  ACTIVITY: [],
}

function assertAllowedChild(parentType: string, childType: string): void {
  const ok = ALLOWED_CHILD[parentType]?.includes(childType)
  if (!ok) {
    throw new AppError(
      `Não é permitido criar ${childType} sob ${parentType}.`,
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
}

function empty(s: string | undefined | null): string | null {
  if (s === undefined || s === null) return null
  const t = s.trim()
  return t === '' ? null : t
}

function normalizeUniqueIds(ids: readonly string[] | undefined): string[] {
  if (!ids || ids.length === 0) return []
  return [...new Set(ids.map((x) => x.trim()).filter(Boolean))]
}

/** No máximo 1 equipe padrão por atividade (primeira id válida na ordem do payload). */
function normalizeActivityTeamIdsForSave(
  ids: readonly string[] | undefined,
): string[] {
  return normalizeUniqueIds(ids).slice(0, 1)
}

export async function serviceListRootItems(
  pool: pg.Pool,
  filters: ListRootFilters,
): Promise<MatrixNodeApi[]> {
  return listRootItems(pool, filters)
}

export async function serviceListSuggestionCatalog(
  pool: pg.Pool,
): Promise<MatrixSuggestionCatalogApi> {
  const rows = await listMatrixSuggestionCatalogRows(pool)
  return {
    options: rows.options.map(labelCatalogRowToApi),
    areas: rows.areas.map(labelCatalogRowToApi),
    activities: rows.activities.map(labelCatalogRowToApi),
  }
}

export async function serviceGetTree(
  pool: pg.Pool,
  itemId: string,
): Promise<MatrixNodeTreeApi> {
  const root = await findNodeRowById(pool, itemId)
  if (!root || root.node_type !== 'ITEM' || root.parent_id !== null) {
    throw new AppError(
      'Matriz (item) não encontrada.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }
  const rows = await listTreeRowsByRootId(pool, itemId)
  if (rows.length === 0) {
    throw new AppError(
      'Matriz (item) não encontrada.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }
  return buildNestedTree(rows)
}

function collectTeamIdsFromTree(tree: MatrixNodeTreeApi): string[] {
  const ids = new Set<string>()
  function walk(node: MatrixNodeTreeApi): void {
    for (const teamId of node.team_ids) {
      if (teamId) ids.add(teamId)
    }
    for (const child of node.children) {
      walk(child)
    }
  }
  walk(tree)
  return [...ids]
}

export async function serviceExportMatrixXlsx(
  pool: pg.Pool,
  itemId: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const tree = await serviceGetTree(pool, itemId)
  const teamNamesById = await listTeamNamesByIds(
    pool,
    collectTeamIdsFromTree(tree),
  )
  const exportedAt = new Date()
  const buffer = await buildMatrixExportWorkbookBuffer(
    tree,
    teamNamesById,
    exportedAt,
  )
  return {
    buffer,
    filename: buildMatrixExportFilename(
      tree.id,
      tree.code,
      tree.name,
      exportedAt,
    ),
  }
}

export async function serviceCreateNode(
  pool: pg.Pool,
  body: CreateMatrixNodeBody,
): Promise<MatrixNodeApi> {
  const isActivity = body.nodeType === 'ACTIVITY'
  if (!isActivity) {
    if (body.plannedQuantity !== undefined) {
      throw new AppError(
        'plannedQuantity só é aceito para ACTIVITY.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    if (body.plannedMinutes !== undefined) {
      throw new AppError(
        'planned_minutes só é aceito para ACTIVITY.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    if (body.defaultResponsibleId !== undefined) {
      throw new AppError(
        'default_responsible_id só é aceito para ACTIVITY.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    if (body.teamIds !== undefined) {
      throw new AppError(
        'teamIds só é aceito para ACTIVITY.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
  }

  if (body.nodeType === 'ITEM') {
    if (body.parentId != null) {
      throw new AppError(
        'ITEM deve ser raiz (sem parentId).',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
  } else if (!body.parentId) {
    throw new AppError(
      'parentId é obrigatório.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const teamIds = normalizeActivityTeamIdsForSave(body.teamIds)
  if (teamIds.length > 0) {
    const existingTeamIds = await listExistingTeamIds(pool, teamIds)
    if (existingTeamIds.size !== teamIds.length) {
      throw new AppError(
        'Um ou mais times vinculados não foram encontrados.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
  }

  const id = randomUUID()

  if (body.nodeType === 'ITEM') {
    const orderIndex = body.orderIndex ?? 0
    const row = await insertNode(pool, {
      id,
      parent_id: null,
      root_id: id,
      node_type: 'ITEM',
      name: body.name.trim(),
      code: empty(body.code),
      description: empty(body.description),
      order_index: orderIndex,
      level_depth: 0,
      is_active: body.isActive ?? true,
      planned_minutes: null,
      planned_quantity: 1,
      default_responsible_id: null,
      required: body.required ?? true,
      source_key: empty(body.sourceKey),
      metadata_json: body.metadataJson ?? null,
    })
    return rowToMatrixNodeApi(row)
  }

  const parent = await findNodeRowById(pool, body.parentId!)
  if (!parent) {
    throw new AppError('Nó pai não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  assertAllowedChild(parent.node_type, body.nodeType)

  if (
    body.nodeType === 'ACTIVITY' &&
    body.defaultResponsibleId !== undefined
  ) {
    throw new AppError(
      'Colaborador padrão não é mais usado em Atividades da Matriz. Use teamIds (equipe padrão).',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const level_depth = parent.level_depth + 1
  const order_index =
    body.orderIndex ?? (await nextSiblingOrderIndex(pool, parent.id))

  const row = await insertNode(pool, {
    id,
    parent_id: parent.id,
    root_id: parent.root_id,
    node_type: body.nodeType,
    name: body.name.trim(),
    code: empty(body.code),
    description: empty(body.description),
    order_index,
    level_depth,
    is_active: body.isActive ?? true,
    planned_minutes: isActivity ? (body.plannedMinutes ?? null) : null,
    planned_quantity: isActivity
      ? resolveActivityPlannedQuantity(body.plannedQuantity)
      : 1,
    default_responsible_id: null,
    required: body.required ?? true,
    source_key: empty(body.sourceKey),
    metadata_json: body.metadataJson ?? null,
  })
  if (!isActivity) {
    return rowToMatrixNodeApi(row)
  }
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await replaceNodeTeamLinks(client, row.id, teamIds)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
  const fresh = await findNodeRowById(pool, row.id)
  if (!fresh) {
    throw new AppError('Nó não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return rowToMatrixNodeApi(fresh)
}

function patchBodyToDb(
  nodeType: string,
  body: PatchMatrixNodeBody,
): PatchNodeDbInput {
  const isActivity = nodeType === 'ACTIVITY'
  if (!isActivity) {
    if (body.plannedMinutes !== undefined) {
      throw new AppError(
        'planned_minutes só pode ser alterado em ACTIVITY.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    if (body.plannedQuantity !== undefined) {
      throw new AppError(
        'plannedQuantity só pode ser alterado em ACTIVITY.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    if (body.defaultResponsibleId !== undefined) {
      throw new AppError(
        'default_responsible_id só pode ser alterado em ACTIVITY.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    if (body.required !== undefined) {
      throw new AppError(
        'required só pode ser alterado em ACTIVITY.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    if (body.teamIds !== undefined) {
      throw new AppError(
        'teamIds só pode ser alterado em ACTIVITY.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
  }

  if (isActivity && body.defaultResponsibleId !== undefined) {
    throw new AppError(
      'Colaborador padrão não é mais usado em Atividades da Matriz. Use teamIds (equipe padrão).',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const p: PatchNodeDbInput = {}
  if (body.name !== undefined) p.name = body.name.trim()
  if (body.code !== undefined) p.code = empty(body.code)
  if (body.description !== undefined) p.description = empty(body.description)
  if (body.orderIndex !== undefined) p.order_index = body.orderIndex
  if (body.isActive !== undefined) p.is_active = body.isActive
  if (body.plannedMinutes !== undefined && isActivity) {
    p.planned_minutes = body.plannedMinutes
  }
  if (body.plannedQuantity !== undefined && isActivity) {
    p.planned_quantity = resolveActivityPlannedQuantity(body.plannedQuantity)
  }
  if (body.required !== undefined && isActivity) p.required = body.required
  if (body.sourceKey !== undefined) p.source_key = empty(body.sourceKey)
  if (body.metadataJson !== undefined) p.metadata_json = body.metadataJson
  return p
}

export async function servicePatchNode(
  pool: pg.Pool,
  id: string,
  body: PatchMatrixNodeBody,
): Promise<MatrixNodeApi | null> {
  const existing = await findNodeRowById(pool, id)
  if (!existing) return null

  const teamIds = normalizeActivityTeamIdsForSave(body.teamIds)
  if (body.teamIds !== undefined && teamIds.length > 0) {
    const existingTeamIds = await listExistingTeamIds(pool, teamIds)
    if (existingTeamIds.size !== teamIds.length) {
      throw new AppError(
        'Um ou mais times vinculados não foram encontrados.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
  }

  const patch = patchBodyToDb(existing.node_type, body)
  if (existing.node_type === 'ACTIVITY' && body.teamIds !== undefined) {
    patch.default_responsible_id = null
  }
  const row = await updateNode(pool, id, patch)
  if (!row) return null
  if (existing.node_type === 'ACTIVITY' && body.teamIds !== undefined) {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await replaceNodeTeamLinks(client, id, teamIds)
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
    const fresh = await findNodeRowById(pool, id)
    return fresh ? rowToMatrixNodeApi(fresh) : null
  }
  return rowToMatrixNodeApi(row)
}

export async function serviceDeleteNode(
  pool: pg.Pool,
  id: string,
): Promise<{ removedCount: number }> {
  const existing = await findNodeRowById(pool, id)
  if (!existing) {
    throw new AppError('Nó não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  const n = await softDeleteCascade(pool, id)
  return { removedCount: n }
}

export async function serviceRestoreNode(
  pool: pg.Pool,
  id: string,
): Promise<{ restoredCount: number }> {
  const existing = await findNodeRowById(pool, id, { includeDeleted: true })
  if (!existing) {
    throw new AppError('Nó não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  if (existing.deleted_at === null) {
    throw new AppError('Nó já está ativo.', 422, ErrorCodes.VALIDATION_ERROR)
  }
  const n = await restoreCascade(pool, id)
  return { restoredCount: n }
}

export async function serviceReorder(
  pool: pg.Pool,
  id: string,
  direction: 'up' | 'down',
): Promise<MatrixNodeApi | null> {
  const row = await swapSiblingOrder(pool, id, direction)
  return row ? rowToMatrixNodeApi(row) : null
}

export type DuplicateItemAsNewRootOptions = {
  /** Se definido, substitui apenas o nome do ITEM raiz clonado. */
  newRootName?: string
}

/** ITEM → nova matriz raiz completa (novo ITEM raiz). */
export async function serviceDuplicateItemAsNewRoot(
  pool: pg.Pool,
  itemId: string,
  opts?: DuplicateItemAsNewRootOptions,
): Promise<MatrixNodeTreeApi> {
  const rows = await listSubtreeRowsForCopy(pool, itemId)
  const root = rows.find((r) => r.node_type === 'ITEM' && r.parent_id === null)
  if (!root || root.id !== itemId) {
    throw new AppError(
      'Matriz (item) não encontrada.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }

  const idMap = new Map<string, string>()
  for (const r of rows) {
    idMap.set(r.id, randomUUID())
  }

  const newRootId = idMap.get(root.id)!
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const r of rows) {
      const newId = idMap.get(r.id)!
      const newParentId =
        r.parent_id === null ? null : idMap.get(r.parent_id)!
      const nodeName =
        r.node_type === 'ITEM' &&
        r.parent_id === null &&
        opts?.newRootName !== undefined
          ? opts.newRootName
          : r.name
      const inserted = await insertNode(client, {
        id: newId,
        parent_id: newParentId,
        root_id: newRootId,
        node_type: r.node_type,
        name: nodeName,
        code: r.code,
        description: r.description,
        order_index: r.order_index,
        level_depth: r.level_depth,
        is_active: r.is_active,
        planned_minutes: r.planned_minutes,
        planned_quantity: r.planned_quantity ?? 1,
        default_responsible_id:
          r.node_type === 'ACTIVITY' ? null : r.default_responsible_id,
        required: r.required,
        source_key: r.source_key,
        metadata_json: r.metadata_json,
      })
      if (inserted.node_type === 'ACTIVITY') {
        await replaceNodeTeamLinks(client, inserted.id, r.team_ids ?? [])
      }
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  const outRows = await listTreeRowsByRootId(pool, newRootId)
  return buildNestedTree(outRows)
}

/** Duplica matriz (ITEM raiz) com nome `Original (Cópia)` único e árvore operacional completa. */
export async function serviceDuplicateMatrixItem(
  pool: pg.Pool,
  itemId: string,
): Promise<MatrixNodeTreeApi> {
  const root = await findNodeRowById(pool, itemId)
  if (!root || root.node_type !== 'ITEM' || root.parent_id !== null) {
    throw new AppError(
      'Matriz (item) não encontrada.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }
  const newName = await pickDuplicateMatrixRootName(
    (candidate) => matrixRootItemNameExists(pool, candidate),
    root.name,
  )
  return serviceDuplicateItemAsNewRoot(pool, itemId, {
    newRootName: newName,
  })
}

/** TASK / SECTOR / ACTIVITY → duplica subárvore como irmão (mesmo pai). */
export async function serviceDuplicateSubtreeUnderSameParent(
  pool: pg.Pool,
  nodeId: string,
): Promise<MatrixNodeTreeApi> {
  const rows = await listSubtreeFromNode(pool, nodeId)
  if (rows.length === 0) {
    throw new AppError('Nó não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  const source = rows[0]
  if (!source || source.id !== nodeId) {
    throw new AppError('Nó não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  if (source.node_type === 'ITEM') {
    throw new AppError(
      'Use o endpoint de duplicação de matriz (ITEM) para copiar um item raiz.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const parentId = source.parent_id
  if (!parentId) {
    throw new AppError('Nó inválido.', 422, ErrorCodes.VALIDATION_ERROR)
  }

  const order_index = await nextSiblingOrderIndex(pool, parentId)
  const idMap = new Map<string, string>()
  for (const r of rows) {
    idMap.set(r.id, randomUUID())
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!
      const newId = idMap.get(r.id)!
      let newParentId: string | null
      if (r.parent_id === null) {
        newParentId = null
      } else if (idMap.has(r.parent_id)) {
        newParentId = idMap.get(r.parent_id)!
      } else {
        newParentId = r.parent_id
      }

      const ord = i === 0 ? order_index : r.order_index

      const inserted = await insertNode(client, {
        id: newId,
        parent_id: newParentId,
        root_id: source.root_id,
        node_type: r.node_type,
        name: r.name,
        code: r.code,
        description: r.description,
        order_index: ord,
        level_depth: r.level_depth,
        is_active: r.is_active,
        planned_minutes: r.planned_minutes,
        planned_quantity: r.planned_quantity ?? 1,
        default_responsible_id:
          r.node_type === 'ACTIVITY' ? null : r.default_responsible_id,
        required: r.required,
        source_key: r.source_key,
        metadata_json: r.metadata_json,
      })
      if (inserted.node_type === 'ACTIVITY') {
        await replaceNodeTeamLinks(client, inserted.id, r.team_ids ?? [])
      }
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  return buildNestedTree(await listTreeRowsByRootId(pool, source.root_id))
}

export async function serviceDuplicate(
  pool: pg.Pool,
  nodeId: string,
): Promise<MatrixNodeTreeApi> {
  const row = await findNodeRowById(pool, nodeId)
  if (!row) {
    throw new AppError('Nó não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  if (row.node_type === 'ITEM') {
    return serviceDuplicateItemAsNewRoot(pool, nodeId, undefined)
  }
  return serviceDuplicateSubtreeUnderSameParent(pool, nodeId)
}
