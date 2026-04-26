/**
 * Textos operacionais determinísticos (sem IA) — bloco e composição.
 */

import type {
  NovaEsteiraBlocoContextoAvaliacao,
  NovaEsteiraBlocoOperacional,
  NovaEsteiraComposicaoResultado,
} from './nova-esteira-bloco-contrato'
import { MSG } from './nova-esteira-mensagens'

const STATUS_LABEL: Record<NovaEsteiraBlocoOperacional['status'], string> = {
  nao_iniciado: 'Não iniciado',
  incompleto: 'Incompleto',
  configurado: 'Configurado',
  invalido: 'Inválido',
  bloqueado: 'Bloqueado',
}

export function humanizarResumoBloco(
  bloco: NovaEsteiraBlocoOperacional,
  _contexto: NovaEsteiraBlocoContextoAvaliacao,
): string {
  const nome = bloco.nome.trim() || bloco.id
  const st = STATUS_LABEL[bloco.status]
  const pend =
    bloco.pendencias?.length && bloco.pendencias.length > 0
      ? ` — ${bloco.pendencias[0]}`
      : ''
  const ordem = `ordem ${bloco.ordem}`
  const pre =
    (bloco.preRequisitos?.length ?? 0) > 0
      ? ` · requer ${(bloco.preRequisitos ?? []).join(', ')}`
      : ''
  void _contexto
  return `«${nome}» (${st})${pre} · ${ordem}${pend}`
}

export function humanizarResumoComposicao(resultado: NovaEsteiraComposicaoResultado): string {
  const m = resultado.montagem
  if (m.podeMaterializar) {
    return MSG.montagemProntaOperacao
  }
  const motivos = m.motivosQueImpedemMaterializacao
  if (motivos.length > 0) {
    return motivos.slice(0, 3).join(' ')
  }
  const p = m.pendenciasCriticas
  if (p.length > 0) {
    return p.slice(0, 3).join(' ')
  }
  return MSG.revisePendentes
}
