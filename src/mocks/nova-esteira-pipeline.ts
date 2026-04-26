/**
 * Pipeline explícito: entrada da montagem → validação → materialização determinística → resumo.
 * Sem efeitos colaterais fora do retorno; mesma entrada ⇒ mesmo resultado.
 *
 * Troca futura: trocar `materializarNovaEsteira` por persistência real (API) mantendo o contrato
 * de entrada (`NovaEsteiraMontagemInput`) e o shape de saída (`BacklogRow` + metadados de auditoria).
 */

import { normalizeBacklogPriority, type BacklogRow } from './backlog'
import {
  materializarBlocosOperacionaisParaDrafts,
} from './nova-esteira-materialize'
import {
  enteredAtDeterministic,
  hashDeterministic,
  idEsteiraMaterializada,
  idTarefaBlocoMaterializada,
  refOsDeterministic,
} from './nova-esteira-deterministic'
import {
  computeResumoDrafts,
  type LinhaBlocoOperacionalDraft,
  type NovaEsteiraEstruturaOrigem,
  type TarefaBlocoDraft,
} from './nova-esteira-domain'
import {
  montagemProntaParaMaterializar,
  snapshotComposicaoMontagem,
  type EntradaComposicao,
  type SnapshotComposicaoMontagem,
} from './nova-esteira-composicao'
import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'
import type { NovaEsteiraBlocoOperacional } from './nova-esteira-bloco-contrato'
import type { NovaEsteiraOpcaoDraft } from './nova-esteira-jornada-draft'

export type NovaEsteiraMontagemInput = {
  dados: NovaEsteiraDadosIniciais
  estruturaOrigem: NovaEsteiraEstruturaOrigem
  linhasManual: LinhaBlocoOperacionalDraft[]
  tarefasNaoManual: TarefaBlocoDraft[]
  baseEsteiraAplicadaId: string | null
  opcoes?: NovaEsteiraOpcaoDraft[]
}

function normalizeDados(d: NovaEsteiraDadosIniciais): string[] {
  return [
    d.nome.trim(),
    d.cliente.trim(),
    d.veiculo.trim(),
    d.modeloVersao.trim(),
    d.placa.trim(),
    d.observacoes.trim(),
    d.responsavel,
    d.prazoEstimado.trim(),
    d.prioridade || 'media',
  ]
}

function serializeLinha(l: LinhaBlocoOperacionalDraft): string {
  return [
    l.instanceId,
    l.catalogoId,
    l.subopcaoId ?? '',
    l.modo ?? '',
    l.referenciaId ?? '',
    l.observacaoManual ?? '',
  ].join('|')
}

function serializeTarefa(t: TarefaBlocoDraft): string {
  return [
    t.nome,
    String(t.ordem),
    t.setores.join(','),
    String(t.atividadesCount),
    String(t.estimativaMin),
    t.observacao ?? '',
    t.sourceBaseTarefaId ?? '',
    t.blocoOperacionalCatalogoId ?? '',
    t.modoMontagem ?? '',
  ].join('|')
}

/** Semente estável derivada apenas dos dados de montagem (determinística). */
export function buildMaterializacaoSeed(input: NovaEsteiraMontagemInput): string {
  const parts: string[] = []
  parts.push(...normalizeDados(input.dados))
  parts.push(input.estruturaOrigem)
  parts.push(input.baseEsteiraAplicadaId ?? '')
  if (input.estruturaOrigem === 'MANUAL') {
    for (const l of input.linhasManual) {
      parts.push(serializeLinha(l))
    }
  } else if (input.estruturaOrigem === 'MONTAGEM_UNIFICADA') {
    for (const l of input.linhasManual) {
      parts.push(serializeLinha(l))
    }
    const sorted = [...input.tarefasNaoManual].sort((a, b) => a.ordem - b.ordem)
    for (const t of sorted) {
      parts.push(serializeTarefa(t))
    }
  } else {
    const sorted = [...input.tarefasNaoManual].sort((a, b) => a.ordem - b.ordem)
    for (const t of sorted) {
      parts.push(serializeTarefa(t))
    }
  }
  return hashDeterministic(parts)
}

export function entradaComposicaoFromMontagem(
  input: NovaEsteiraMontagemInput,
): EntradaComposicao {
  return {
    dados: input.dados,
    estruturaOrigem: input.estruturaOrigem,
    linhasManual: input.linhasManual,
    tarefas:
      input.estruturaOrigem === 'MANUAL' ? [] : input.tarefasNaoManual,
    baseEsteiraAplicadaId: input.baseEsteiraAplicadaId,
    opcoes: input.opcoes,
  }
}

export function validarMontagemNovaEsteira(
  input: NovaEsteiraMontagemInput,
): SnapshotComposicaoMontagem {
  return snapshotComposicaoMontagem(entradaComposicaoFromMontagem(input))
}

function aplicarIdsDeterministicosTarefas(
  tarefas: TarefaBlocoDraft[],
  seed: string,
): TarefaBlocoDraft[] {
  return tarefas.map((t) => ({
    ...t,
    id: idTarefaBlocoMaterializada(seed, t.ordem),
  }))
}

/** Contrato explícito do retorno da materialização mock (UI e fluxos futuros não devem inferir shape). */
export type NovaEsteiraMaterializacaoResultado = {
  seed: string
  /** Snapshot da composição no momento da materialização. */
  validacao: SnapshotComposicaoMontagem
  /** Entrada usada (auditoria). */
  entrada: NovaEsteiraMontagemInput
  destino: 'backlog' | 'exec'
  tarefasMaterializadas: TarefaBlocoDraft[]
  blocosContrato: NovaEsteiraBlocoOperacional[]
  resumoExecutivo: ReturnType<typeof computeResumoDrafts>
  row: BacklogRow
  idsDeterministicos: {
    esteiraId: string
    refOs: string
    tarefaIds: string[]
  }
  /** Igual a `row.enteredAt` — ISO derivado da seed. */
  timestampDeterministico: string
  referenciasOperacionais: {
    basesTarefaIds: string[]
    baseEsteiraId?: string
    estruturaOrigem: NovaEsteiraEstruturaOrigem
  }
  metadadosDebug: Record<string, unknown>
}

/** @deprecated Use NovaEsteiraMaterializacaoResultado */
export type ResultadoMaterializacaoNovaEsteira = NovaEsteiraMaterializacaoResultado

/**
 * Valida e materializa em um único passo previsível. Falha explícita se não estiver pronto.
 */
export function materializarNovaEsteira(
  input: NovaEsteiraMontagemInput,
  destino: 'backlog' | 'exec',
): ResultadoMaterializacaoNovaEsteira {
  const validacao = validarMontagemNovaEsteira(input)
  if (!montagemProntaParaMaterializar(validacao)) {
    throw new Error(
      'Montagem não está pronta para materialização — validação bloqueou o pipeline.',
    )
  }

  const seed = buildMaterializacaoSeed(input)
  let tarefasMaterializadas: TarefaBlocoDraft[]

  if (input.estruturaOrigem === 'MANUAL') {
    tarefasMaterializadas = materializarBlocosOperacionaisParaDrafts(
      input.linhasManual,
      seed,
    )
  } else if (input.estruturaOrigem === 'MONTAGEM_UNIFICADA') {
    const manual = materializarBlocosOperacionaisParaDrafts(
      input.linhasManual,
      seed,
    )
    const refs = aplicarIdsDeterministicosTarefas(input.tarefasNaoManual, seed)
    tarefasMaterializadas = [
      ...manual.map((t, i) => ({ ...t, ordem: i + 1 })),
      ...refs.map((t, i) => ({ ...t, ordem: manual.length + i + 1 })),
    ]
  } else {
    tarefasMaterializadas = aplicarIdsDeterministicosTarefas(
      input.tarefasNaoManual,
      seed,
    )
  }

  const resumo = computeResumoDrafts(tarefasMaterializadas)
  const dados = input.dados
  const ref = refOsDeterministic(seed, dados.placa.trim())
  const name = dados.nome.trim() || 'Nova esteira'
  const basesTarefaIds = [
    ...new Set(
      tarefasMaterializadas
        .map((t) => t.sourceBaseTarefaId)
        .filter((x): x is string => Boolean(x)),
    ),
  ]

  const esteiraId = idEsteiraMaterializada(seed)
  const rowId = `row-${esteiraId}`
  const enteredAt = enteredAtDeterministic(seed)
  const tarefaIds = tarefasMaterializadas.map((t) => t.id)

  const row: BacklogRow = {
    id: rowId,
    ref,
    name,
    origin: 'manual',
    activities: resumo.totalAtividades,
    responsible: dados.responsavel.trim() || '—',
    priority: normalizeBacklogPriority(dados.prioridade),
    status: destino === 'backlog' ? 'no_backlog' : 'em_producao',
    enteredAt,
    esteiraId,
    estruturaOrigem: input.estruturaOrigem,
    baseEsteiraId:
      input.estruturaOrigem === 'BASE_ESTEIRA'
        ? input.baseEsteiraAplicadaId ?? undefined
        : undefined,
    basesTarefaIds: basesTarefaIds.length > 0 ? basesTarefaIds : undefined,
  }

  const baseEsteiraId =
    input.estruturaOrigem === 'BASE_ESTEIRA'
      ? input.baseEsteiraAplicadaId ?? undefined
      : undefined

  const out: NovaEsteiraMaterializacaoResultado = {
    seed,
    validacao,
    entrada: input,
    destino,
    tarefasMaterializadas,
    blocosContrato: validacao.blocos,
    resumoExecutivo: resumo,
    row,
    idsDeterministicos: {
      esteiraId,
      refOs: ref,
      tarefaIds,
    },
    timestampDeterministico: enteredAt,
    referenciasOperacionais: {
      basesTarefaIds: basesTarefaIds,
      baseEsteiraId,
      estruturaOrigem: input.estruturaOrigem,
    },
    metadadosDebug: {
      pipeline: 'nova-esteira-pipeline',
      versaoDominio: 'hardening-1',
      totalTarefasMaterializadas: tarefasMaterializadas.length,
    },
  }

  return out
}
