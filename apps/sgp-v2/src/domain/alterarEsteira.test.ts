import { describe, expect, it } from 'vitest'
import { patchConveyorStructureBodySchema } from '../../../../server/src/modules/conveyors/conveyors.schemas'
import { buildPatchBody, emptyEdit, reasonText, setStepResp, toggleStep, toggleSteps } from './alterarEsteira'
import type { ConveyorDetail, ConveyorStep, StepStatus } from './conveyors'
import type { MatrixNode } from './novaEsteira'

const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const CARLOS = u(901)
const PEDRO = u(902)
const EQUIPE = u(903)

function step(n: number, status: StepStatus, primary: string | null = CARLOS): ConveyorStep {
  return {
    id: u(n),
    name: `Atividade ${n}`,
    orderIndex: n,
    plannedMinutes: 30,
    plannedQuantity: 1,
    operationalStatus: status,
    completedByName: null,
    assignees: [
      ...(primary ? [{ type: 'COLLABORATOR' as const, collaboratorId: primary, collaboratorName: 'X', teamId: null, teamName: null, isPrimary: true, orderIndex: 0 }] : []),
      { type: 'TEAM' as const, collaboratorId: null, collaboratorName: null, teamId: EQUIPE, teamName: 'Costura', isPrimary: false, orderIndex: 1 },
    ],
  }
}

function esteira(): ConveyorDetail {
  return {
    id: u(1),
    code: null,
    name: 'Gol GTI · ABC1D23',
    clientName: null,
    responsible: null,
    operationalStatus: 'EM_ANDAMENTO',
    estimatedDeadline: null,
    totalSteps: 4,
    vehicle: null,
    modelVersion: null,
    plate: null,
    baseNameSnapshot: null,
    originRegister: 'BASE',
    matrixRootItemId: u(2),
    structure: {
      options: [
        {
          id: u(10),
          name: 'Bancos dianteiros',
          orderIndex: 1,
          areas: [{ id: u(20), name: 'Costura', orderIndex: 1, steps: [step(31, 'COMPLETED'), step(32, 'IN_PROGRESS'), step(33, 'PENDING')] }],
        },
        { id: u(11), name: 'Volante', orderIndex: 2, areas: [{ id: u(21), name: 'Corte', orderIndex: 1, steps: [step(34, 'PENDING')] }] },
      ],
    },
  }
}

function tarefaMatriz(): MatrixNode {
  const base = { description: null, is_active: true, planned_minutes: null, default_responsible_id: null, team_ids: [], required: true, source_key: null }
  return {
    ...base,
    id: u(500),
    node_type: 'TASK',
    name: 'Teto',
    order_index: 3,
    children: [{ ...base, id: u(501), node_type: 'SECTOR', name: 'Colagem', order_index: 0, children: [{ ...base, id: u(502), node_type: 'ACTIVITY', name: 'Revestir teto', order_index: 0, planned_minutes: 80, default_responsible_id: PEDRO, children: [] }] }],
  }
}

describe('alterar esteira em andamento → PATCH /api/v1/conveyors/:id/structure', () => {
  it('o corpo passa no validador real da V1 e preserva ids e responsáveis atuais de quem não mudou (a V1 substitui responsáveis)', () => {
    const d = esteira()
    const body = buildPatchBody(d, emptyEdit(), 'Cliente pediu mudança')
    const parsed = patchConveyorStructureBodySchema.safeParse(body)
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    const steps = body.options[0].areas[0].steps
    expect(steps.map((s) => s.id)).toEqual([u(31), u(32), u(33)])
    expect(steps[0].assignees).toEqual([
      { type: 'COLLABORATOR', collaboratorId: CARLOS, isPrimary: true, orderIndex: 0 },
      { type: 'TEAM', teamId: EQUIPE, isPrimary: false, orderIndex: 1 },
    ])
    expect(body).toMatchObject({ originType: 'BASE', matrixRootItemId: u(2), reason: 'Cliente pediu mudança' })
  })

  it('atividade feita ou em andamento tem cadeado: não sai nem troca responsável; a que não começou sai e some do corpo', () => {
    const d = esteira()
    const [feita, andando, livre] = d.structure.options[0].areas[0].steps
    let e = toggleStep(emptyEdit(), feita)
    e = toggleStep(e, andando)
    e = setStepResp(e, [feita, andando], PEDRO)
    expect(e.off.size).toBe(0)
    expect(e.resp).toEqual({})

    e = toggleSteps(e, [feita, andando, livre]) // "tirar setor" só tira o que está livre
    const body = buildPatchBody(d, e, 'Retrabalho')
    expect(body.options[0].areas[0].steps.map((s) => [s.id, s.orderIndex])).toEqual([
      [u(31), 1],
      [u(32), 2],
    ])
  })

  it('troca de responsável substitui só o principal (equipe fica); etapa inteira tirada some; etapa da matriz entra no fim sem id', () => {
    const d = esteira()
    const livre = d.structure.options[0].areas[0].steps[2]
    const volante = d.structure.options[1].areas[0].steps[0]
    let e = setStepResp(emptyEdit(), [livre], PEDRO)
    e = toggleStep(e, volante)
    e = { ...e, add: [tarefaMatriz()] }

    const body = buildPatchBody(d, e, 'Mudança de prioridade')

    expect(patchConveyorStructureBodySchema.safeParse(body).success).toBe(true)
    expect(body.options.map((o) => ['id' in o ? o.id : null, o.titulo, o.orderIndex])).toEqual([
      [u(10), 'Bancos dianteiros', 1],
      [null, 'Teto', 2],
    ])
    expect(body.options[0].areas[0].steps[2].assignees).toEqual([
      { type: 'COLLABORATOR', collaboratorId: PEDRO, isPrimary: true },
      { type: 'TEAM', teamId: EQUIPE, isPrimary: false, orderIndex: 1 },
    ])
    expect(body.options[1].areas[0].steps[0]).toMatchObject({ titulo: 'Revestir teto', sourceKey: u(502), assignees: [{ collaboratorId: PEDRO, isPrimary: true }] })
  })

  it('motivo é obrigatório: botão + detalhe opcional; "Outro motivo" exige texto', () => {
    expect(reasonText(null, '')).toBeNull()
    expect(reasonText('Retrabalho', '')).toBe('Retrabalho')
    expect(reasonText('Retrabalho', ' costura saiu torta ')).toBe('Retrabalho: costura saiu torta')
    expect(reasonText('Outro motivo', 'ok')).toBeNull()
    expect(reasonText('Outro motivo', 'Cliente trouxe peça nova')).toBe('Cliente trouxe peça nova')
  })
})
