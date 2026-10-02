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
  listCollaboratorBriefs,
  listTopExtraTimeEntryDescriptionsInPeriodForCollaborators,
  listTimeEntriesForCollaboratorsInPeriod,
  summarizeExtraTimeEntriesInPeriodForCollaborators,
  sumRealizedMinutesInPeriodForCollaborators,
  sumRealizedMinutesTotalForCollaborators,
} from './operational-journey.repository.js'
import type { OperationalJourneyQuery } from './operational-journey.schemas.js'

const COBERTURA_FORMULA =
  'realizado_minutos_acumulados_nos_steps_alocados / previsto_estrutural_unitario_x_quantidade (escopo fechado; STEP compartilhado conta uma vez; null se previsto ≤ 0)'

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
 * Previsto estrutural do conjunto de STEPs alocados — cada STEP entra uma única vez,
 * mesmo quando vários colaboradores do escopo estão alocados nele (senão o denominador
 * da cobertura de tempo seria inflado e a cobertura, subestimada).
 *
 * Com 1 colaborador o resultado é idêntico a {@link sumJourneyStructuralPlannedMinutes}:
 * o índice único (STEP, colaborador) impede alocação repetida no mesmo STEP.
 */
export function sumJourneyStructuralPlannedMinutesByStep(
  activities: Array<{
    stepNodeId: string
    plannedMinutes: number | null
    plannedQuantity?: number | null
    plannedTotalMinutes?: number | null
  }>,
): number {
  const perStep = new Map<string, number>()
  for (const activity of activities) {
    if (perStep.has(activity.stepNodeId)) continue
    perStep.set(activity.stepNodeId, structuralPlannedMinutesForJourney(activity))
  }
  let sum = 0
  for (const minutes of perStep.values()) sum += minutes
  return sum
}

/**
 * Minutos apontados acumulados no escopo. Cada alocação traz o realizado do próprio
 * colaborador naquele STEP, então a soma por alocação não duplica apontamentos.
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
 * Pendência de tempo por alocação: previsto estrutural do STEP acima do acumulado
 * apontado por aquele colaborador. Um STEP compartilhado gera uma pendência por
 * colaborador (registros distintos), cada uma identificada pelo seu colaborador.
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
  const plannedSum = sumJourneyStructuralPlannedMinutesByStep(assignments)

  const cobertura = computeCoberturaTempo(realizadoAcumuladoEscopo, plannedSum)

  const [realizedInPeriod, realizedTotal, rawEntries, extraSummary, extraTopDescriptions] =
    await Promise.all([
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
  }
}
