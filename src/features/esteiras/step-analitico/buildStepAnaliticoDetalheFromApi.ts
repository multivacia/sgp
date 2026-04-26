import type {
  ConveyorStepAssigneeListItem,
  ConveyorStepTimeEntryListItem,
} from '../../../domain/conveyors/conveyor-step-assignments.types'
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
    createdAt: te.entryAt,
    origem: 'api',
  }))
}

function buildResumo(
  planejadoMin: number,
  timeEntries: ConveyorStepTimeEntryListItem[],
): ResumoApontamentosStep {
  const totalMinutosApontados = timeEntries.reduce((s, x) => s + x.minutes, 0)
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
    assignees,
    timeEntries,
    cargaParcial,
  } = input

  return {
    conveyorId,
    stepNodeId,
    matrixActivityNodeId,
    equipe: buildEquipeFromAssignees(assignees),
    apontamentos: buildResumo(planejadoMin, timeEntries),
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
