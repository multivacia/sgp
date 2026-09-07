import { describe, expect, it } from 'vitest'
import { buildConveyorStructureEditInput } from './buildConveyorStructureEditInput'
import type { ManualOptionDraft } from './matrixToConveyorCreateInput'

/**
 * `buildConveyorStructureEditInput` é o builder exclusivo de EDIÇÃO
 * (PATCH /conveyors/:id/structure) — usa `id` (nunca `key`) para decidir
 * INSERT (sem id) vs UPDATE (com id).
 */
describe('buildConveyorStructureEditInput', () => {
  function baselineRoots(): ManualOptionDraft[] {
    return [
      {
        key: 'opt-key-1',
        id: 'opt-id-1',
        titulo: 'Tarefa existente',
        areas: [
          {
            key: 'area-key-1',
            id: 'area-id-1',
            titulo: 'Setor existente',
            steps: [
              {
                key: 'step-key-1',
                id: 'step-id-1',
                titulo: 'Atividade existente',
                plannedMinutes: 30,
              },
            ],
          },
        ],
      },
    ]
  }

  it('editar só o título de um STEP existente → payload contém o id daquele STEP', () => {
    const roots = baselineRoots()
    roots[0]!.areas[0]!.steps[0]!.titulo = 'Atividade renomeada'

    const body = buildConveyorStructureEditInput(roots, {})

    expect(body.options).toHaveLength(1)
    expect(body.options[0]!.id).toBe('opt-id-1')
    expect(body.options[0]!.areas[0]!.id).toBe('area-id-1')
    const step = body.options[0]!.areas[0]!.steps[0]!
    expect(step.id).toBe('step-id-1')
    expect(step.titulo).toBe('Atividade renomeada')
  })

  it('adicionar STEP novo na sessão (sem id) → payload NÃO contém id para aquele STEP', () => {
    const roots = baselineRoots()
    roots[0]!.areas[0]!.steps.push({
      key: 'step-key-novo',
      titulo: 'Atividade nova',
      plannedMinutes: 15,
    })

    const body = buildConveyorStructureEditInput(roots, {})

    const steps = body.options[0]!.areas[0]!.steps
    expect(steps).toHaveLength(2)
    const existing = steps.find((s) => s.titulo === 'Atividade existente')
    const created = steps.find((s) => s.titulo === 'Atividade nova')
    expect(existing?.id).toBe('step-id-1')
    expect(created).toBeTruthy()
    expect(created && 'id' in created ? created.id : undefined).toBeUndefined()
  })

  it('remover uma AREA na UI → payload não inclui mais aquela AREA nem seus STEPs', () => {
    const roots = baselineRoots()
    roots[0]!.areas.push({
      key: 'area-key-2',
      id: 'area-id-2',
      titulo: 'Setor a remover',
      steps: [
        { key: 'step-key-2', id: 'step-id-2', titulo: 'Atividade do setor removido', plannedMinutes: 10 },
      ],
    })
    // Simula remoção na UI: filtra a área antes de montar o payload.
    roots[0]!.areas = roots[0]!.areas.filter((ar) => ar.id !== 'area-id-2')

    const body = buildConveyorStructureEditInput(roots, {})

    expect(body.options[0]!.areas).toHaveLength(1)
    expect(body.options[0]!.areas.some((ar) => ar.id === 'area-id-2')).toBe(false)
    const allStepIds = body.options[0]!.areas.flatMap((ar) => ar.steps.map((s) => ('id' in s ? s.id : undefined)))
    expect(allStepIds).not.toContain('step-id-2')
  })

  it('novo OPTION criado nesta sessão (sem id) não aparece com id no payload', () => {
    const roots = baselineRoots()
    roots.push({
      key: 'opt-key-novo',
      titulo: 'Tarefa nova',
      areas: [
        {
          key: 'area-key-novo',
          titulo: 'Setor novo',
          steps: [{ key: 'step-key-novo-2', titulo: 'Atividade nova 2', plannedMinutes: 5 }],
        },
      ],
    })

    const body = buildConveyorStructureEditInput(roots, {})

    expect(body.options).toHaveLength(2)
    const novo = body.options[1]!
    expect('id' in novo ? novo.id : undefined).toBeUndefined()
    expect('id' in novo.areas[0]! ? novo.areas[0]!.id : undefined).toBeUndefined()
  })

  it('sempre monta originType MANUAL e matrixRootItemId null (mesmo comportamento do fluxo de edição anterior)', () => {
    const body = buildConveyorStructureEditInput(baselineRoots(), {})
    expect(body.originType).toBe('MANUAL')
    expect(body.matrixRootItemId).toBeNull()
    expect(body.baseId).toBeNull()
  })
})
