/**
 * Snapshot resumido da jornada — derivado do domínio (composição), não da UI.
 */

import { labelEstruturaOrigem } from './nova-esteira-domain'
import {
  avaliarComposicaoNovaEsteira,
  snapshotComposicaoMontagem,
  type NovaEsteiraDraft,
} from './nova-esteira-composicao'
import { getMotivoPrincipalDeBloqueio } from './nova-esteira-estado-visual'
import {
  NOVA_ESTEIRA_SNAPSHOT_RESUMIDO_VERSION,
  type NovaEsteiraDestinoPretendido,
  type NovaEsteiraEtapaPersistida,
  type NovaEsteiraRascunhoSnapshotResumido,
  type NovaEsteiraStatusJornada,
} from './nova-esteira-persistido'

export function buildSnapshotResumido(
  draft: NovaEsteiraDraft,
  opts?: { destinoPretendido?: NovaEsteiraDestinoPretendido },
): NovaEsteiraRascunhoSnapshotResumido {
  const snap = snapshotComposicaoMontagem(draft)
  const montagem = snap.resultado.montagem
  const nomeExibicao = draft.dados.nome.trim() || 'Sem título'
  const motivoPrincipalBloqueio = montagem.podeMaterializar
    ? undefined
    : getMotivoPrincipalDeBloqueio(montagem)

  const estruturaOrigemLabel = draft.estruturaOrigem
    ? labelEstruturaOrigem(draft.estruturaOrigem)
    : undefined

  return {
    version: NOVA_ESTEIRA_SNAPSHOT_RESUMIDO_VERSION,
    statusGeralComposicao: montagem.statusGeral,
    podeMaterializar: montagem.podeMaterializar,
    motivoPrincipalBloqueio,
    contagem: {
      validos: montagem.blocosValidos.length,
      pendentes: montagem.blocosPendentes.length,
      invalidos: montagem.blocosInvalidos.length,
    },
    destinoPretendido: opts?.destinoPretendido,
    resumoComposicaoCurto: montagem.resumoOperacional,
    nomeExibicao,
    estruturaOrigemLabel,
  }
}

/**
 * Status da jornada persistido — coerente com etapa e composição, sem duplicar regras de materialização.
 */
export function deriveStatusJornada(
  draft: NovaEsteiraDraft,
  etapa: NovaEsteiraEtapaPersistida,
  materializado: boolean,
  arquivado: boolean,
): NovaEsteiraStatusJornada {
  if (arquivado) return 'arquivado'
  if (materializado) return 'materializado'
  const { montagem } = avaliarComposicaoNovaEsteira(draft)
  if (!montagem.podeMaterializar) return 'em_edicao'
  if (etapa === 'revisao') return 'pronto_materializar'
  return 'pronto_revisao'
}
