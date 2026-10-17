import { describe, expect, it } from 'vitest'
import { postConveyorBodySchema } from '../../../../server/src/modules/conveyors/conveyors.schemas'
import { buildCreateBody, emptyDraft, setResponsavel, tasksOf, taskActivities, toggleActivity, toggleGroup, type Dados, type MatrixNode } from './novaEsteira'

let seq = 0
function node(type: MatrixNode['node_type'], name: string, children: MatrixNode[] = [], extra: Partial<MatrixNode> = {}): MatrixNode {
  return {
    id: `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`,
    node_type: type,
    name,
    description: null,
    order_index: seq,
    is_active: true,
    planned_minutes: null,
    default_responsible_id: null,
    team_ids: [],
    required: true,
    source_key: null,
    children,
    ...extra,
  }
}

const CARLOS = '11111111-1111-4111-8111-111111111111'
const PEDRO = '22222222-2222-4222-8222-222222222222'
const EQUIPE = '33333333-3333-4333-8333-333333333333'

function matriz() {
  seq = 0
  return node('ITEM', 'Gol GTI completo', [
    node('TASK', '15 - BANCOS DIANTEIROS', [
      node('SECTOR', 'COSTURA', [node('ACTIVITY', 'Costurar encosto', [], { planned_minutes: 240.7, default_responsible_id: CARLOS, team_ids: [EQUIPE] })]),
      node('SECTOR', 'PRÉ-MONTAGEM', [
        node('ACTIVITY', 'Montar encosto', [], { planned_minutes: 40, default_responsible_id: CARLOS }),
        node('ACTIVITY', 'Montar assento', [], { planned_minutes: 60, source_key: 'chave-origem' }),
      ]),
    ]),
    node('TASK', '16 - VOLANTE', [node('SECTOR', 'CORTE', [node('ACTIVITY', 'Corte couro', [], { planned_minutes: 40 })])]),
    node('TASK', 'Etapa desativada', [node('SECTOR', 'X', [node('ACTIVITY', 'Y')])], { is_active: false }),
  ])
}

const DADOS: Dados = { placa: 'abc1d23', veiculo: 'Gol GTI', cliente: '', prazo: '2026-10-23', responsavelNome: 'Ana', responsavelId: null }

describe('nova esteira pelo cardápio → POST /api/v1/conveyors', () => {
  it('o corpo gerado passa no validador real da V1 (contrato)', () => {
    const tree = matriz()
    const body = buildCreateBody(tree, emptyDraft(), DADOS)
    const parsed = postConveyorBodySchema.safeParse(body)
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    expect(body).toMatchObject({ originType: 'BASE', matrixRootItemId: tree.id, dados: { nome: 'Gol GTI · ABC1D23', placa: 'ABC1D23', prazoEstimado: '2026-10-23' } })
  })

  it('tirar atividades/etapas some do corpo, renumera a ordem e descarta setor/etapa vazios; etapa desativada na matriz não entra', () => {
    const tree = matriz()
    const [bancos, volante] = tasksOf(tree)
    const [costurar] = taskActivities(bancos)
    let d = toggleActivity(emptyDraft(), costurar) // setor Costura fica vazio
    d = toggleGroup(d, taskActivities(volante)) // etapa Volante sai inteira

    const body = buildCreateBody(tree, d, DADOS)

    expect(body.options).toHaveLength(1)
    expect(body.options[0]).toMatchObject({ titulo: '15 - BANCOS DIANTEIROS', orderIndex: 1 })
    expect(body.options[0].areas.map((a) => [a.titulo, a.orderIndex])).toEqual([['PRÉ-MONTAGEM', 1]])
    expect(body.options[0].areas[0].steps.map((s) => [s.titulo, s.orderIndex, s.sourceKey])).toEqual([
      ['Montar encosto', 1, taskActivities(bancos)[1].id],
      ['Montar assento', 2, 'chave-origem'],
    ])
    expect(() => buildCreateBody(tree, toggleGroup(d, taskActivities(bancos)), DADOS)).toThrow()
  })

  it('responsável vem da matriz (principal) com a equipe como apoio; troca da gestora substitui só o principal', () => {
    const tree = matriz()
    const [bancos] = tasksOf(tree)
    const costurar = taskActivities(bancos)[0]

    const padrao = buildCreateBody(tree, emptyDraft(), DADOS).options[0].areas[0].steps[0]
    expect(padrao.plannedMinutes).toBe(240)
    expect(padrao.assignees).toEqual([
      { type: 'COLLABORATOR', collaboratorId: CARLOS, isPrimary: true },
      { type: 'TEAM', teamId: EQUIPE, isPrimary: false },
    ])

    const trocado = buildCreateBody(tree, setResponsavel(emptyDraft(), [costurar], PEDRO), DADOS).options[0].areas[0].steps[0]
    expect(trocado.assignees[0]).toEqual({ type: 'COLLABORATOR', collaboratorId: PEDRO, isPrimary: true })
    expect(trocado.assignees[1]).toMatchObject({ type: 'TEAM', teamId: EQUIPE })

    // escolher de novo o da matriz desfaz a troca
    expect(setResponsavel(setResponsavel(emptyDraft(), [costurar], PEDRO), [costurar], CARLOS).resp).toEqual({})
  })
})
