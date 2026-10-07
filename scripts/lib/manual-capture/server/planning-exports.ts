/**
 * Gera as DUAS planilhas reais do Planejamento semanal (Exportar Excel e Exportar visão semanal)
 * com os builders do backend (ExcelJS) a partir da semana fictícia das fixtures. Sem banco.
 * Uso: tsx planning-exports.ts <arquivoPlanejamento.xlsx> <arquivoVisaoSemanal.xlsx>
 */
import { writeFile } from 'node:fs/promises'
import { buildOperationalPlanningExportWorkbookBuffer } from '../../../../server/src/modules/operational-planning/operational-planning.export.js'
import { buildOperationalPlanningWeeklyViewExportWorkbookBuffer } from '../../../../server/src/modules/operational-planning/operational-planning.weekly-view.export.js'
import {
  classifyCapacityRow,
  mapExportActivityStatusLabel,
} from '../../../../server/src/modules/operational-planning/operational-planning.service.js'
import { weekPayload } from '../fixtures/planning.mjs'
import { FIXED_NOW_ISO } from '../fixtures/common.mjs'

const [planningOut, weeklyOut] = process.argv.slice(2)
const week = weekPayload()
const items = week.plan.items
const meta = {
  weekStartDate: week.week.weekStartDate,
  weekEndDate: week.week.weekEndDate,
  situation: 'REVISAO_NAO_PUBLICADA' as const,
  generatedAt: new Date(FIXED_NOW_ISO),
  totalActivities: items.length,
  totalPlannedMinutes: week.summary.plannedMinutes,
  collaboratorsWithActivityCount: week.summary.collaboratorsCount,
}

const planningRows = items.map((i) => {
  const [code, title] = i.conveyorTitle.split(' · ')
  return {
    plannedDate: i.plannedDate,
    collaboratorName: i.assignedCollaboratorName ?? '',
    teamName: '',
    conveyorCode: code,
    conveyorTitle: title,
    clientName: 'Cliente Exemplo',
    vehicle: 'Veículo Exemplo',
    plate: 'ABC1D23',
    estimatedDeadline: '2026-07-10',
    taskTitle: i.taskTitle,
    sectorTitle: i.sectorTitle,
    activityTitle: i.activityTitle,
    plannedOrderDisplay: i.plannedOrder + 1,
    plannedMinutes: i.plannedMinutes,
    statusLabel: mapExportActivityStatusLabel(i.activityOperationalStatus),
    notes: '',
    reviewRequiredLabel: i.syncStatus === 'DIVERGED' ? 'Sim' : 'Não',
  }
})

const capacityRows = week.capacityByCollaboratorDay
  .filter((c) => c.plannedMinutes > 0)
  .map((c) => {
    const name = items.find((i) => i.assignedCollaboratorId === c.collaboratorId)?.assignedCollaboratorName ?? c.collaboratorId
    return { date: c.date, collaboratorName: name, capacityMinutes: c.capacityMinutes, plannedMinutes: c.plannedMinutes, ...classifyCapacityRow(c.capacityMinutes, c.plannedMinutes) }
  })

await writeFile(planningOut, await buildOperationalPlanningExportWorkbookBuffer({ meta, planningRows, capacityRows }))

const weeklyRows = items.map((i) => ({
  id: i.id,
  collaboratorId: i.assignedCollaboratorId,
  collaboratorName: i.assignedCollaboratorName,
  plannedDate: i.plannedDate,
  plannedOrder: i.plannedOrder,
  plannedMinutes: i.plannedMinutes,
  conveyorTitle: i.conveyorTitle.split(' · ')[1],
  activityTitle: i.activityTitle,
  sectorTitle: i.sectorTitle,
  taskTitle: i.taskTitle,
  notes: null,
  realizedMinutes: i.realizedMinutes,
}))
await writeFile(weeklyOut, await buildOperationalPlanningWeeklyViewExportWorkbookBuffer({ meta, rows: weeklyRows }))
process.stdout.write(JSON.stringify({ planningOut, weeklyOut }))
