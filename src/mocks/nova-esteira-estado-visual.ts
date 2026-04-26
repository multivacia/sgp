/**
 * Estados visuais e leitura executiva da montagem — derivados do domínio, sem regra de negócio duplicada.
 *
 * Eixo separado de `statusJornada` (persistido): aqui só há leitura de `NovaEsteiraMontagem` + etapa
 * local para badges/hints. Já materializado/arquivado é tratado no repositório, não nestes helpers.
 */

import type { NovaEsteiraMontagem } from './nova-esteira-bloco-contrato'
import { MSG, MSG_RODAPE } from './nova-esteira-mensagens'

/** Estados que a UI pode representar sem reinterpretar regras. */
export type NovaEsteiraEstadoVisualMontagem =
  | 'vazio'
  | 'incompleto'
  | 'dependente'
  | 'invalido'
  | 'pronto_revisao'
  | 'pronto_materializar'
  | 'materializacao_bloqueada'

export function getEstadoVisualDaMontagem(
  montagem: NovaEsteiraMontagem,
  etapa:
    | 'montagem'
    | 'revisao'
    | 'dados_iniciais'
    | 'estrutura_montagem',
): NovaEsteiraEstadoVisualMontagem {
  const { statusGeral, podeMaterializar } = montagem

  if (etapa === 'revisao' && !podeMaterializar) {
    return 'materializacao_bloqueada'
  }

  switch (statusGeral) {
    case 'vazia':
      return 'vazio'
    case 'incompleta':
      return 'incompleto'
    case 'bloqueada':
      return 'dependente'
    case 'invalida':
      return 'invalido'
    case 'valida':
      return etapa === 'revisao' ? 'pronto_materializar' : 'pronto_revisao'
    default:
      return 'incompleto'
  }
}

export function getMotivoPrincipalDeBloqueio(montagem: NovaEsteiraMontagem): string {
  if (montagem.podeMaterializar) {
    return MSG.montagemProntaOperacao
  }
  const m = montagem.motivosQueImpedemMaterializacao
  if (m.length > 0) return m[0]
  const p = montagem.pendenciasCriticas
  if (p.length > 0) return p[0]
  return MSG.revisePendentes
}

export function getResumoDePendenciasCriticas(montagem: NovaEsteiraMontagem): string {
  const p = montagem.pendenciasCriticas
  if (p.length === 0) return ''
  return p.slice(0, 4).join(' ')
}

export const LABEL_ESTADO_VISUAL: Record<NovaEsteiraEstadoVisualMontagem, string> = {
  vazio: 'Sem montagem',
  incompleto: 'Incompleto',
  dependente: 'Aguardando outro bloco',
  invalido: 'Inválido',
  pronto_revisao: 'Pronto para revisar',
  pronto_materializar: 'Pronto para criar',
  materializacao_bloqueada: 'Criação bloqueada',
}

/** Checkpoint na revisão — derivado de `statusGeral` + `podeMaterializar`, só leitura. */
export type NivelCheckpointRevisao = 'pronto' | 'atencao' | 'bloqueado'

export function getNivelCheckpointRevisao(m: NovaEsteiraMontagem): NivelCheckpointRevisao {
  if (m.podeMaterializar) return 'pronto'
  if (m.statusGeral === 'invalida') return 'bloqueado'
  return 'atencao'
}

export const LABEL_CHECKPOINT_REVISAO: Record<NivelCheckpointRevisao, string> = {
  pronto: 'Pronto para criar',
  atencao: 'Ajustes pendentes',
  bloqueado: 'Bloqueado — corrigir antes de criar',
}

export function classesCheckpointRevisao(nivel: NivelCheckpointRevisao): string {
  if (nivel === 'pronto') {
    return 'border-emerald-500/30 bg-emerald-500/[0.09] text-emerald-100'
  }
  if (nivel === 'bloqueado') {
    return 'border-rose-500/35 bg-rose-500/[0.08] text-rose-100'
  }
  return 'border-amber-500/30 bg-amber-500/[0.07] text-amber-100'
}

/** Hint do rodapé na etapa montagem — usa domínio, sem reinterpretar regras. */
export function getTextoRodapeMontagem(montagem: NovaEsteiraMontagem): string {
  if (montagem.podeMaterializar) return MSG_RODAPE.continuarRevisao
  return getMotivoPrincipalDeBloqueio(montagem)
}

/** Hint do rodapé na etapa revisão. */
export function getTextoRodapeRevisao(montagem: NovaEsteiraMontagem): string {
  if (montagem.podeMaterializar) return MSG_RODAPE.revisaoConfirmar
  return `${MSG_RODAPE.montagemDeixouPronta} ${getMotivoPrincipalDeBloqueio(montagem)}`
}

export function classesBadgeEstadoVisual(
  estado: NovaEsteiraEstadoVisualMontagem,
): string {
  if (estado === 'pronto_revisao' || estado === 'pronto_materializar') {
    return 'bg-emerald-500/18 text-emerald-100 ring-1 ring-emerald-500/25'
  }
  if (estado === 'materializacao_bloqueada' || estado === 'dependente') {
    return 'bg-amber-500/16 text-amber-100 ring-1 ring-amber-500/22'
  }
  if (estado === 'invalido') {
    return 'bg-rose-500/16 text-rose-100 ring-1 ring-rose-500/25'
  }
  return 'bg-white/[0.07] text-slate-200 ring-1 ring-white/[0.08]'
}
