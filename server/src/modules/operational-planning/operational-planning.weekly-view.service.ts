import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import {
  findDraftOperationalWorkPlanByWeekStart,
  findPublishedOperationalWorkPlanByWeekStart,
  listItemsForWorkPlanWeeklyView,
  type PlanItemWeeklyViewRow,
} from './operational-planning.repository.js'
import {
  buildOperationalPlanningWeeklyViewExportFilename,
  buildOperationalPlanningWeeklyViewExportWorkbookBuffer,
  type OperationalPlanningWeeklyViewExportMeta,
  type OperationalPlanningWeeklyViewExportRow,
  type OperationalPlanningWeeklyViewExportSituation,
} from './operational-planning.weekly-view.export.js'
import { fridayAfterMonday, mondayOfWeekContaining } from './operational-planning.week.js'

/**
 * Situação do plano (RASCUNHO / PUBLICADO / REVISÃO NÃO PUBLICADA) — mesma regra da primeira
 * exportação, porém DUPLICADA aqui deliberadamente: em `operational-planning.service.ts` essa
 * lógica está embutida inline (não extraída em função pura reutilizável), e o arquivo não pode
 * ser tocado. Ver spec da tarefa: isolamento preferível a acoplamento.
 */
export function resolveWeeklyViewSituation(
  hasDraft: boolean,
  hasPublished: boolean,
): OperationalPlanningWeeklyViewExportSituation {
  if (hasDraft && hasPublished) return 'REVISAO_NAO_PUBLICADA'
  if (hasDraft) return 'RASCUNHO'
  return 'PUBLICADO'
}

function mapRowToExportRow(row: PlanItemWeeklyViewRow): OperationalPlanningWeeklyViewExportRow {
  return {
    id: row.id,
    collaboratorId: row.assigned_collaborator_id,
    collaboratorName: row.assigned_collaborator_name,
    plannedDate: row.planned_date,
    plannedOrder: row.planned_order,
    plannedMinutes: row.planned_minutes,
    conveyorTitle: row.conveyor_title,
    activityTitle: row.activity_title,
    notes: row.notes,
    realizedMinutes: row.realized_minutes,
  }
}

/**
 * Export Excel (1 aba "Visão semanal") da semana salva (draft ?? published) — ignora filtros
 * visuais. Somente leitura: nenhuma escrita, nenhuma transação, nenhuma alteração de estado
 * do plano. Inclui tempo apontado acumulado por STEP (`realized_minutes`).
 */
export async function serviceExportOperationalPlanningWeeklyViewXlsx(
  pool: pg.Pool,
  weekStartRaw: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const weekStartDate = mondayOfWeekContaining(weekStartRaw)
  const weekEndDate = fridayAfterMonday(weekStartDate)

  const [draftRow, publishedRow] = await Promise.all([
    findDraftOperationalWorkPlanByWeekStart(pool, weekStartDate),
    findPublishedOperationalWorkPlanByWeekStart(pool, weekStartDate),
  ])
  const editableRow = draftRow ?? publishedRow
  if (!editableRow) {
    throw new AppError('Nenhum plano encontrado para esta semana.', 404, ErrorCodes.NOT_FOUND)
  }

  const rows = await listItemsForWorkPlanWeeklyView(pool, editableRow.id)
  if (rows.length === 0) {
    throw new AppError(
      'Não há atividades planejadas nesta semana para exportar.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const situation = resolveWeeklyViewSituation(Boolean(draftRow), Boolean(publishedRow))

  const totalPlannedMinutes = rows.reduce(
    (sum, row) => sum + Math.max(0, Number(row.planned_minutes ?? 0) || 0),
    0,
  )
  const collaboratorsWithActivityCount = new Set(
    rows.map((row) => row.assigned_collaborator_id).filter((id): id is string => Boolean(id)),
  ).size

  const meta: OperationalPlanningWeeklyViewExportMeta = {
    weekStartDate,
    weekEndDate,
    situation,
    generatedAt: new Date(),
    totalActivities: rows.length,
    totalPlannedMinutes,
    collaboratorsWithActivityCount,
  }

  const exportRows = rows.map(mapRowToExportRow)
  const buffer = await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({
    meta,
    rows: exportRows,
  })
  const filename = buildOperationalPlanningWeeklyViewExportFilename(
    weekStartDate,
    weekEndDate,
    situation,
  )

  return { buffer, filename }
}
