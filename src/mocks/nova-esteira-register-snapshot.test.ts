import { describe, expect, it } from 'vitest'
import { buildNovaEsteiraRegisterSnapshot } from './nova-esteira-register-snapshot'
import { criarOpcaoManualComEstruturaMinima } from './nova-esteira-opcoes-helpers'

describe('buildNovaEsteiraRegisterSnapshot', () => {
  it('usa originType MANUAL sem base aplicada', () => {
    const op = criarOpcaoManualComEstruturaMinima(1)
    const s = buildNovaEsteiraRegisterSnapshot({
      dados: {
        nome: 'E1',
        cliente: '',
        veiculo: '',
        modeloVersao: '',
        placa: '',
        observacoes: '',
        responsavel: 'Ana',
        colaboradorId: undefined,
        prazoEstimado: '',
        prioridade: 'media',
      },
      estruturaOrigem: 'MONTAGEM_UNIFICADA',
      opcoes: [op],
      baseEsteiraAplicadaId: null,
      baseCatalogItem: null,
      prontaParaRegistrar: true,
    })
    expect(s.originType).toBe('MANUAL')
    expect(s.baseId).toBeNull()
    expect(s.totals.totalOptions).toBe(1)
    expect(s.reviewStatus).toBe('ready')
  })

  it('usa originType BASE quando veio de base de catálogo', () => {
    const op = criarOpcaoManualComEstruturaMinima(1)
    const s = buildNovaEsteiraRegisterSnapshot({
      dados: {
        nome: 'E2',
        cliente: 'C',
        veiculo: 'V',
        modeloVersao: '',
        placa: '',
        observacoes: '',
        responsavel: 'Bob',
        colaboradorId: undefined,
        prazoEstimado: '',
        prioridade: '',
      },
      estruturaOrigem: 'BASE_ESTEIRA',
      opcoes: [op],
      baseEsteiraAplicadaId: 'be-001',
      baseCatalogItem: {
        id: 'be-001',
        nome: 'Base mock',
        veiculoContexto: '',
        tipo: '',
        tags: [],
        descricaoCurta: '',
        tarefas: [],
      },
      prontaParaRegistrar: false,
    })
    expect(s.originType).toBe('BASE')
    expect(s.baseName).toBe('Base mock')
    expect(s.reviewStatus).toBe('incomplete')
  })
})
