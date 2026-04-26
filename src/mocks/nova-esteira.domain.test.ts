import { describe, expect, it } from 'vitest'
import { cloneBaseEsteiraParaDrafts, getBaseEsteira } from './bases-esteira-catalog'
import { humanizarResumoComposicao } from './nova-esteira-humanizacao'
import { MSG } from './nova-esteira-mensagens'
import {
  avaliarComposicaoNovaEsteira,
  canMaterializarNovaEsteira,
  snapshotComposicaoMontagem,
} from './nova-esteira-composicao'
import {
  getCenarioNovaEsteiraMock,
  listCenariosNovaEsteiraMock,
  NOVA_ESTEIRA_EXEMPLO_BLOQUEADA_PREREQ,
  NOVA_ESTEIRA_EXEMPLO_INVALIDA_CONFLITO,
  NOVA_ESTEIRA_EXEMPLO_INCOMPLETA,
  NOVA_ESTEIRA_EXEMPLO_INVALIDA_PISO,
  NOVA_ESTEIRA_EXEMPLO_MANUAL_VALIDA_RICA,
  NOVA_ESTEIRA_EXEMPLO_QUASE_CRITICA,
  NOVA_ESTEIRA_EXEMPLO_ROBUSTA_VALIDA,
  NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL,
  NOVA_ESTEIRA_EXEMPLO_VAZIA,
} from './nova-esteira-composicao-exemplos'
import type { NovaEsteiraDraft } from './nova-esteira-composicao'
import {
  buildMaterializacaoSeed,
  materializarNovaEsteira,
  type NovaEsteiraMontagemInput,
} from './nova-esteira-pipeline'
import { bulletsResumoExecutivoRevisao } from './nova-esteira-resumo-humanizado'
import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'

function dadosPadrao(over?: Partial<NovaEsteiraDadosIniciais>): NovaEsteiraDadosIniciais {
  return {
    nome: 'Teste domínio',
    cliente: '',
    veiculo: '',
    modeloVersao: '',
    placa: 'TST1A11',
    observacoes: '',
    responsavel: 'A',
    prazoEstimado: '',
    prioridade: 'media',
    ...over,
  }
}

function inputManualValido(): NovaEsteiraMontagemInput {
  return {
    dados: dadosPadrao(),
    estruturaOrigem: 'MANUAL',
    linhasManual: NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL.linhasManual,
    tarefasNaoManual: [],
    baseEsteiraAplicadaId: null,
  }
}

function inputFromDraft(d: NovaEsteiraDraft): NovaEsteiraMontagemInput {
  if (d.estruturaOrigem !== 'MANUAL') {
    throw new Error('inputFromDraft: esperado origem MANUAL')
  }
  return {
    dados: d.dados,
    estruturaOrigem: 'MANUAL',
    linhasManual: d.linhasManual,
    tarefasNaoManual: d.tarefas,
    baseEsteiraAplicadaId: d.baseEsteiraAplicadaId,
  }
}

describe('Nova Esteira — composição', () => {
  it('composição vazia', () => {
    const r = avaliarComposicaoNovaEsteira(NOVA_ESTEIRA_EXEMPLO_VAZIA)
    expect(r.montagem.statusGeral).toBe('vazia')
    expect(r.montagem.podeMaterializar).toBe(false)
    expect(r.montagem.motivosQueImpedemMaterializacao.length).toBeGreaterThan(0)
  })

  it('composição vazia de blocos com origem MANUAL (incompleta)', () => {
    const r = avaliarComposicaoNovaEsteira(NOVA_ESTEIRA_EXEMPLO_INCOMPLETA)
    expect(r.montagem.statusGeral).toBe('incompleta')
    expect(r.montagem.podeMaterializar).toBe(false)
  })

  it('obrigatórios faltando (limpeza) em MANUAL', () => {
    const r = avaliarComposicaoNovaEsteira({
      ...NOVA_ESTEIRA_EXEMPLO_INCOMPLETA,
      linhasManual: [
        {
          instanceId: 'only-carpete',
          catalogoId: 'bo-carpete',
          modo: 'BASICO',
        },
      ],
    })
    expect(r.montagem.pendenciasCriticas.some((p) => p.toLowerCase().includes('obrigatório'))).toBe(
      true,
    )
    expect(canMaterializarNovaEsteira({
      ...NOVA_ESTEIRA_EXEMPLO_INCOMPLETA,
      linhasManual: [
        {
          instanceId: 'only-carpete',
          catalogoId: 'bo-carpete',
          modo: 'BASICO',
        },
      ],
    })).toBe(false)
  })

  it('composição dependente por pré-requisito', () => {
    const r = avaliarComposicaoNovaEsteira(NOVA_ESTEIRA_EXEMPLO_BLOQUEADA_PREREQ)
    expect(r.montagem.statusGeral).toBe('bloqueada')
    expect(r.montagem.blocosDependentes.length).toBeGreaterThan(0)
    expect(r.montagem.dependenciasNaoResolvidas.length).toBeGreaterThan(0)
  })

  it('composição inválida por incompatibilidade', () => {
    const r = avaliarComposicaoNovaEsteira(NOVA_ESTEIRA_EXEMPLO_INVALIDA_CONFLITO)
    expect(r.montagem.statusGeral).toBe('invalida')
    expect(r.montagem.blocosInvalidos.length).toBe(2)
    expect(r.montagem.inconsistencias.length).toBeGreaterThan(0)
  })

  it('composição inválida por piso carpete vs vinílico', () => {
    const r = avaliarComposicaoNovaEsteira(NOVA_ESTEIRA_EXEMPLO_INVALIDA_PISO)
    expect(r.montagem.statusGeral).toBe('invalida')
    expect(r.montagem.blocosInvalidos.length).toBe(2)
  })

  it('montagem manual válida com mais blocos', () => {
    const r = avaliarComposicaoNovaEsteira(NOVA_ESTEIRA_EXEMPLO_MANUAL_VALIDA_RICA)
    expect(r.montagem.statusGeral).toBe('valida')
    expect(r.montagem.blocosValidos.length).toBe(3)
  })

  it('montagem robusta válida — perfil e recomendações leves', () => {
    const r = avaliarComposicaoNovaEsteira(NOVA_ESTEIRA_EXEMPLO_ROBUSTA_VALIDA)
    expect(r.montagem.statusGeral).toBe('valida')
    expect(r.montagem.blocosValidos.length).toBeGreaterThan(5)
    expect(r.montagem.resumoOperacional).toContain('Perfil:')
    expect(r.montagem.recomendacoesLeves?.length).toBeGreaterThan(0)
  })

  it('quase pronta — obrigatório crítico (limpeza) ausente', () => {
    const r = avaliarComposicaoNovaEsteira(NOVA_ESTEIRA_EXEMPLO_QUASE_CRITICA)
    expect(r.montagem.podeMaterializar).toBe(false)
    expect(r.montagem.pendenciasCriticas.some((p) => p.toLowerCase().includes('obrigatório'))).toBe(
      true,
    )
  })

  it('cenários mockados — identidade e lookup', () => {
    const list = listCenariosNovaEsteiraMock()
    expect(list.length).toBeGreaterThanOrEqual(8)
    const rob = getCenarioNovaEsteiraMock('robusta-valida')
    expect(rob?.version).toBe(1)
    expect(rob?.draft).toEqual(NOVA_ESTEIRA_EXEMPLO_ROBUSTA_VALIDA)
    expect(rob?.destinoSugerido).toBe('exec')
  })

  it('composição válida e pronta (manual)', () => {
    const r = avaliarComposicaoNovaEsteira(NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL)
    expect(r.montagem.statusGeral).toBe('valida')
    expect(r.montagem.podeMaterializar).toBe(true)
    expect(r.montagem.blocosValidos.length).toBe(1)
    expect(r.montagem.motivosQueImpedemMaterializacao).toEqual([])
  })
})

describe('Nova Esteira — materialização', () => {
  it('materialização bloqueada quando não pronta', () => {
    expect(() =>
      materializarNovaEsteira(
        {
          dados: dadosPadrao(),
          estruturaOrigem: 'MANUAL',
          linhasManual: [],
          tarefasNaoManual: [],
          baseEsteiraAplicadaId: null,
        },
        'backlog',
      ),
    ).toThrow()
  })

  it('materialização determinística com mesma entrada', () => {
    const a = materializarNovaEsteira(inputManualValido(), 'backlog')
    const b = materializarNovaEsteira(inputManualValido(), 'backlog')
    expect(a.seed).toBe(b.seed)
    expect(a.row.id).toBe(b.row.id)
    expect(a.idsDeterministicos.esteiraId).toBe(a.row.esteiraId)
    expect(a.row.id).toBe(`row-${a.row.esteiraId}`)
    expect(a.timestampDeterministico).toBe(a.row.enteredAt)
    expect(a.resumoExecutivo).toEqual(b.resumoExecutivo)
  })

  it('materialização diferente quando entrada muda', () => {
    const base = inputManualValido()
    const a = materializarNovaEsteira(base, 'backlog')
    const b = materializarNovaEsteira(
      { ...base, dados: { ...base.dados, nome: 'Outro nome' } },
      'backlog',
    )
    expect(a.row.id).not.toBe(b.row.id)
    expect(buildMaterializacaoSeed(base)).not.toBe(
      buildMaterializacaoSeed({ ...base, dados: { ...base.dados, nome: 'Outro nome' } }),
    )
  })

  it('materialização determinística com montagem robusta expandida', () => {
    const inp = inputFromDraft(NOVA_ESTEIRA_EXEMPLO_ROBUSTA_VALIDA)
    const a = materializarNovaEsteira(inp, 'exec')
    const b = materializarNovaEsteira(inp, 'exec')
    expect(a.seed).toBe(b.seed)
    expect(a.tarefasMaterializadas.length).toBeGreaterThan(5)
    expect(a.destino).toBe('exec')
  })

  it('resultado de materialização expõe contrato completo', () => {
    const r = materializarNovaEsteira(inputManualValido(), 'exec')
    expect(r.entrada.estruturaOrigem).toBe('MANUAL')
    expect(r.destino).toBe('exec')
    expect(r.referenciasOperacionais.estruturaOrigem).toBe('MANUAL')
    expect(r.metadadosDebug.pipeline).toBe('nova-esteira-pipeline')
    expect(r.tarefasMaterializadas.length).toBeGreaterThan(0)
  })

  it('destino backlog vs exec mapeia status da row do backlog', () => {
    const bl = materializarNovaEsteira(inputManualValido(), 'backlog')
    const ex = materializarNovaEsteira(inputManualValido(), 'exec')
    expect(bl.row.status).toBe('no_backlog')
    expect(ex.row.status).toBe('em_producao')
    expect(bl.row.esteiraId).toBeDefined()
    expect(bl.row.id).toMatch(/^row-ne-/)
  })

  it('BASE_ESTEIRA válida materializa', () => {
    const be = getBaseEsteira('be-001')
    expect(be).toBeDefined()
    const tarefas = cloneBaseEsteiraParaDrafts(be!)
    const input: NovaEsteiraMontagemInput = {
      dados: dadosPadrao(),
      estruturaOrigem: 'BASE_ESTEIRA',
      linhasManual: [],
      tarefasNaoManual: tarefas,
      baseEsteiraAplicadaId: 'be-001',
    }
    const r = materializarNovaEsteira(input, 'backlog')
    expect(r.row.estruturaOrigem).toBe('BASE_ESTEIRA')
    expect(r.referenciasOperacionais.baseEsteiraId).toBe('be-001')
  })
})

describe('Nova Esteira — humanização', () => {
  it('resumo humanizado coerente com montagem válida', () => {
    const r = avaliarComposicaoNovaEsteira(NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL)
    expect(humanizarResumoComposicao(r)).toBe(MSG.montagemProntaOperacao)
  })

  it('resumo humanizado coerente com montagem inválida', () => {
    const r = avaliarComposicaoNovaEsteira(NOVA_ESTEIRA_EXEMPLO_INVALIDA_CONFLITO)
    expect(humanizarResumoComposicao(r)).toContain(MSG.blocosInvalidosImpedem)
  })

  it('revisão — bullets com controles e composição na montagem robusta', () => {
    const snap = snapshotComposicaoMontagem(NOVA_ESTEIRA_EXEMPLO_ROBUSTA_VALIDA)
    const bullets = bulletsResumoExecutivoRevisao({
      dados: NOVA_ESTEIRA_EXEMPLO_ROBUSTA_VALIDA.dados,
      estruturaOrigem: 'MANUAL',
      tarefasEfetivas: snap.resultado.montagem.blocosValidos.map((b, i) => ({
        id: b.id,
        nome: b.nome,
        ordem: i + 1,
        setores: ['Tapeçaria'],
        atividadesCount: 1,
        estimativaMin: 60,
      })),
      snap,
    })
    expect(bullets.some((l) => l.includes('Controles na esteira'))).toBe(true)
    expect(bullets.some((l) => l.includes('Composição:'))).toBe(true)
  })
})
