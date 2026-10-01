import type { MyActivityItem } from '../my-activities/my-activities.types'
import type {
  OperationalJourneyData,
  OperationalJourneyTimeEntry,
  PendenciaTempoItem,
} from './operational-journey.types'

/** Máximo de colaboradores na seleção da jornada gerencial (mesmo limite da exportação). */
export const JOURNEY_MAX_SELECTED_COLLABORATORS = 50

type Bucket = MyActivityItem['operationalBucket']

/**
 * Quadro de totais da jornada. Para um colaborador, espelha 1:1 o payload da API;
 * para vários, soma os valores de cada jornada e recalcula a cobertura sobre as somas
 * (nunca média de percentuais).
 */
export type OperationalJourneyTotals = {
  collaboratorCount: number
  assignmentCount: number
  plannedMinutesOnStepsSum: number
  realizedMinutesInPeriod: number
  realizedMinutesTotal: number
  cobertura: {
    ratio: number | null
    previstoMinutos: number
    realizadoMinutos: number
  }
  extra: {
    totalMinutes: number
    entriesCount: number
    /**
     * Só para um colaborador: a API devolve o top 3 por colaborador, então somar
     * listas parciais geraria um ranking inexato. Vários colaboradores → [].
     */
    topDescriptions: OperationalJourneyData['extraTimeEntriesSummary']['topDescriptions']
  }
  byBucket: Record<Bucket, number>
  pressaoAtrasoAlocacoes: number
  pendenciaTempoCount: number
}

/** Mesma regra de `computeCoberturaTempo` (backend): null quando previsto ≤ 0. */
export function coberturaRatio(realizado: number, previsto: number): number | null {
  if (!Number.isFinite(previsto) || previsto <= 0 || !Number.isFinite(realizado)) return null
  return realizado / previsto
}

function emptyBuckets(): Record<Bucket, number> {
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

export function aggregateOperationalJourneyTotals(
  journeys: readonly OperationalJourneyData[],
): OperationalJourneyTotals {
  const byBucket = emptyBuckets()
  let assignmentCount = 0
  let plannedMinutesOnStepsSum = 0
  let realizedMinutesInPeriod = 0
  let realizedMinutesTotal = 0
  let previsto = 0
  let realizado = 0
  let extraMinutes = 0
  let extraEntries = 0
  let pressao = 0
  let pendencias = 0

  for (const j of journeys) {
    assignmentCount += j.load.assignmentCount
    plannedMinutesOnStepsSum += j.load.plannedMinutesOnStepsSum
    realizedMinutesInPeriod += j.execution.realizedMinutesInPeriod
    realizedMinutesTotal += j.execution.realizedMinutesTotal
    previsto += j.coberturaTempo.previstoMinutosEscopo
    realizado += j.coberturaTempo.realizadoMinutosAcumuladoEscopo
    extraMinutes += j.extraTimeEntriesSummary.totalMinutes
    extraEntries += j.extraTimeEntriesSummary.entriesCount
    pressao += j.signals.pressaoAtrasoAlocacoes
    pendencias += j.signals.pendenciaTempo.count
    for (const [bucket, n] of Object.entries(j.risk.byBucket) as Array<[Bucket, number]>) {
      byBucket[bucket] = (byBucket[bucket] ?? 0) + n
    }
  }

  const single = journeys.length === 1 ? journeys[0] : null
  return {
    collaboratorCount: journeys.length,
    assignmentCount,
    plannedMinutesOnStepsSum,
    realizedMinutesInPeriod,
    realizedMinutesTotal,
    cobertura: {
      // Um colaborador: usa a razão da API sem recalcular (sem divergência de arredondamento).
      ratio: single ? single.coberturaTempo.ratio : coberturaRatio(realizado, previsto),
      previstoMinutos: previsto,
      realizadoMinutos: realizado,
    },
    extra: {
      totalMinutes: extraMinutes,
      entriesCount: extraEntries,
      topDescriptions: single ? single.extraTimeEntriesSummary.topDescriptions : [],
    },
    byBucket,
    pressaoAtrasoAlocacoes: pressao,
    pendenciaTempoCount: pendencias,
  }
}

export type JourneyCollaboratorTag = { collaboratorId: string; collaboratorName: string }

function tagOf(j: OperationalJourneyData): JourneyCollaboratorTag {
  return {
    collaboratorId: j.collaborator.id,
    collaboratorName: j.collaborator.fullName?.trim() || j.collaborator.id,
  }
}

/** Listas de detalhe consolidadas — mesma fonte dos totais, com o colaborador de cada linha. */
export function mergeOperationalJourneyDetails(journeys: readonly OperationalJourneyData[]): {
  assignmentsOpen: Array<JourneyCollaboratorTag & { item: MyActivityItem }>
  assignmentsAtRisk: Array<JourneyCollaboratorTag & { item: MyActivityItem }>
  pendencias: Array<JourneyCollaboratorTag & { item: PendenciaTempoItem }>
  recentTimeEntries: Array<JourneyCollaboratorTag & { item: OperationalJourneyTimeEntry }>
} {
  const assignmentsOpen = journeys.flatMap((j) =>
    j.assignmentsOpen.map((item) => ({ ...tagOf(j), item })),
  )
  const assignmentsAtRisk = journeys.flatMap((j) =>
    j.assignmentsAtRisk.map((item) => ({ ...tagOf(j), item })),
  )
  const pendencias = journeys
    .flatMap((j) => j.signals.pendenciaTempo.items.map((item) => ({ ...tagOf(j), item })))
    .sort((a, b) => b.item.gapMinutes - a.item.gapMinutes)
  const recentTimeEntries = journeys
    .flatMap((j) => j.recentTimeEntries.map((item) => ({ ...tagOf(j), item })))
    .sort((a, b) => Date.parse(b.item.entryAt) - Date.parse(a.item.entryAt))
  return { assignmentsOpen, assignmentsAtRisk, pendencias, recentTimeEntries }
}

/**
 * Seleção na URL. Compatível com o link legado `?colaboradorId=<id>` (um colaborador);
 * vários colaboradores usam `?colaboradorIds=<id>,<id>`.
 */
export function parseJourneyCollaboratorIds(params: URLSearchParams): string[] {
  const raw = [
    ...(params.get('colaboradorIds')?.split(',') ?? []),
    params.get('colaboradorId') ?? '',
  ]
  const out: string[] = []
  for (const v of raw) {
    const id = v.trim()
    if (id && !out.includes(id)) out.push(id)
  }
  return out.slice(0, JOURNEY_MAX_SELECTED_COLLABORATORS)
}

/** Patch de URL para a seleção: 1 → `colaboradorId` (legado); 2+ → `colaboradorIds`. */
export function journeyCollaboratorIdsToParams(
  ids: readonly string[],
): { colaboradorId: string | undefined; colaboradorIds: string | undefined } {
  if (ids.length === 0) return { colaboradorId: undefined, colaboradorIds: undefined }
  if (ids.length === 1) return { colaboradorId: ids[0], colaboradorIds: undefined }
  return { colaboradorId: undefined, colaboradorIds: ids.join(',') }
}
