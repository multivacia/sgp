import type pg from 'pg'
import type { OperationalBucket } from '../../shared/operationalBucket.js'
import { computeCoberturaTempo } from '../../shared/coberturaTempo.js'
import {
  resolveOperationalPeriod,
  type OperationalPeriodPreset,
} from '../../shared/operationalPeriod.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { serviceListActivitiesForCollaborator } from '../my-activities/my-activities.service.js'
import type { OperationalJourneyApi } from './operational-journey.dto.js'
import {
  findCollaboratorBrief,
  listTimeEntriesForCollaboratorInPeriod,
  sumRealizedMinutesInPeriodForCollaborator,
  sumRealizedMinutesTotalForCollaborator,
} from './operational-journey.repository.js'
import type { OperationalJourneyQuery } from './operational-journey.schemas.js'

const COBERTURA_FORMULA =
  'realizado_minutos_acumulados_nos_steps_alocados / soma_planned_minutes_nos_steps_alocados (escopo fechado; null se previsto ≤ 0)'

const MAX_PENDENCIAS = 48

function emptyBucketCounts(): Record<OperationalBucket, number> {
  return {
    em_atraso: 0,
    em_revisao: 0,
    em_andamento: 0,
    no_backlog: 0,
    concluidas: 0,
  }
}

function parseIsoDate(value: string, field: string): Date {
  const d = new Date(value)
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

export async function serviceGetOperationalJourney(
  pool: pg.Pool,
  args: {
    collaboratorId: string
    query: OperationalJourneyQuery
  },
): Promise<OperationalJourneyApi> {
  const brief = await findCollaboratorBrief(pool, args.collaboratorId)
  if (!brief) {
    throw new AppError('Colaborador não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }

  const { from, to, preset } = resolveJourneyPeriod(args.query)

  const conveyorId = args.query.conveyorId ?? null
  const limit = args.query.limit

  const assignments = await serviceListActivitiesForCollaborator(pool, args.collaboratorId, {
    conveyorId,
  })

  const byBucket = emptyBucketCounts()
  for (const a of assignments) {
    byBucket[a.operationalBucket]++
  }

  let plannedSum = 0
  let realizadoAcumuladoEscopo = 0
  for (const a of assignments) {
    plannedSum += a.plannedMinutes ?? 0
    realizadoAcumuladoEscopo += a.realizedMinutes ?? 0
  }

  const cobertura = computeCoberturaTempo(realizadoAcumuladoEscopo, plannedSum)

  const [realizedInPeriod, realizedTotal, rawEntries] = await Promise.all([
    sumRealizedMinutesInPeriodForCollaborator(pool, {
      collaboratorId: args.collaboratorId,
      from,
      to,
      conveyorId,
    }),
    sumRealizedMinutesTotalForCollaborator(pool, args.collaboratorId, conveyorId),
    listTimeEntriesForCollaboratorInPeriod(pool, {
      collaboratorId: args.collaboratorId,
      from,
      to,
      conveyorId,
      limit,
    }),
  ])

  const assignmentsOpen = assignments.filter((a) => a.operationalBucket !== 'concluidas')
  const assignmentsAtRisk = assignments.filter((a) => a.operationalBucket === 'em_atraso')

  const pendenciaItems: OperationalJourneyApi['signals']['pendenciaTempo']['items'] = []
  for (const a of assignmentsOpen) {
    const p = a.plannedMinutes ?? 0
    const r = a.realizedMinutes ?? 0
    if (p > r) {
      pendenciaItems.push({
        assigneeId: a.assigneeId,
        conveyorId: a.conveyorId,
        conveyorName: a.conveyorName,
        stepNodeId: a.stepNodeId,
        stepName: a.stepName,
        areaName: a.areaName,
        optionName: a.optionName,
        plannedMinutes: a.plannedMinutes,
        realizedMinutes: a.realizedMinutes,
        gapMinutes: p - r,
      })
    }
  }
  pendenciaItems.sort((x, y) => y.gapMinutes - x.gapMinutes)
  const pendenciaSliced = pendenciaItems.slice(0, MAX_PENDENCIAS)

  const recentTimeEntries = rawEntries.map((r) => ({
    id: r.id,
    conveyorId: r.conveyor_id,
    conveyorName: r.conveyor_name,
    stepNodeId: r.conveyor_node_id,
    stepName: r.step_name,
    minutes: r.minutes,
    entryAt: r.entry_at.toISOString(),
    notes: r.notes,
  }))

  const pressaoAtraso = byBucket.em_atraso

  return {
    meta: {
      semanticsVersion: '1.5',
    },
    collaborator: {
      id: brief.id,
      fullName: brief.full_name,
    },
    period: {
      from: from.toISOString(),
      to: to.toISOString(),
    },
    query: {
      limit,
      conveyorId,
      periodPreset: preset,
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
