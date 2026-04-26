/**
 * Constrói `EsteiraDetalheMock` a partir do resultado da materialização Nova Esteira,
 * para o detalhe `/app/esteiras/:id` resolver a mesma esteira criada no backlog.
 */

import { getBaseTarefa } from './bases-tarefa-catalog'
import { normalizeBacklogPriority } from './backlog-priority'
import type {
  EsteiraAtividadeMock,
  EsteiraDetalheMock,
  EsteiraStatusGeral,
  EsteiraTarefaMock,
} from './esteira-detalhe-types'
import { labelEstruturaOrigem } from './nova-esteira-domain'
import type { TarefaBlocoDraft } from './nova-esteira-domain'
import { listarAtividadesOrdenadasDaReferencia } from './nova-esteira-referencia-operacional'
import type { NovaEsteiraMaterializacaoResultado } from './nova-esteira-pipeline'
import type { NovaEsteiraDadosIniciais } from './nova-esteira-submit'

/**
 * Setor exibido na linha: a fonte não define setor por atividade; usamos o pacote/bloco.
 * (Transparência explícita — não inventar setor por atividade.)
 */
function setorPadraoParaAtividadesDoBloco(t: TarefaBlocoDraft): string {
  return t.setores[0] ?? 'Operação'
}

/** Exportado para testes — mesma regra do detalhe materializado. */
export function buildAtividadesDetalheTarefa(
  t: TarefaBlocoDraft,
  dados: NovaEsteiraDadosIniciais,
  destino: 'backlog' | 'exec',
): EsteiraAtividadeMock[] {
  const responsavel = dados.responsavel.trim() || 'Equipe'
  const setor = setorPadraoParaAtividadesDoBloco(t)

  const colaboradorIdLinha = dados.colaboradorId

  if (t.sourceBaseTarefaId) {
    const ref = getBaseTarefa(t.sourceBaseTarefaId)
    if (ref) {
      const ordenadas = listarAtividadesOrdenadasDaReferencia(t.sourceBaseTarefaId)
      if (ordenadas.length === 0) {
        return []
      }
      return ordenadas.map((a, i) => ({
        id: `${t.id}-a-${a.id}`,
        nome: a.nome,
        responsavel,
        ...(colaboradorIdLinha ? { colaboradorId: colaboradorIdLinha } : {}),
        setor,
        status:
          destino === 'backlog'
            ? 'pendente'
            : i === 0
              ? 'em_execucao'
              : 'pendente',
        estimativaMin: a.estimativaMin,
        realizadoMin: 0,
      }))
    }
  }

  const n = t.atividadesCount
  if (n <= 0) {
    return []
  }
  const per = Math.max(5, Math.floor(t.estimativaMin / n))
  return Array.from({ length: n }, (_, i) => ({
    id: `${t.id}-a${i + 1}`,
    nome: n === 1 ? t.nome : `${t.nome} — parte ${i + 1}`,
    responsavel,
    ...(colaboradorIdLinha ? { colaboradorId: colaboradorIdLinha } : {}),
    setor,
    status:
      destino === 'backlog' ? 'pendente' : i === 0 ? 'em_execucao' : 'pendente',
    estimativaMin: per,
    realizadoMin: 0,
  }))
}

export function buildEsteiraDetalheFromMaterializacao(
  result: NovaEsteiraMaterializacaoResultado,
): EsteiraDetalheMock {
  const { entrada, destino, tarefasMaterializadas } = result
  const dados = entrada.dados
  const id = result.idsDeterministicos.esteiraId
  const ref = result.idsDeterministicos.refOs
  const veiculoLine = [dados.veiculo.trim(), dados.modeloVersao.trim()]
    .filter(Boolean)
    .join(' · ')
  const veiculo = veiculoLine || '—'

  const statusGeral: EsteiraStatusGeral =
    destino === 'backlog' ? 'no_backlog' : 'em_execucao'

  const tarefas: EsteiraTarefaMock[] = tarefasMaterializadas.map((t) => {
    const atividades = buildAtividadesDetalheTarefa(t, dados, destino)
    return {
      id: t.id,
      nome: t.nome,
      ordem: t.ordem,
      status: destino === 'backlog' ? 'nao_iniciada' : 'em_andamento',
      atividades,
    }
  })

  return {
    id,
    nome: dados.nome.trim() || 'Nova esteira',
    veiculo,
    tipoOrigem: labelEstruturaOrigem(entrada.estruturaOrigem),
    referenciaOs: ref,
    statusGeral,
    prioridade: normalizeBacklogPriority(dados.prioridade),
    prazoTexto: dados.prazoEstimado.trim() || 'Prazo a definir',
    observacaoCurta: dados.observacoes.trim() || undefined,
    tarefas,
  }
}
