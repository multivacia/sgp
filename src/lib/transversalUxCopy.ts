/**
 * Microcopy transversal (jornadas, contexto operacional, navegação).
 * Manter frases curtas e acionáveis.
 */

import { ApiError } from './api/apiErrors'
import type { SgpNormalizedError } from './errors/sgpErrorContract'

export const transversalUxCopy = {
  /** Conta sem vínculo operacional (apontamentos, jornada self, etc.). */
  collaboratorLinkMissingTitle: 'Contexto operacional em falta',
  collaboratorLinkMissingBody:
    'Sua conta não está associada a um colaborador operacional. Peça ao administrador para vincular seu usuário a um colaborador antes de registrar horas ou ver sua jornada.',
  collaboratorLinkMissingToast:
    'Conta sem colaborador operacional associado. Contate o administrador.',

  journeyLoadFallback: 'Não foi possível carregar a jornada operacional.',
  journeyRetryHint: 'Verifique a ligação e tente novamente.',
  journeyErrorNoCollaborator:
    'Não foi possível carregar a jornada: sua conta não tem colaborador operacional associado. Contate o administrador.',

  journeyEmptyFiltered:
    'Sem alocações ou apontamentos neste recorte. Experimente outro período ou remova o filtro de esteira.',
  journeyEmptyNoAssignments:
    'Sem alocações em aberto neste período. Consulte Minhas atividades ou o backlog para encontrar trabalho.',

  gestorSelectCollaboratorTitle: 'Escolha um colaborador',
  gestorSelectCollaboratorBody:
    'Selecione um colaborador na lista para carregar a jornada operacional (carga, risco e histórico).',
  gestorOpenCollaborators: 'Abrir cadastro de colaboradores',

  /** Rodapé curto para CTAs que abrem outro contexto. */
  navHintBacklog: 'No backlog pode filtrar por situação e prioridade.',
  navHintMinhasAtividades: 'Em Minhas atividades vê as suas alocações atuais.',
} as const

/**
 * Mensagem segura para a jornada: reutiliza o contrato normalizado e só aplica heurística
 * de «sem colaborador operacional» quando o backend/API indica isso explicitamente.
 */
export function resolveJourneyLoadUserMessage(
  err: unknown,
  normalized: SgpNormalizedError,
): string {
  if (err instanceof ApiError) {
    const m = err.message.toLowerCase()
    const noOperationalLink =
      m.includes('collaborator_id') ||
      m.includes('sem colaborador operacional') ||
      m.includes('sem colaborador associado') ||
      m.includes('utilizador sem colaborador') ||
      (m.includes('collaborator') &&
        (m.includes('missing') ||
          m.includes('required') ||
          m.includes('not linked') ||
          m.includes('not associated')))
    if (noOperationalLink) {
      return transversalUxCopy.journeyErrorNoCollaborator
    }
  }
  return normalized.userMessage
}
