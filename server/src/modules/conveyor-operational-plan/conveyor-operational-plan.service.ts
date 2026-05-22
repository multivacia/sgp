import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { findConveyorById } from '../conveyors/conveyors.repository.js'
import type {
  ConveyorOperationalPlanGetApi,
  ConveyorOperationalPlanApi,
  ConveyorOperationalPlanItemApi,
  ConveyorOperationalPlanGenerationPreviewApi,
} from './conveyor-operational-plan.dto.js'
import type {
  CreateConveyorOperationalPlanBody,
  CreateConveyorOperationalPlanItemBody,
  GenerateConveyorOperationalPlanItemsBody,
  PatchConveyorOperationalPlanItemBody,
  PreviewConveyorOperationalPlanGenerationBody,
} from './conveyor-operational-plan.schemas.js'
import { serviceResolveDefaultOperationalDailyCapacity } from '../operational-settings/operational-settings.service.js'
import {
  buildConveyorOperationalPlanGeneratedItems,
  nextBusinessDayOnOrAfter,
} from './buildConveyorOperationalPlanGeneratedItems.js'
import { buildConveyorOperationalPlanGenerationPreview } from './buildConveyorOperationalPlanGenerationPreview.js'
import { deriveConveyorPlanItemReview } from './deriveConveyorPlanItemReview.js'
import { refreshConveyorOperationalPlanSyncStatus } from './refreshConveyorOperationalPlanSyncStatus.js'
import {
  approvePlan,
  countActivePlanItems,
  countFactoryLinkedActivePlanItems,
  existsPlanItemForActivity,
  findActivePlanByConveyorId,
  findPlanById,
  findPlanItemForPatch,
  insertGeneratedPlanItem,
  insertPlan,
  insertPlanItem,
  listConveyorStepsForPlanGeneration,
  listEnrichedItemsForPlan,
  loadStepForPlanItem,
  loadStepTeamIdsByActivityIds,
  sendPlanToFactory,
  softDeleteActivePlanItemsForPlan,
  touchPlanUpdatedAt,
  updatePlanAfterGeneration,
  updatePlanItem,
  type ConveyorOperationalPlanRow,
  type PlanItemEnrichedRow,
  type PlanItemPatchRow,
} from './conveyor-operational-plan.repository.js'

const ALLOWED_CONVEYOR_STATUSES_FOR_PLAN = new Set(['PRONTA_LIBERAR', 'EM_PRODUCAO'])

function mapPlanRowToApi(row: ConveyorOperationalPlanRow): ConveyorOperationalPlanApi {
  return {
    id: row.id,
    conveyorId: row.conveyor_id,
    status: row.status,
    plannedStartDate: row.planned_start_date,
    plannedEndDate: row.planned_end_date,
    version: row.version,
    generatedAt: row.generated_at,
    generatedBy: row.generated_by,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    factoryPlanningStatus: row.factory_planning_status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function mapPlanItemEnrichedRowToApi(
  row: PlanItemEnrichedRow,
  stepTeamIds: string[] = [],
  dailyCapacityMinutes: number,
): ConveyorOperationalPlanItemApi {
  const review = deriveConveyorPlanItemReview({
    plannedMinutes: row.planned_minutes,
    plannedDate: row.planned_date,
    plannedCollaboratorId: row.planned_collaborator_id,
    plannedTeamId: row.planned_team_id,
    stepTeamIds,
    dailyCapacityMinutes,
  })

  return {
    id: row.id,
    planId: row.plan_id,
    conveyorId: row.conveyor_id,
    activityNodeId: row.activity_node_id,
    taskTitle: row.task_title,
    sectorTitle: row.sector_title,
    activityTitle: row.activity_title,
    plannedDate: row.planned_date,
    plannedOrder: row.planned_order,
    plannedMinutes: row.planned_minutes,
    plannedCollaboratorId: row.planned_collaborator_id,
    plannedCollaboratorName: row.planned_collaborator_name,
    plannedTeamId: row.planned_team_id,
    plannedTeamName: row.planned_team_name,
    status: row.status,
    sourceKind: row.source_kind,
    originWorkPlanItemId: row.origin_work_plan_item_id,
    syncStatus: row.sync_status,
    reviewRequired: review.reviewRequired,
    reviewReasons: review.reviewReasons,
    cancellationReason: row.cancellation_reason,
    notes: row.notes,
    realizedMinutes: row.realized_minutes,
    activityOperationalStatus: row.activity_operational_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

async function buildGetResponse(
  pool: pg.Pool,
  plan: ConveyorOperationalPlanRow,
): Promise<ConveyorOperationalPlanGetApi> {
  const { dailyCapacityMinutes } = await serviceResolveDefaultOperationalDailyCapacity(pool)
  const items = await listEnrichedItemsForPlan(pool, plan.id)
  const activityIds = [...new Set(items.map((i) => i.activity_node_id))]
  const teamIdsByActivity = await loadStepTeamIdsByActivityIds(pool, plan.conveyor_id, activityIds)
  return {
    plan: mapPlanRowToApi(plan),
    items: items.map((row) =>
      mapPlanItemEnrichedRowToApi(
        row,
        teamIdsByActivity.get(row.activity_node_id) ?? [],
        dailyCapacityMinutes,
      ),
    ),
    dailyCapacityMinutes,
  }
}

function mergePatchItemState(
  current: PlanItemPatchRow,
  body: PatchConveyorOperationalPlanItemBody,
): {
  plannedDate: string | null
  plannedOrder: number
  plannedMinutes: number | null
  plannedCollaboratorId: string | null
  plannedTeamId: string | null
  notes: string | null
  status: PlanItemPatchRow['status']
} {
  return {
    plannedDate: body.plannedDate !== undefined ? body.plannedDate : current.planned_date,
    plannedOrder: body.plannedOrder !== undefined ? body.plannedOrder : current.planned_order,
    plannedMinutes:
      body.plannedMinutes !== undefined ? body.plannedMinutes : current.planned_minutes,
    plannedCollaboratorId:
      body.plannedCollaboratorId !== undefined
        ? body.plannedCollaboratorId
        : current.planned_collaborator_id,
    plannedTeamId:
      body.plannedTeamId !== undefined ? body.plannedTeamId : current.planned_team_id,
    notes: body.notes !== undefined ? body.notes : current.notes,
    status: resolvePatchedItemStatus(current.status, body),
  }
}

function resolvePatchedItemStatus(
  current: PlanItemPatchRow['status'],
  body: PatchConveyorOperationalPlanItemBody,
): PlanItemPatchRow['status'] {
  if (body.status === 'CANCELLED') return 'CANCELLED'
  if (
    current === 'CANCELLED' &&
    (body.status === 'PLANNED' || body.status === 'NEEDS_REVIEW')
  ) {
    return 'PLANNED'
  }
  return current
}

function assertConveyorAllowsPlan(conveyorOperationalStatus: string): void {
  if (!ALLOWED_CONVEYOR_STATUSES_FOR_PLAN.has(conveyorOperationalStatus)) {
    throw new AppError(
      'Plano operacional só pode ser criado para esteiras prontas para liberar ou em produção.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
}

async function getConveyorOrThrow(pool: pg.Pool, conveyorId: string) {
  const conveyor = await findConveyorById(pool, conveyorId)
  if (!conveyor) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }
  return conveyor
}

async function getPlanForConveyorOrThrow(
  pool: pg.Pool,
  conveyorId: string,
  planId: string,
): Promise<ConveyorOperationalPlanRow> {
  const plan = await findPlanById(pool, planId)
  if (!plan || plan.conveyor_id !== conveyorId) {
    throw new AppError('Plano operacional não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return plan
}

function assertPlanDraft(plan: ConveyorOperationalPlanRow): void {
  if (plan.status !== 'DRAFT') {
    throw new AppError(
      'Alterações permitidas apenas em plano com status DRAFT.',
      409,
      ErrorCodes.INVALID_STATUS_TRANSITION,
    )
  }
}

async function validateStepForItem(
  pool: pg.Pool,
  conveyorId: string,
  activityNodeId: string,
): Promise<{ plannedMinutes: number | null; defaultResponsibleId: string | null }> {
  const step = await loadStepForPlanItem(pool, conveyorId, activityNodeId)
  if (!step) {
    throw new AppError(
      'Atividade não encontrada para a esteira indicada.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  if (step.node_type !== 'STEP') {
    throw new AppError('Somente atividades (STEP) podem compor o plano.', 400, ErrorCodes.VALIDATION_ERROR)
  }
  if (!step.is_active) {
    throw new AppError('Atividade inativa não pode compor o plano.', 400, ErrorCodes.VALIDATION_ERROR)
  }
  return {
    plannedMinutes: step.planned_minutes,
    defaultResponsibleId: step.default_responsible_id,
  }
}

export async function serviceGetConveyorOperationalPlan(
  pool: pg.Pool,
  conveyorId: string,
): Promise<ConveyorOperationalPlanGetApi | null> {
  await getConveyorOrThrow(pool, conveyorId)
  const plan = await findActivePlanByConveyorId(pool, conveyorId)
  if (!plan) return null
  return buildGetResponse(pool, plan)
}

export async function serviceCreateConveyorOperationalPlan(
  pool: pg.Pool,
  conveyorId: string,
  body: CreateConveyorOperationalPlanBody,
): Promise<ConveyorOperationalPlanGetApi> {
  const conveyor = await getConveyorOrThrow(pool, conveyorId)
  assertConveyorAllowsPlan(conveyor.operational_status)

  const existing = await findActivePlanByConveyorId(pool, conveyorId)
  if (existing) {
    throw new AppError(
      'Já existe um plano operacional ativo para esta esteira.',
      409,
      ErrorCodes.CONVEYOR_OPERATIONAL_PLAN_ALREADY_EXISTS,
    )
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const planId = await insertPlan(client, {
      conveyorId,
      plannedStartDate: body.plannedStartDate ?? null,
      plannedEndDate: body.plannedEndDate ?? null,
      notes: body.notes ?? null,
    })
    await client.query('COMMIT')
    const plan = await findPlanById(pool, planId)
    if (!plan) {
      throw new AppError('Falha ao criar plano operacional.', 500, ErrorCodes.INTERNAL)
    }
    const { dailyCapacityMinutes } = await serviceResolveDefaultOperationalDailyCapacity(pool)
    return { plan: mapPlanRowToApi(plan), items: [], dailyCapacityMinutes }
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export async function serviceCreateConveyorOperationalPlanItem(
  pool: pg.Pool,
  conveyorId: string,
  planId: string,
  body: CreateConveyorOperationalPlanItemBody,
): Promise<ConveyorOperationalPlanGetApi> {
  const plan = await getPlanForConveyorOrThrow(pool, conveyorId, planId)
  assertPlanDraft(plan)

  const stepDefaults = await validateStepForItem(pool, conveyorId, body.activityNodeId)

  if (await existsPlanItemForActivity(pool, planId, body.activityNodeId)) {
    throw new AppError(
      'Esta atividade já está no plano operacional.',
      409,
      ErrorCodes.CONFLICT,
    )
  }

  const plannedMinutes =
    body.plannedMinutes !== undefined
      ? body.plannedMinutes
      : stepDefaults.plannedMinutes

  const plannedCollaboratorId =
    body.plannedCollaboratorId !== undefined
      ? body.plannedCollaboratorId
      : stepDefaults.defaultResponsibleId

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await insertPlanItem(client, {
      planId,
      conveyorId,
      activityNodeId: body.activityNodeId,
      plannedDate: body.plannedDate ?? null,
      plannedOrder: body.plannedOrder ?? 0,
      plannedMinutes,
      plannedCollaboratorId,
      plannedTeamId: body.plannedTeamId ?? null,
      notes: body.notes ?? null,
    })
    await touchPlanUpdatedAt(client, planId)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  const updated = await findPlanById(pool, planId)
  if (!updated) {
    throw new AppError('Plano não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return buildGetResponse(pool, updated)
}

export async function servicePatchConveyorOperationalPlanItem(
  pool: pg.Pool,
  conveyorId: string,
  planId: string,
  itemId: string,
  body: PatchConveyorOperationalPlanItemBody,
): Promise<ConveyorOperationalPlanGetApi> {
  const plan = await getPlanForConveyorOrThrow(pool, conveyorId, planId)
  assertPlanDraft(plan)

  const item = await findPlanItemForPatch(pool, itemId)
  if (!item || item.plan_id !== planId || item.conveyor_id !== conveyorId) {
    throw new AppError('Item do plano não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }

  const merged = mergePatchItemState(item, body)
  const teamIdsByActivity = await loadStepTeamIdsByActivityIds(pool, conveyorId, [
    item.activity_node_id,
  ])
  const stepTeamIds = teamIdsByActivity.get(item.activity_node_id) ?? []

  const { dailyCapacityMinutes } = await serviceResolveDefaultOperationalDailyCapacity(pool)

  let reviewPatch: { reviewRequired: boolean; status: typeof item.status } | undefined
  if (merged.status !== 'CANCELLED') {
    const review = deriveConveyorPlanItemReview({
      plannedMinutes: merged.plannedMinutes,
      plannedDate: merged.plannedDate,
      plannedCollaboratorId: merged.plannedCollaboratorId,
      plannedTeamId: merged.plannedTeamId,
      stepTeamIds,
      dailyCapacityMinutes,
    })
    reviewPatch = {
      reviewRequired: review.reviewRequired,
      status: review.status,
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await updatePlanItem(client, itemId, {
      plannedDate: body.plannedDate,
      plannedOrder: body.plannedOrder,
      plannedMinutes: body.plannedMinutes,
      plannedCollaboratorId: body.plannedCollaboratorId,
      plannedTeamId: body.plannedTeamId,
      notes: body.notes,
      ...(merged.status === 'CANCELLED' ? { status: 'CANCELLED' as const } : {}),
      ...(reviewPatch ?? {}),
    })
    await touchPlanUpdatedAt(client, planId)
    await refreshConveyorOperationalPlanSyncStatus(client, planId)
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  const updated = await findPlanById(pool, planId)
  if (!updated) {
    throw new AppError('Plano não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return buildGetResponse(pool, updated)
}

export async function serviceApproveConveyorOperationalPlan(
  pool: pg.Pool,
  conveyorId: string,
  planId: string,
  actorUserId: string,
): Promise<ConveyorOperationalPlanGetApi> {
  const plan = await getPlanForConveyorOrThrow(pool, conveyorId, planId)
  if (plan.status !== 'DRAFT') {
    throw new AppError(
      'Somente planos em rascunho podem ser aprovados.',
      409,
      ErrorCodes.INVALID_STATUS_TRANSITION,
    )
  }

  const activeCount = await countActivePlanItems(pool, planId)
  if (activeCount < 1) {
    throw new AppError(
      'Adicione ao menos uma atividade ativa antes de aprovar o plano.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const { dailyCapacityMinutes } = await serviceResolveDefaultOperationalDailyCapacity(pool)
  const planItems = await listEnrichedItemsForPlan(pool, planId)
  const activityIds = [...new Set(planItems.map((i) => i.activity_node_id))]
  const teamIdsByActivity = await loadStepTeamIdsByActivityIds(pool, conveyorId, activityIds)
  const hasReviewItems = planItems.some((row) => {
    if (row.status === 'CANCELLED') return false
    return deriveConveyorPlanItemReview({
      plannedMinutes: row.planned_minutes,
      plannedDate: row.planned_date,
      plannedCollaboratorId: row.planned_collaborator_id,
      plannedTeamId: row.planned_team_id,
      stepTeamIds: teamIdsByActivity.get(row.activity_node_id) ?? [],
      dailyCapacityMinutes,
    }).reviewRequired
  })
  if (hasReviewItems) {
    throw new AppError(
      'Existem itens que precisam revisão antes de aprovar o plano.',
      422,
      ErrorCodes.CONVEYOR_OPERATIONAL_PLAN_ITEMS_NEED_REVIEW,
    )
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const ok = await approvePlan(client, planId, actorUserId)
    if (!ok) {
      throw new AppError(
        'Não foi possível aprovar o plano operacional.',
        409,
        ErrorCodes.INVALID_STATUS_TRANSITION,
      )
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  const updated = await findPlanById(pool, planId)
  if (!updated) {
    throw new AppError('Plano não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return buildGetResponse(pool, updated)
}

export type ConveyorOperationalPlanGenerationMeta = {
  dailyCapacityMinutesUsed: number
  dailyCapacitySource: 'OPERATIONAL_SETTINGS' | 'FALLBACK'
}

function parseIsoDateUtc(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function formatIsoDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function resolveEffectivePlannedStartDate(plannedStartDate: string): {
  effectivePlannedStartDate: string
  startDateAdjustedToBusinessDay: boolean
} {
  const requested = parseIsoDateUtc(plannedStartDate)
  const effective = nextBusinessDayOnOrAfter(requested)
  const effectivePlannedStartDate = formatIsoDateUtc(effective)
  return {
    effectivePlannedStartDate,
    startDateAdjustedToBusinessDay: effectivePlannedStartDate !== plannedStartDate,
  }
}

async function assertNoFactoryLinkedItems(pool: pg.Pool, planId: string): Promise<void> {
  const linked = await countFactoryLinkedActivePlanItems(pool, planId)
  if (linked > 0) {
    throw new AppError(
      'Não é possível gerar ou regenerar itens: o plano possui vínculo com o Planejamento da Fábrica.',
      409,
      ErrorCodes.CONVEYOR_OPERATIONAL_PLAN_FACTORY_LINKED,
    )
  }
}

async function buildGenerationPreviewForPlan(
  pool: pg.Pool,
  conveyorId: string,
  planId: string,
  plannedStartDate: string,
): Promise<ConveyorOperationalPlanGenerationPreviewApi> {
  const plan = await getPlanForConveyorOrThrow(pool, conveyorId, planId)
  assertPlanDraft(plan)

  const { dailyCapacityMinutes } = await serviceResolveDefaultOperationalDailyCapacity(pool)
  const { effectivePlannedStartDate, startDateAdjustedToBusinessDay } =
    resolveEffectivePlannedStartDate(plannedStartDate)

  const stepRows = await listConveyorStepsForPlanGeneration(pool, conveyorId)
  const generated = buildConveyorOperationalPlanGeneratedItems({
    steps: stepRows.map((row) => ({
      activityNodeId: row.activity_node_id,
      taskName: row.task_name,
      areaName: row.area_name,
      activityName: row.activity_name,
      optionOrderIndex: row.option_order_index,
      areaOrderIndex: row.area_order_index,
      stepOrderIndex: row.step_order_index,
      plannedMinutes: row.planned_minutes,
      defaultResponsibleId: row.default_responsible_id,
      collaboratorAssigneeIds: row.collaborator_assignee_ids,
      teamAssigneeIds: row.team_assignee_ids,
    })),
    plannedStartDate,
    dailyCapacityMinutes,
  })

  const existingRows = await listEnrichedItemsForPlan(pool, planId)

  return buildConveyorOperationalPlanGenerationPreview({
    existingItems: existingRows.map((row) => ({
      sourceKind: row.source_kind,
      reviewRequired: row.review_required,
      status: row.status,
    })),
    generated,
    plannedStartDate: effectivePlannedStartDate,
    plannedEndDate: generated.plannedEndDate,
    dailyCapacityMinutes,
    startDateAdjustedToBusinessDay,
  })
}

export async function servicePreviewConveyorOperationalPlanGeneration(
  pool: pg.Pool,
  conveyorId: string,
  planId: string,
  body: PreviewConveyorOperationalPlanGenerationBody,
): Promise<ConveyorOperationalPlanGenerationPreviewApi> {
  await getConveyorOrThrow(pool, conveyorId)
  return buildGenerationPreviewForPlan(pool, conveyorId, planId, body.plannedStartDate)
}

export async function serviceGenerateConveyorOperationalPlanItems(
  pool: pg.Pool,
  conveyorId: string,
  planId: string,
  body: GenerateConveyorOperationalPlanItemsBody,
  actorUserId: string,
): Promise<{
  response: ConveyorOperationalPlanGetApi
  generationMeta: ConveyorOperationalPlanGenerationMeta
}> {
  const plan = await getPlanForConveyorOrThrow(pool, conveyorId, planId)
  assertPlanDraft(plan)
  await assertNoFactoryLinkedItems(pool, planId)

  const activeCount = await countActivePlanItems(pool, planId)
  if (activeCount > 0 && !body.overwrite) {
    const preview = await buildGenerationPreviewForPlan(
      pool,
      conveyorId,
      planId,
      body.plannedStartDate,
    )
    throw new AppError(
      'O plano já possui itens. Envie overwrite=true para substituir a geração atual.',
      409,
      ErrorCodes.CONVEYOR_OPERATIONAL_PLAN_ITEMS_EXIST,
      preview,
    )
  }

  const { dailyCapacityMinutes, source: dailyCapacitySource } =
    await serviceResolveDefaultOperationalDailyCapacity(pool)

  const stepRows = await listConveyorStepsForPlanGeneration(pool, conveyorId)
  const generated = buildConveyorOperationalPlanGeneratedItems({
    steps: stepRows.map((row) => ({
      activityNodeId: row.activity_node_id,
      taskName: row.task_name,
      areaName: row.area_name,
      activityName: row.activity_name,
      optionOrderIndex: row.option_order_index,
      areaOrderIndex: row.area_order_index,
      stepOrderIndex: row.step_order_index,
      plannedMinutes: row.planned_minutes,
      defaultResponsibleId: row.default_responsible_id,
      collaboratorAssigneeIds: row.collaborator_assignee_ids,
      teamAssigneeIds: row.team_assignee_ids,
    })),
    plannedStartDate: body.plannedStartDate,
    dailyCapacityMinutes,
  })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    if (body.overwrite && activeCount > 0) {
      await softDeleteActivePlanItemsForPlan(client, planId)
    }
    for (const item of generated.items) {
      await insertGeneratedPlanItem(client, {
        planId,
        conveyorId,
        activityNodeId: item.activityNodeId,
        plannedDate: item.plannedDate,
        plannedOrder: item.plannedOrder,
        plannedMinutes: item.plannedMinutes,
        plannedCollaboratorId: item.plannedCollaboratorId,
        plannedTeamId: item.plannedTeamId,
        status: item.status,
        reviewRequired: item.reviewRequired,
      })
    }
    await updatePlanAfterGeneration(client, planId, {
      plannedStartDate: body.plannedStartDate,
      plannedEndDate: generated.plannedEndDate,
      generatedByUserId: actorUserId,
    })
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  const updated = await findPlanById(pool, planId)
  if (!updated) {
    throw new AppError('Plano não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return {
    response: await buildGetResponse(pool, updated),
    generationMeta: {
      dailyCapacityMinutesUsed: dailyCapacityMinutes,
      dailyCapacitySource,
    },
  }
}

export async function serviceSendConveyorOperationalPlanToFactory(
  pool: pg.Pool,
  conveyorId: string,
  planId: string,
): Promise<ConveyorOperationalPlanGetApi> {
  const plan = await getPlanForConveyorOrThrow(pool, conveyorId, planId)
  if (plan.status !== 'APPROVED') {
    throw new AppError(
      'Somente planos aprovados podem ser enviados para o planejamento da fábrica.',
      409,
      ErrorCodes.INVALID_STATUS_TRANSITION,
    )
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const ok = await sendPlanToFactory(client, planId)
    if (!ok) {
      throw new AppError(
        'Não foi possível enviar o plano para o planejamento da fábrica.',
        409,
        ErrorCodes.INVALID_STATUS_TRANSITION,
      )
    }
    await client.query('COMMIT')
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }

  const updated = await findPlanById(pool, planId)
  if (!updated) {
    throw new AppError('Plano não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return buildGetResponse(pool, updated)
}
