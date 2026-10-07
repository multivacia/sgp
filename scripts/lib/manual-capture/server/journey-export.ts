/**
 * Gera a planilha REAL de Exportar Excel da Jornada por colaborador (builder ExcelJS do backend)
 * a partir da mesma jornada fictícia exibida na tela (fixtures/journey.mjs). Sem banco.
 * Uso: tsx journey-export.ts <saida.xlsx>
 */
import { writeFile } from 'node:fs/promises'
import { buildOperationalJourneyExportWorkbookBuffer } from '../../../../server/src/modules/operational-journey/operational-journey.export.js'
import { journeyPayload } from '../fixtures/journey.mjs'
import { COLLABORATORS, FIXED_NOW_ISO } from '../fixtures/common.mjs'

const [out] = process.argv.slice(2)
const IDS = ['col-carlos', 'col-bruno', 'col-diana']

const collaborators = IDS.map((id) => {
  const j = journeyPayload([id])
  const c = COLLABORATORS.find((x) => x.id === id)!
  const extra = id === 'col-carlos' ? j.extraTimeEntriesSummary : { totalMinutes: 0, entriesCount: 0 }
  return {
    collaboratorId: id,
    fullName: c.full_name,
    code: c.code,
    registrationCode: c.code,
    totals: {
      assignmentCount: j.load.assignmentCount,
      plannedMinutesOnStepsSum: j.load.plannedMinutesOnStepsSum,
      realizedMinutesInPeriod: j.execution.realizedMinutesInPeriod,
      realizedMinutesTotal: j.execution.realizedMinutesTotal,
      coberturaRealizadoMinutos: j.coberturaTempo.realizadoMinutosAcumuladoEscopo,
      coberturaPrevistoMinutos: j.coberturaTempo.previstoMinutosEscopo,
      extraMinutesInPeriod: extra.totalMinutes,
      extraEntriesCount: extra.entriesCount,
      overdueCount: j.risk.overdueCount,
      pendenciaTempoCount: j.signals.pendenciaTempo.count,
    },
    timeEntries: j.recentTimeEntries.map((t: { entryAt: string; conveyorName: string; stepName: string; minutes: number }) => ({
      workDate: t.entryAt.slice(0, 10),
      conveyorCode: null,
      conveyorName: t.conveyorName,
      optionName: null,
      areaName: null,
      stepName: t.stepName,
      minutes: t.minutes,
      executedQuantity: null,
      entryOrigin: 'ASSIGNED' as const,
      isOutOfSequence: false,
      justification: null,
      notes: null,
    })),
    extraEntries:
      id === 'col-carlos' ? [{ entryDate: '2026-06-30', description: 'Organização da bancada', minutes: 30, notes: null }] : [],
  }
})

await writeFile(
  out,
  await buildOperationalJourneyExportWorkbookBuffer({
    meta: { periodFromDate: '2026-06-25', periodToDate: '2026-07-01', periodPreset: '7d', conveyorFilterLabel: null, generatedAt: new Date(FIXED_NOW_ISO) },
    collaborators,
  }),
)
process.stdout.write(JSON.stringify({ out }))
