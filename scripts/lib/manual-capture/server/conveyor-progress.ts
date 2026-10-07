/**
 * Gera o payload de GET /management/conveyor-progress executando o serviço REAL do backend
 * (`serviceConveyorProgress`) sobre um pool stub alimentado pelas fixtures — sem banco.
 * Uso: server/node_modules/.bin/tsx scripts/lib/manual-capture/server/conveyor-progress.ts > out.json
 */
import { serviceConveyorProgress } from '../../../../server/src/modules/conveyor-progress/conveyor-progress.service.js'
import { CONVEYOR_LIST, conveyorDetail, realizedMinutesFor } from '../fixtures/conveyors.mjs'

type Row = Record<string, unknown>

const detail = conveyorDetail()
const extra = CONVEYOR_LIST.filter((c) => ['conv-102', 'conv-103', 'conv-104'].includes(c.id))

const conveyors: Row[] = [
  { id: detail.id, code: detail.code, name: detail.name, operational_status: detail.operationalStatus },
  ...extra.map((c) => ({ id: c.id, code: c.code, name: c.name, operational_status: c.operationalStatus })),
]

const steps: Row[] = []
const entries: Row[] = []
const assignees: Row[] = []
for (const opt of detail.structure.options) {
  for (const area of opt.areas) {
    for (const st of area.steps) {
      steps.push({
        conveyor_id: detail.id, step_id: st.id, step_name: st.name, step_order: st.orderIndex,
        planned_minutes: st.plannedMinutes, planned_quantity: 1, operational_status: st.operationalStatus,
        area_id: area.id, area_name: area.name, area_order: area.orderIndex,
        option_id: opt.id, option_name: opt.name, option_order: opt.orderIndex,
      })
      assignees.push({ conveyor_node_id: st.id, collaborator_name: 'Carlos Demo' })
      const m = realizedMinutesFor(st) + (st.id === 'step-2' ? 20 : 0)
      if (m > 0) {
        entries.push({
          id: `te-${st.id}`, conveyor_id: detail.id, conveyor_node_id: st.id,
          entry_at: new Date('2026-06-30T14:00:00.000Z'), minutes: m,
          executed_quantity: st.operationalStatus === 'COMPLETED' ? 1 : null,
          notes: null, entry_mode: 'manual', collaborator_name: 'Carlos Demo',
        })
      }
    }
  }
}
// Esteiras adicionais: 1 tarefa / 1 setor / 2 atividades, com progresso variado.
const SIMPLE: Record<string, [string, number, number, string][]> = {
  'conv-102': [['Remover forro', 60, 60, 'COMPLETED'], ['Aplicar tecido', 120, 30, 'IN_PROGRESS']],
  'conv-103': [['Desmontar painéis', 180, 0, 'PENDING'], ['Revestir painéis', 120, 45, 'IN_PROGRESS']],
  'conv-104': [['Remover couro antigo', 60, 75, 'COMPLETED'], ['Revestir volante', 150, 40, 'IN_PROGRESS']],
}
for (const [cid, acts] of Object.entries(SIMPLE)) {
  acts.forEach(([name, planned, realized, status], i) => {
    const sid = `${cid}-s${i + 1}`
    steps.push({
      conveyor_id: cid, step_id: sid, step_name: name, step_order: i + 1, planned_minutes: planned,
      planned_quantity: 1, operational_status: status, area_id: `${cid}-a1`, area_name: 'Tapeçaria',
      area_order: 1, option_id: `${cid}-o1`, option_name: 'Tarefa principal', option_order: 1,
    })
    assignees.push({ conveyor_node_id: sid, collaborator_name: 'Diana Exemplo' })
    if (realized > 0) {
      entries.push({
        id: `te-${sid}`, conveyor_id: cid, conveyor_node_id: sid, entry_at: new Date('2026-06-30T15:00:00.000Z'),
        minutes: realized, executed_quantity: null, notes: null, entry_mode: 'manual', collaborator_name: 'Diana Exemplo',
      })
    }
  })
}

const pool = {
  async query(sql: string) {
    if (/FROM conveyors c\b/.test(sql)) return { rows: conveyors }
    if (/FROM conveyor_nodes step/.test(sql)) return { rows: steps }
    if (/FROM conveyor_time_entries te/.test(sql) && !/UNION/.test(sql)) return { rows: entries }
    if (/FROM conveyor_node_assignees cna/.test(sql)) return { rows: assignees }
    throw new Error(`SQL não previsto no stub: ${sql.slice(0, 80)}`)
  },
}

const out = await serviceConveyorProgress(pool as never, {} as never)
process.stdout.write(JSON.stringify(out))
