import type {
  ConveyorStepAssigneeListItem,
  ConveyorStepTimeEntryListItem,
} from '../../../domain/conveyors/conveyor-step-assignments.types'
import {
  buildActivityOperationalProgress,
  formatPlannedQuantity,
} from '../../../domain/operational/activityOperationalQuantity'
import { formatHumanMinutes } from '../../../lib/formatters'
import {
  computeStatusLeituraApontamento,
  type ApontamentoAnaliticoItem,
  type PapelResponsavelStep,
  type ResumoApontamentosStep,
  type StepAnaliticoDetalhe,
  type StepEquipeDetalhe,
  type StepResponsavelDetalhe,
} from '../../../domain/esteiras/step-analitico.types'

function mapAssigneeRow(
  row: ConveyorStepAssigneeListItem,
  papel: PapelResponsavelStep,
): StepResponsavelDetalhe {
  const kindLabel = row.type === 'TEAM' ? 'Time' : 'Colaborador'
  const nome =
    (row.type === 'TEAM' ? row.teamName : row.collaboratorName)?.trim() ||
    (row.type === 'TEAM' ? row.teamId : row.collaboratorId) ||
    kindLabel
  const participanteId =
    row.type === 'TEAM' ? (row.teamId ?? row.id) : (row.collaboratorId ?? row.id)
  return {
    id: row.id,
    colaboradorId: participanteId,
    nomeExibicao: nome,
    papel,
  }
}

function buildEquipeFromAssignees(
  assignees: ConveyorStepAssigneeListItem[],
): StepEquipeDetalhe {
  if (assignees.length === 0) {
    return { principal: null, apoios: [] }
  }
  const sorted = [...assignees].sort(
    (a, b) =>
      a.orderIndex - b.orderIndex ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  const primaryRow =
    sorted.find((x) => x.isPrimary) ?? sorted[0]!
  const principal = mapAssigneeRow(primaryRow, 'principal')
  const apoios = sorted
    .filter((x) => x.id !== primaryRow.id)
    .map((x) => mapAssigneeRow(x, 'apoio'))
  return { principal, apoios }
}

function buildHistoricoFromTimeEntries(
  conveyorId: string,
  stepNodeId: string,
  matrixActivityNodeId: string | undefined,
  entries: ConveyorStepTimeEntryListItem[],
): ApontamentoAnaliticoItem[] {
  const sorted = [...entries].sort(
    (a, b) =>
      new Date(b.entryAt).getTime() - new Date(a.entryAt).getTime(),
  )
  return sorted.slice(0, 8).map((te) => ({
    id: te.id,
    conveyorId,
    stepNodeId,
    matrixActivityNodeId,
    colaboradorId: te.collaboratorId,
    colaboradorNome:
      te.collaboratorName?.trim() || te.collaboratorId || '—',
    minutos: te.minutes,
    observacao: te.notes ?? undefined,
    apontamentoPorExcecao: te.entryOrigin === 'UNASSIGNED_EXCEPTION',
    justificativaExcecao:
      te.entryOrigin === 'UNASSIGNED_EXCEPTION' && te.exceptionJustification?.trim()
        ? te.exceptionJustification.trim()
        : undefined,
    foraDaSequencia: te.isOutOfSequence === true,
    justificativaForaSequencia:
      te.isOutOfSequence === true && te.outOfSequenceJustification?.trim()
        ? te.outOfSequenceJustification.trim()
        : undefined,
    createdAt: te.entryAt,
    origem: 'api',
  }))
}

function buildResumo(
  planejadoUnitMin: number,
  plannedQuantity: number,
  timeEntries: ConveyorStepTimeEntryListItem[],
): ResumoApontamentosStep {
  const progress = buildActivityOperationalProgress({
    plannedUnitMinutes: planejadoUnitMin,
    plannedQuantity,
    timeEntries: timeEntries.map((x) => ({
      minutes: x.minutes,
      executedQuantity: x.executedQuantity,
    })),
  })
  const planejadoMin = progress.plannedTotalMinutes
  const totalMinutosApontados = progress.executedMinutesTotal
  const quantidadeLancamentos = timeEntries.length
  const ultimo = timeEntries.length
    ? [...timeEntries].sort(
        (a, b) =>
          new Date(b.entryAt).getTime() - new Date(a.entryAt).getTime(),
      )[0]
    : undefined
  const saldoMinutos = totalMinutosApontados - planejadoMin
  const statusLeitura = computeStatusLeituraApontamento(
    planejadoMin,
    totalMinutosApontados,
  )
  return {
    planejadoMin,
    planejadoUnitMin: progress.plannedUnitMinutes,
    plannedQuantity: progress.plannedQuantity,
    executedQuantityTotal: progress.executedQuantityTotal,
    actualMinutesPerUnit: progress.actualMinutesPerUnit,
    remainingQuantity: progress.remainingQuantity,
    plannedQuantityLabel: formatPlannedQuantity(progress.plannedQuantity),
    plannedSummaryLabel: `${formatPlannedQuantity(progress.plannedQuantity)} × ${formatHumanMinutes(progress.plannedUnitMinutes)}/un. = ${formatHumanMinutes(planejadoMin)}`,
    totalMinutosApontados,
    quantidadeLancamentos,
    ultimoApontamentoAt: ultimo?.entryAt,
    saldoMinutos,
    statusLeitura,
    fonteTotalMinutos: 'apontamentos_registrados',
  }
}

export type BuildStepAnaliticoFromApiInput = {
  conveyorId: string
  stepNodeId: string
  matrixActivityNodeId?: string
  planejadoMin: number
  plannedQuantity?: number
  assignees: ConveyorStepAssigneeListItem[]
  timeEntries: ConveyorStepTimeEntryListItem[]
  cargaParcial?: boolean
}

/**
 * Hidrata `StepAnaliticoDetalhe` a partir das listagens reais de assignees + time-entries.
 */
export function buildStepAnaliticoDetalheFromApi(
  input: BuildStepAnaliticoFromApiInput,
): StepAnaliticoDetalhe {
  const {
    conveyorId,
    stepNodeId,
    matrixActivityNodeId,
    planejadoMin,
    plannedQuantity = 1,
    assignees,
    timeEntries,
    cargaParcial,
  } = input

  return {
    conveyorId,
    stepNodeId,
    matrixActivityNodeId,
    equipe: buildEquipeFromAssignees(assignees),
    apontamentos: buildResumo(planejadoMin, plannedQuantity, timeEntries),
    historicoPreview: buildHistoricoFromTimeEntries(
      conveyorId,
      stepNodeId,
      matrixActivityNodeId,
      timeEntries,
    ),
    cargaParcial,
    fonte: 'api',
  }
}
