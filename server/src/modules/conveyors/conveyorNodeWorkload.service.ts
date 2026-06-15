import type pg from 'pg'
import { getOperationalBucketForConveyor } from '../../shared/operationalBucket.js'
import { resolveActivityPlannedTotalMinutes } from '../../shared/activityOperationalQuantity.js'
import { findConveyorById } from './conveyors.repository.js'
import type { ConveyorNodeWorkloadApi } from './conveyorNodeWorkload.dto.js'
import {
  listStepHierarchyForConveyor,
  sumRealizedMinutesByStepForConveyor,
} from './conveyorNodeWorkload.repository.js'

const NOTES =
  'Pendência de tempo compara o previsto estrutural do STEP com minutos apontados acumulados na base. Não identifica causa raiz. O indicador de pressão de atraso refere-se à esteira (bucket operacional), não ao STEP.'

function plannedTotalNum(
  unitMinutes: number | null | undefined,
  plannedQuantity: number,
): number {
  return resolveActivityPlannedTotalMinutes(unitMinutes, plannedQuantity)
}

function pendingMinutes(plannedTotal: number, realized: number): number {
  return Math.max(0, plannedTotal - Math.max(0, realized))
}

function sortSteps<
  T extends { pendingMinutes: number; plannedTotalMinutes?: number; plannedMinutes: number | null },
>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    if (b.pendingMinutes !== a.pendingMinutes) {
      return b.pendingMinutes - a.pendingMinutes
    }
    return (b.plannedTotalMinutes ?? 0) - (a.plannedTotalMinutes ?? 0)
  })
}

export async function serviceGetConveyorNodeWorkload(
  pool: pg.Pool,
  conveyorId: string,
): Promise<ConveyorNodeWorkloadApi | null> {
  const conv = await findConveyorById(pool, conveyorId)
  if (!conv) return null

  const [hierarchy, realizedByStep] = await Promise.all([
    listStepHierarchyForConveyor(pool, conveyorId),
    sumRealizedMinutesByStepForConveyor(pool, conveyorId),
  ])

  const stepRowsRaw = hierarchy.map((h) => {
    const realized = realizedByStep.get(h.step_id) ?? 0
    const plannedUnit = h.planned_minutes
    const plannedTotal = plannedTotalNum(plannedUnit, h.planned_quantity)
    const op = (h.operational_status ?? 'PENDING').trim() || 'PENDING'
    const isDone = op === 'COMPLETED'
    return {
      optionId: h.option_id,
      optionName: h.option_name,
      areaId: h.area_id,
      areaName: h.area_name,
      stepId: h.step_id,
      stepName: h.step_name,
      operationalStatus: op,
      isOperationallyCompleted: isDone,
      plannedMinutes: plannedUnit,
      plannedQuantity: h.planned_quantity,
      plannedTotalMinutes: plannedTotal,
      realizedMinutes: realized,
      pendingMinutes: isDone ? 0 : pendingMinutes(plannedTotal, realized),
    }
  })

  const steps = sortSteps(stepRowsRaw)

  /** Chave: optionId + areaId — rollup só entre STEPs da mesma área sob a mesma opção. */
  const areaMap = new Map<
    string,
    {
      optionId: string
      optionName: string
      areaId: string
      areaName: string
      plannedMinutesSum: number
      realizedMinutesSum: number
      pendingMinutesSum: number
    }
  >()

  for (const s of stepRowsRaw) {
    const key = `${s.optionId}\0${s.areaId}`
    const cur = areaMap.get(key)
    const p = plannedTotalNum(s.plannedMinutes, s.plannedQuantity)
    const r = s.realizedMinutes
    const pend = s.pendingMinutes
    if (!cur) {
      areaMap.set(key, {
        optionId: s.optionId,
        optionName: s.optionName,
        areaId: s.areaId,
        areaName: s.areaName,
        plannedMinutesSum: p,
        realizedMinutesSum: r,
        pendingMinutesSum: pend,
      })
    } else {
      cur.plannedMinutesSum += p
      cur.realizedMinutesSum += r
      cur.pendingMinutesSum += pend
    }
  }

  const areas = [...areaMap.values()].sort(
    (a, b) => b.pendingMinutesSum - a.pendingMinutesSum,
  )

  const bucket = getOperationalBucketForConveyor(
    conv.operational_status,
    conv.estimated_deadline,
  )

  return {
    semanticsVersion: '1.5',
    conveyorId: conv.id,
    conveyor: {
      operationalBucket: bucket,
      isOverdueContext: bucket === 'em_atraso',
    },
    steps,
    areas,
    notes: NOTES,
  }
}

export async function serviceGetConveyorPendingMinutes(
  pool: pg.Pool,
  conveyorId: string,
): Promise<number | null> {
  const data = await serviceGetConveyorNodeWorkload(pool, conveyorId)
  if (!data) return null
  return data.steps.reduce((sum, step) => sum + Math.max(0, step.pendingMinutes), 0)
}
