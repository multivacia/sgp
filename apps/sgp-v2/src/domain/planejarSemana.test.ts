import { describe, expect, it } from 'vitest'
import { saveOperationalWeekPlanBodySchema } from '../../../../server/src/modules/operational-planning/operational-planning.schemas'
import { agruparEsperando, aplicarAjustes, buildSaveBody, lotacao, devolvidos, juntar, mantidosDe, simular, sugerirSemana, type BacklogItem, type WeekPlanItem, type WeekResponse } from './planejarSemana'

const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const JOAO = u(901)
const MARTA = u(902)
const DIAS = ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']

function semana(items: WeekPlanItem[] = [], capMin = 480): WeekResponse {
  return {
    hasPlan: items.length > 0,
    week: { weekStartDate: DIAS[0], weekEndDate: DIAS[4], weekdayDates: DIAS },
    revision: { hasActivePublished: false, hasUnpublishedRevision: false },
    plan: items.length ? { id: u(1), status: 'DRAFT', items } : null,
    capacityByCollaboratorDay: [JOAO, MARTA].flatMap((c) => DIAS.map((date) => ({ collaboratorId: c, date, capacityMinutes: capMin, plannedMinutes: 0 }))),
  }
}

function backlog(conveyor: number, n: number, quem: string, min: number, from = 100): BacklogItem[] {
  return Array.from({ length: n }, (_, i) => ({
    conveyorId: u(conveyor),
    conveyorTitle: `Esteira ${conveyor}`,
    taskTitle: 'Bancos',
    sectorTitle: 'Costura',
    activityNodeId: u(conveyor * 1000 + from + i),
    activityTitle: `Atividade ${i + 1}`,
    pendingMinutes: min,
    assignedCollaborators: [{ id: quem, fullName: 'X' }],
  }))
}

function noPlano(n: number, conveyor: number, date: string, min: number, status: string | null = 'PENDING'): WeekPlanItem {
  return {
    id: u(5000 + n),
    conveyorId: u(conveyor),
    conveyorTitle: `Esteira ${conveyor}`,
    activityNodeId: u(conveyor * 1000 + n),
    taskTitle: 'Teto',
    sectorTitle: 'Colagem',
    activityTitle: `Feita ${n}`,
    assignedCollaboratorId: MARTA,
    assignedCollaboratorName: 'Marta',
    plannedDate: date,
    plannedOrder: 0,
    plannedMinutes: min,
    status: 'PLANNED',
    notes: null,
    activityOperationalStatus: status,
  }
}

const semPrazo = () => null

describe('planejar semana → POST /api/v1/operational-planning/week', () => {
  it('encaixa na ordem da matriz pela folga do responsável e o corpo passa no validador real da V1', () => {
    const w = semana()
    const esperando = agruparEsperando(backlog(1, 5, JOAO, 200), [], semPrazo)
    const r = simular(w, [], esperando, { [u(1)]: 1 })
    // 200 min cada, 480 por dia → 2 por dia a partir de terça
    expect(r.novos.map((n) => n.plannedDate)).toEqual([DIAS[1], DIAS[1], DIAS[2], DIAS[2], DIAS[3]])
    expect(r.porEsteira[u(1)]).toEqual({ fim: 3, sobraMin: 0, semResponsavel: 0 })
    expect(r.porDia[1]).toEqual({ capacidade: 960, planejado: 400 })

    const body = buildSaveBody(w, [], r.novos)
    const parsed = saveOperationalWeekPlanBodySchema.safeParse(body)
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    expect(body.items.map((i) => [i.plannedDate, i.plannedOrder])).toEqual([
      [DIAS[1], 0],
      [DIAS[1], 1],
      [DIAS[2], 0],
      [DIAS[2], 1],
      [DIAS[3], 0],
    ])
  })

  it('o que não cabe até sexta vira sobra; atividade sem responsável não entra; a semana já planejada ocupa a folga', () => {
    const mantidos = [noPlano(1, 9, DIAS[3], 480), noPlano(2, 9, DIAS[4], 480)]
    const w = semana(mantidos)
    const itens = [...backlog(1, 3, MARTA, 300), { ...backlog(1, 1, MARTA, 60, 900)[0], assignedCollaborators: [] }]
    const esperando = agruparEsperando(itens, [], semPrazo)
    const r = simular(w, mantidos, esperando, { [u(1)]: 2 })
    // quarta livre (1 cabe), quinta e sexta cheias de Marta → 2 sobram
    expect(r.novos).toHaveLength(1)
    expect(r.porEsteira[u(1)]).toEqual({ fim: 2, sobraMin: 600, semResponsavel: 1 })
    expect(buildSaveBody(w, mantidos, r.novos).items).toHaveLength(3)
  })

  it('sugerir semana começa cada esteira, pela ordem do prazo, no primeiro dia em que termina no prazo', () => {
    const w = semana()
    const esperando = agruparEsperando([...backlog(2, 2, JOAO, 480), ...backlog(1, 2, JOAO, 480)], [], (id) => (id === u(1) ? DIAS[1] : DIAS[4]))
    const inicio = sugerirSemana(w, [], esperando, {}, 0)
    // esteira 1 (prazo terça) entra primeiro: seg+ter; esteira 2 cabe em qua+qui
    expect(inicio).toEqual({ [u(1)]: 0, [u(2)]: 0 })
    const r = simular(w, [], esperando, inicio)
    expect(r.porEsteira[u(1)].fim).toBe(1)
    expect(r.porEsteira[u(2)].fim).toBe(3)
  })

  it('tirar esteira da semana mantém o que já começou ou terminou; o resto volta a esperar', () => {
    const itens = [noPlano(1, 9, DIAS[0], 60, 'COMPLETED'), noPlano(2, 9, DIAS[0], 60, 'IN_PROGRESS'), noPlano(3, 9, DIAS[1], 60), noPlano(4, 8, DIAS[1], 60)]
    const w = semana(itens)
    const tiradas = new Set([u(9)])
    expect(mantidosDe(w, tiradas).map((i) => i.id)).toEqual([u(5001), u(5002), u(5004)])
    const volta = juntar(agruparEsperando(backlog(9, 1, JOAO, 30), [], semPrazo), devolvidos(w, tiradas, semPrazo))
    expect(volta).toHaveLength(1)
    expect(volta[0].atividades.map((a) => a.activityNodeId)).toEqual([u(9100), u(9003)])
    expect(volta[0].atividades[1]).toMatchObject({ collaboratorId: MARTA, minutes: 60, copItemId: null })
  })

  it('ajuste manual muda dia/pessoa do que não começou (inclusive encaixe novo); o que começou fica; lotação acompanha', () => {
    const mantidos = [noPlano(1, 9, DIAS[0], 120, 'IN_PROGRESS'), noPlano(2, 9, DIAS[0], 60)]
    const w = semana(mantidos)
    const r = simular(w, mantidos, agruparEsperando(backlog(1, 1, JOAO, 90), [], semPrazo), { [u(1)]: 0 })
    const novoId = r.novos[0].activityNodeId
    const aj = aplicarAjustes(mantidos, r.novos, {
      [u(9001)]: { plannedDate: DIAS[2] },
      [u(9002)]: { plannedDate: DIAS[2], collaboratorId: JOAO, collaboratorName: 'João' },
      [novoId]: { plannedDate: DIAS[4] },
    })
    expect(aj.mantidos.map((i) => [i.plannedDate, i.assignedCollaboratorId])).toEqual([
      [DIAS[0], MARTA],
      [DIAS[2], JOAO],
    ])
    expect(aj.novos[0].plannedDate).toBe(DIAS[4])
    expect(lotacao(w, aj.mantidos, aj.novos).map((d) => d.planejado)).toEqual([120, 0, 60, 0, 90])
    expect(saveOperationalWeekPlanBodySchema.safeParse(buildSaveBody(w, aj.mantidos, aj.novos)).success).toBe(true)
  })
})
