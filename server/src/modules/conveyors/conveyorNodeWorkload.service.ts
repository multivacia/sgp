import type pg from 'pg'
import { getOperationalBucketForConveyor } from '../../shared/operationalBucket.js'
import { findConveyorById } from './conveyors.repository.js'
import type { ConveyorNodeWorkloadApi } from './conveyorNodeWorkload.dto.js'
import {
  listStepHierarchyForConveyor,
  sumRealizedMinutesByStepForConveyor,
} from './conveyorNodeWorkload.repository.js'

const NOTES =
  'Pendência de tempo compara o previsto estrutural do STEP com minutos apontados acumulados na base. Não identifica causa raiz. O indicador de pressão de atraso refere-se à esteira (bucket operacional), não ao STEP.'

function plannedNum(p: number | null | undefined): number {
  if (p == null || Number.isNaN(p)) return 0
  return Math.max(0, p)
}

function pendingMinutes(
  planned: number | null | undefined,
  realized: number,
): number {
  return Math.max(0, plannedNum(planned) - Math.max(0, realized))
}

function sortSteps<T extends { pendingMinutes: number; plannedMinutes: number | null }>(
  rows: T[],
): T[] {
  return [...rows].sort((a, b) => {
    if (b.pendingMinutes !== a.pendingMinutes) {
      return b.pendingMinutes - a.pendingMinutes
    }
    return plannedNum(b.plannedMinutes) - plannedNum(a.plannedMinutes)
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
    const planned = h.planned_minutes
    return {
      optionId: h.option_id,
      optionName: h.option_name,
      areaId: h.area_id,
      areaName: h.area_name,
      stepId: h.step_id,
      stepName: h.step_name,
      plannedMinutes: planned,
      realizedMinutes: realized,
      pendingMinutes: pendingMinutes(planned, realized),
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
    const p = plannedNum(s.plannedMinutes)
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
