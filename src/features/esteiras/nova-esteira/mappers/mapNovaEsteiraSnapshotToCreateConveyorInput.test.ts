import { describe, expect, it } from 'vitest'
import type { NovaEsteiraRegisterSnapshot } from '../../../../mocks/nova-esteira-register-snapshot'
import { mapNovaEsteiraSnapshotToCreateConveyorInput } from './mapNovaEsteiraSnapshotToCreateConveyorInput'

function minimalSnapshot(
  patch: Partial<NovaEsteiraRegisterSnapshot> = {},
): NovaEsteiraRegisterSnapshot {
  const base: NovaEsteiraRegisterSnapshot = {
    dados: {
      nome: 'Esteira X',
      cliente: 'C1',
      veiculo: 'V1',
      modeloVersao: '',
      placa: '',
      observacoes: '',
      responsavel: '',
      prazoEstimado: '',
      prioridade: '',
      colaboradorId: undefined,
    },
    originType: 'MANUAL',
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    sourceType: 'MANUAL',
    sourceRefId: null,
    options: [
      {
        id: 'opt-1',
        titulo: 'Opção A',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            id: 'ar-1',
            titulo: 'Área 1',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                id: 'st-1',
                titulo: 'Etapa 1',
                orderIndex: 1,
                plannedMinutes: 15,
                sourceOrigin: 'manual',
                required: true,
                defaultResponsibleId: null,
              },
            ],
          },
        ],
      },
    ],
    totals: {
      totalOptions: 1,
      totalAreas: 1,
      totalSteps: 1,
      totalMinutes: 15,
    },
    reviewStatus: 'ready',
    estruturaOrigem: 'MONTAGEM_UNIFICADA',
    registeredAtIso: '2026-01-01T00:00:00.000Z',
    ...patch,
  }
  return base
}

describe('mapNovaEsteiraSnapshotToCreateConveyorInput', () => {
  it('mapeia dados e opções sem ids de auditoria no payload', () => {
    const out = mapNovaEsteiraSnapshotToCreateConveyorInput(minimalSnapshot())
    expect(out.dados.nome).toBe('Esteira X')
    expect(out.dados.prioridade).toBe('media')
    expect(out.dados.colaboradorId).toBeNull()
    expect(out.originType).toBe('MANUAL')
    expect(out.options).toHaveLength(1)
    expect(out.options[0]!.titulo).toBe('Opção A')
    expect(out.options[0]!.areas[0]!.steps[0]!.plannedMinutes).toBe(15)
    const json = JSON.stringify(out)
    expect(json).not.toContain('registeredAtIso')
    expect(json).not.toContain('reviewStatus')
    expect(json).not.toContain('totals')
    expect(json).not.toContain('estruturaOrigem')
    expect(json).not.toContain('sourceRefId')
    expect(json).not.toContain('sourceType')
  })

  it('normaliza prioridade vazia para media', () => {
    const out = mapNovaEsteiraSnapshotToCreateConveyorInput(
      minimalSnapshot({
        dados: {
          nome: 'N',
          cliente: '',
          veiculo: '',
          modeloVersao: '',
          placa: '',
          observacoes: '',
          responsavel: '',
          prazoEstimado: '',
          prioridade: '',
        },
      }),
    )
    expect(out.dados.prioridade).toBe('media')
  })

  it('preserva colaboradorId quando definido', () => {
    const id = '550e8400-e29b-41d4-a716-446655440000'
    const out = mapNovaEsteiraSnapshotToCreateConveyorInput(
      minimalSnapshot({
        dados: {
          nome: 'N',
          cliente: '',
          veiculo: '',
          modeloVersao: '',
          placa: '',
          observacoes: '',
          responsavel: '',
          prazoEstimado: '',
          prioridade: 'alta',
          colaboradorId: id,
        },
      }),
    )
    expect(out.dados.colaboradorId).toBe(id)
    expect(out.dados.prioridade).toBe('alta')
  })

  it('omite colaboradorId de mock (não UUID) para compatibilidade com o schema da API', () => {
    const out = mapNovaEsteiraSnapshotToCreateConveyorInput(
      minimalSnapshot({
        dados: {
          nome: 'N',
          cliente: '',
          veiculo: '',
          modeloVersao: '',
          placa: '',
          observacoes: '',
          responsavel: '',
          prazoEstimado: '',
          prioridade: '',
          colaboradorId: 'colab-carlos',
        },
      }),
    )
    expect(out.dados.colaboradorId).toBeNull()
  })

  it('origem BASE preenche snapshots de base no payload', () => {
    const out = mapNovaEsteiraSnapshotToCreateConveyorInput(
      minimalSnapshot({
        originType: 'BASE',
        baseId: 'be-001',
        baseName: 'Base mock',
        baseCode: null,
        baseVersion: null,
      }),
    )
    expect(out.originType).toBe('BASE')
    expect(out.baseId).toBe('be-001')
    expect(out.baseName).toBe('Base mock')
  })
})
