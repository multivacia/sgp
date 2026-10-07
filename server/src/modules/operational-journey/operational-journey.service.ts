import type pg from 'pg'
import type { OperationalBucket } from '../../shared/operationalBucket.js'
import {
  operationalBucketSortRank,
  parseFlexibleDeadlineToDate,
} from '../../shared/operationalBucket.js'
import { resolveActivityPlannedTotalMinutes } from '../../shared/activityOperationalQuantity.js'
import { computeCoberturaTempo } from '../../shared/coberturaTempo.js'
import {
  resolveOperationalPeriod,
  type OperationalPeriodPreset,
} from '../../shared/operationalPeriod.js'
import { AppError } from '../../shared/errors/AppError.js'
import {
  isDateOnlyString,
  operationalDateOf,
  operationalDayEnd,
  operationalDayStart,
} from '../../shared/operationalWorkDate.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { serviceListActivitiesForCollaborator } from '../my-activities/my-activities.service.js'
import type {
  OperationalJourneyApi,
  OperationalJourneyAssignmentApi,
  OperationalJourneyCollaboratorApi,
} from './operational-journey.dto.js'
import {
  buildOperationalJourneyExportFilename,
  buildOperationalJourneyExportWorkbookBuffer,
  type OperationalJourneyExportCollaborator,
} from './operational-journey.export.js'
import {
  findCollaboratorBrief,
  findConveyorBrief,
  listAllTimeEntriesForCollaboratorInPeriod,
  listCollaboratorBriefs,
  listExtraTimeEntriesInPeriodForCollaborator,
  listExtraTimeEntriesInPeriodForCollaborators,
  listTopExtraTimeEntryDescriptionsInPeriodForCollaborators,
  listTimeEntriesForCollaboratorsInPeriod,
  summarizeExtraTimeEntriesInPeriodForCollaborators,
  sumRealizedMinutesInPeriodForCollaborators,
  sumRealizedMinutesTotalForCollaborators,
} from './operational-journey.repository.js'
import type { OperationalJourneyQuery } from './operational-journey.schemas.js'
import { resolveTimeEntryJustificationText } from '../../shared/timeEntryJustificationDisplay.js'

const COBERTURA_FORMULA =
  'realizado_minutos_acumulados_nos_steps_alocados / previsto_estrutural_unitario_x_quantidade (escopo fechado; previsto conta uma vez por alocação colaborador × STEP; null se previsto ≤ 0)'

/** Previsto estrutural da atividade: total já calculado, senão unitário × quantidade. */
export function structuralPlannedMinutesForJourney(activity: {
  plannedMinutes: number | null
  plannedQuantity?: number | null
  plannedTotalMinutes?: number | null
}): number {
  if (activity.plannedTotalMinutes != null && Number.isFinite(activity.plannedTotalMinutes)) {
    return Math.max(0, Math.floor(activity.plannedTotalMinutes))
  }
  return resolveActivityPlannedTotalMinutes(activity.plannedMinutes, activity.plannedQuantity)
}

/**
 * Previsto estrutural do escopo: representa a carga dos colaboradores selecionados, então
 * participa uma vez por alocação colaborador × STEP. Dois colaboradores alocados no mesmo
 * STEP de 60 min somam 120 min previstos — par do realizado, que também é por colaborador
 * (cobertura 100% se ambos apontarem 60 min, nunca 200%).
 */
export function sumJourneyStructuralPlannedMinutes(
  activities: Array<{
    plannedMinutes: number | null
    plannedQuantity?: number | null
    plannedTotalMinutes?: number | null
  }>,
): number {
  return activities.reduce((sum, activity) => sum + structuralPlannedMinutesForJourney(activity), 0)
}

/**
 * Minutos apontados acumulados no escopo. Cada alocação traz o realizado do próprio
 * colaborador naquele STEP (mesma granularidade do previsto: colaborador × STEP), então
 * a soma por alocação não duplica apontamentos.
 */
export function sumJourneyRealizedMinutes(
  activities: Array<{ realizedMinutes: number | null }>,
): number {
  return activities.reduce((sum, a) => sum + (a.realizedMinutes ?? 0), 0)
}

export function countJourneyAssignmentsByBucket(
  activities: Array<{ operationalBucket: OperationalBucket }>,
): Record<OperationalBucket, number> {
  const byBucket = emptyBucketCounts()
  for (const a of activities) byBucket[a.operationalBucket]++
  return byBucket
}

/**
 * Ordenação consolidada de alocações de vários colaboradores: bucket operacional →
 * prazo → nome da esteira. Empates mantêm a ordem recebida (ordenação estável), que
 * já é a ordem da matriz por colaborador — logo, com 1 colaborador a lista não muda.
 */
export function sortJourneyAssignments<
  T extends {
    operationalBucket: OperationalBucket
    estimatedDeadline: string | null
    conveyorName: string
  },
>(activities: T[]): T[] {
  return [...activities].sort((a, b) => {
    const br =
      operationalBucketSortRank(a.operationalBucket) -
      operationalBucketSortRank(b.operationalBucket)
    if (br !== 0) return br

    const da = parseFlexibleDeadlineToDate(a.estimatedDeadline)
    const db = parseFlexibleDeadlineToDate(b.estimatedDeadline)
    const ma = da === null ? Number.POSITIVE_INFINITY : da.getTime()
    const mb = db === null ? Number.POSITIVE_INFINITY : db.getTime()
    if (ma !== mb) return ma - mb

    return a.conveyorName
      .trim()
      .toLocaleLowerCase('pt-BR')
      .localeCompare(b.conveyorName.trim().toLocaleLowerCase('pt-BR'), 'pt-BR')
  })
}

const MAX_PENDENCIAS = 48
const MAX_TOP_EXTRA_DESCRIPTIONS = 3

function emptyBucketCounts(): Record<OperationalBucket, number> {
  return {
    em_elaboracao: 0,
    aguardando_planejamento: 0,
    em_planejamento: 0,
    em_execucao: 0,
    em_atraso: 0,
    finalizadas: 0,
    canceladas: 0,
  }
}

/**
 * Pendência de tempo por alocação colaborador × STEP: previsto da alocação acima do
 * acumulado apontado por aquele colaborador. Um STEP compartilhado gera uma pendência
 * por colaborador, cada uma identificada pelo seu colaborador e coerente com a soma
 * do previsto e do realizado do escopo.
 */
export function buildJourneyPendenciaItems(
  openAssignments: OperationalJourneyAssignmentApi[],
): OperationalJourneyApi['signals']['pendenciaTempo']['items'] {
  const items: OperationalJourneyApi['signals']['pendenciaTempo']['items'] = []
  for (const a of openAssignments) {
    const p = structuralPlannedMinutesForJourney(a)
    const r = a.realizedMinutes ?? 0
    if (p > r) {
      items.push({
        assigneeId: a.assigneeId,
        collaboratorId: a.collaboratorId,
        collaboratorName: a.collaboratorName,
        conveyorId: a.conveyorId,
        conveyorName: a.conveyorName,
        stepNodeId: a.stepNodeId,
        stepName: a.stepName,
        areaName: a.areaName,
        optionName: a.optionName,
        plannedMinutes: p,
        realizedMinutes: a.realizedMinutes,
        gapMinutes: p - r,
      })
    }
  }
  items.sort((x, y) => y.gapMinutes - x.gapMinutes)
  return items
}

/**
 * `from`/`to` do intervalo personalizado. Data pura (`YYYY-MM-DD`) é o dia civil de São Paulo:
 * `from` → 00:00 e `to` → 23:59:59.999 (nunca meia-noite UTC).
 */
function parseIsoDate(value: string, field: 'from' | 'to'): Date {
  const d = isDateOnlyString(value)
    ? field === 'from'
      ? operationalDayStart(value.trim())
      : operationalDayEnd(value.trim())
    : new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new AppError(
      `Parâmetro ${field} inválido: use data/hora ISO 8601.`,
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return d
}

function resolveJourneyPeriod(
  q: OperationalJourneyQuery,
): { from: Date; to: Date; preset: OperationalPeriodPreset } {
  const preset = q.periodPreset as OperationalPeriodPreset
  if (preset === 'custom') {
    const from = parseIsoDate(q.from!, 'from')
    const to = parseIsoDate(q.to!, 'to')
    if (from.getTime() > to.getTime()) {
      throw new AppError(
        'Intervalo inválido: `from` deve ser anterior ou igual a `to`.',
        400,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    return resolveOperationalPeriod({
      preset: 'custom',
      customFrom: from,
      customTo: to,
    })
  }

  const r = resolveOperationalPeriod({
    preset,
    now: new Date(),
  })
  return r
}

/** Jornada de um colaborador — escopo de 1, sobre a mesma consolidação. */
export async function serviceGetOperationalJourney(
  pool: pg.Pool,
  args: {
    collaboratorId: string
    query: OperationalJourneyQuery
  },
): Promise<OperationalJourneyApi> {
  return serviceGetOperationalJourneyForCollaborators(pool, {
    collaboratorIds: [args.collaboratorId],
    query: args.query,
  })
}

/**
 * Jornada consolidada de 1..N colaboradores. Valores absolutos (minutos previstos,
 * apontados, contagens) são somados sobre o conjunto; percentuais — cobertura de tempo —
 * são recalculados a partir dos totais consolidados, nunca pela média dos percentuais
 * individuais. Cada alocação e cada apontamento continua identificado pelo colaborador.
 */
export async function serviceGetOperationalJourneyForCollaborators(
  pool: pg.Pool,
  args: {
    collaboratorIds: string[]
    query: OperationalJourneyQuery
  },
): Promise<OperationalJourneyApi> {
  const collaboratorIds = [...new Set(args.collaboratorIds.map((id) => id.trim()).filter(Boolean))]
  if (collaboratorIds.length === 0) {
    throw new AppError(
      'Informe ao menos um colaborador para a jornada.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const briefs = await listCollaboratorBriefs(pool, collaboratorIds)
  const briefById = new Map(briefs.map((b) => [b.id, b]))
  if (collaboratorIds.some((id) => !briefById.has(id))) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  const collaborators: OperationalJourneyCollaboratorApi[] = collaboratorIds.map((id) => ({
    id,
    fullName: briefById.get(id)!.full_name,
  }))

  const { from, to, preset } = resolveJourneyPeriod(args.query)

  const conveyorId = args.query.conveyorId ?? null
  const limit = args.query.limit

  const perCollaborator = await Promise.all(
    collaboratorIds.map((collaboratorId) =>
      serviceListActivitiesForCollaborator(pool, collaboratorId, { conveyorId }),
    ),
  )
  const assignments = sortJourneyAssignments(
    collaborators.flatMap((collaborator, i) =>
      perCollaborator[i]!.map<OperationalJourneyAssignmentApi>((a) => ({
        ...a,
        collaboratorId: collaborator.id,
        collaboratorName: collaborator.fullName,
      })),
    ),
  )

  const byBucket = countJourneyAssignmentsByBucket(assignments)
  const realizadoAcumuladoEscopo = sumJourneyRealizedMinutes(assignments)
  const plannedSum = sumJourneyStructuralPlannedMinutes(assignments)

  const cobertura = computeCoberturaTempo(realizadoAcumuladoEscopo, plannedSum)

  const [
    realizedInPeriod,
    realizedTotal,
    rawEntries,
    extraSummary,
    extraTopDescriptions,
    rawExtraEntries,
  ] = await Promise.all([
    sumRealizedMinutesInPeriodForCollaborators(pool, {
      collaboratorIds,
      from,
      to,
      conveyorId,
    }),
    sumRealizedMinutesTotalForCollaborators(pool, collaboratorIds, conveyorId),
    listTimeEntriesForCollaboratorsInPeriod(pool, {
      collaboratorIds,
      from,
      to,
      conveyorId,
      limit,
    }),
    summarizeExtraTimeEntriesInPeriodForCollaborators(pool, {
      collaboratorIds,
      from,
      to,
    }),
    listTopExtraTimeEntryDescriptionsInPeriodForCollaborators(pool, {
      collaboratorIds,
      from,
      to,
      limit: MAX_TOP_EXTRA_DESCRIPTIONS,
    }),
    listExtraTimeEntriesInPeriodForCollaborators(pool, {
      collaboratorIds,
      from,
      to,
      limit,
    }),
  ])

  const assignmentsOpen = assignments.filter(
    (a) => a.operationalBucket !== 'finalizadas' && a.operationalBucket !== 'canceladas',
  )
  const assignmentsAtRisk = assignments.filter((a) => a.operationalBucket === 'em_atraso')

  const pendenciaItems = buildJourneyPendenciaItems(assignmentsOpen)
  const pendenciaSliced = pendenciaItems.slice(0, MAX_PENDENCIAS)

  const recentTimeEntries = rawEntries.map((r) => ({
    id: r.id,
    collaboratorId: r.collaborator_id,
    collaboratorName: r.collaborator_name,
    conveyorId: r.conveyor_id,
    conveyorName: r.conveyor_name,
    stepNodeId: r.conveyor_node_id,
    stepName: r.step_name,
    minutes: r.minutes,
    entryAt: r.entry_at.toISOString(),
    notes: r.notes,
    entryOrigin: r.entry_origin,
    exceptionJustification: r.exception_justification,
    isOutOfSequence: Boolean(r.is_out_of_sequence),
    outOfSequenceJustification: r.out_of_sequence_justification,
    standardJustificationLabel: r.standard_justification_label?.trim() || null,
    standardJustificationComplement: r.standard_justification_complement?.trim() || null,
  }))

  const recentExtraTimeEntries = rawExtraEntries.map((r) => ({
    id: r.id,
    collaboratorId: r.collaborator_id,
    collaboratorName: r.collaborator_name,
    entryDate: r.entry_date,
    minutes: r.minutes,
    description: r.description,
    notes: r.notes,
    origin: r.origin === 'PRODUCTION' ? ('PRODUCTION' as const) : ('WEB' as const),
  }))

  const pressaoAtraso = byBucket.em_atraso

  return {
    meta: {
      semanticsVersion: '1.5',
    },
    collaborator: {
      id: collaborators[0]!.id,
      fullName: collaborators[0]!.fullName,
    },
    collaborators,
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    query: {
      limit,
      conveyorId,
      periodPreset: preset,
      collaboratorIds,
    },
    load: {
      assignmentCount: assignments.length,
      plannedMinutesOnStepsSum: plannedSum,
    },
    coberturaTempo: {
      ratio: cobertura.ratio,
      previstoMinutosEscopo: cobertura.previstoMinutos,
      realizadoMinutosAcumuladoEscopo: cobertura.realizadoMinutos,
      formula: COBERTURA_FORMULA,
    },
    execution: {
      realizedMinutesInPeriod: realizedInPeriod,
      realizedMinutesTotal: realizedTotal,
    },
    extraTimeEntriesSummary: {
      totalMinutes: extraSummary.totalMinutes,
      entriesCount: extraSummary.entriesCount,
      topDescriptions: extraTopDescriptions,
    },
    risk: {
      byBucket,
      overdueCount: pressaoAtraso,
    },
    signals: {
      pressaoAtrasoAlocacoes: pressaoAtraso,
      pendenciaTempo: {
        count: pendenciaItems.length,
        items: pendenciaSliced,
      },
    },
    assignmentsOpen,
    assignmentsAtRisk,
    recentTimeEntries,
    recentExtraTimeEntries,
  }
}

/**
 * Exportação XLSX da jornada para um ou vários colaboradores.
 * Totais por colaborador vêm de `serviceGetOperationalJourney` (mesma regra da tela);
 * o detalhe lista todos os apontamentos do período (sem o limite do histórico da tela).
 */
export async function serviceExportOperationalJourneyXlsx(
  pool: pg.Pool,
  args: {
    collaboratorIds: string[]
    query: OperationalJourneyQuery
  },
): Promise<{ buffer: Buffer; filename: string }> {
  const conveyorId = args.query.conveyorId ?? null
  const collaborators: OperationalJourneyExportCollaborator[] = []
  let periodFrom: Date | null = null
  let periodTo: Date | null = null

  // Sequencial: cada jornada já dispara consultas em paralelo — evita saturar o pool.
  for (const collaboratorId of args.collaboratorIds) {
    const journey = await serviceGetOperationalJourney(pool, { collaboratorId, query: args.query })
    const from = new Date(journey.period.from)
    const to = new Date(journey.period.to)
    periodFrom ??= from
    periodTo ??= to
    const [brief, entries, extraEntries] = await Promise.all([
      findCollaboratorBrief(pool, collaboratorId),
      listAllTimeEntriesForCollaboratorInPeriod(pool, { collaboratorId, from, to, conveyorId }),
      listExtraTimeEntriesInPeriodForCollaborator(pool, { collaboratorId, from, to }),
    ])
    collaborators.push({
      collaboratorId,
      fullName: journey.collaborator.fullName?.trim() || collaboratorId,
      code: brief?.code ?? null,
      registrationCode: brief?.registration_code ?? null,
      totals: {
        assignmentCount: journey.load.assignmentCount,
        plannedMinutesOnStepsSum: journey.load.plannedMinutesOnStepsSum,
        realizedMinutesInPeriod: journey.execution.realizedMinutesInPeriod,
        realizedMinutesTotal: journey.execution.realizedMinutesTotal,
        coberturaRealizadoMinutos: journey.coberturaTempo.realizadoMinutosAcumuladoEscopo,
        coberturaPrevistoMinutos: journey.coberturaTempo.previstoMinutosEscopo,
        extraMinutesInPeriod: journey.extraTimeEntriesSummary.totalMinutes,
        extraEntriesCount: journey.extraTimeEntriesSummary.entriesCount,
        overdueCount: journey.risk.overdueCount,
        pendenciaTempoCount: journey.signals.pendenciaTempo.count,
      },
      timeEntries: entries.map((e) => ({
        workDate: operationalDateOf(e.entry_at),
        conveyorCode: e.conveyor_code,
        conveyorName: e.conveyor_name,
        optionName: e.option_name,
        areaName: e.area_name,
        stepName: e.step_name,
        minutes: e.minutes,
        executedQuantity: e.executed_quantity,
        entryOrigin: e.entry_origin,
        isOutOfSequence: Boolean(e.is_out_of_sequence),
        justification: resolveTimeEntryJustificationText({
          exceptionJustification: e.exception_justification,
          outOfSequenceJustification: e.out_of_sequence_justification,
          standardJustificationLabel: e.standard_justification_label,
          standardJustificationComplement: e.standard_justification_complement,
        }),
        notes: e.notes,
      })),
      extraEntries: extraEntries.map((e) => ({
        entryDate: e.entry_date,
        description: e.description,
        minutes: e.minutes,
        notes: e.notes,
      })),
    })
  }

  collaborators.sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'))

  const conveyor = conveyorId ? await findConveyorBrief(pool, conveyorId) : null
  const meta = {
    periodFromDate: operationalDateOf(periodFrom ?? new Date()),
    periodToDate: operationalDateOf(periodTo ?? new Date()),
    periodPreset: args.query.periodPreset,
    conveyorFilterLabel: conveyor
      ? [conveyor.code, conveyor.name].filter(Boolean).join(' · ')
      : null,
    generatedAt: new Date(),
  }
  const buffer = await buildOperationalJourneyExportWorkbookBuffer({ meta, collaborators })
  return {
    buffer,
    filename: buildOperationalJourneyExportFilename(meta, collaborators.length),
  }
}
