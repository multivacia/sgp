/** Regras puras da correção de apontamento pelo próprio colaborador (SGP+ V2, tablet). */

/** Dia de calendário na fábrica (São Paulo), YYYY-MM-DD. */
export function diaNaFabrica(d: Date): string {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
}

export type LancamentoParaCorrigir = {
  collaboratorId: string
  createdAt: Date
  stepStatus: string | null
}

/**
 * Pode corrigir: só o próprio lançamento, feito hoje, com a atividade ainda não concluída/dispensada.
 * Fora disso, só a gestora corrige (pela correção gerencial da V1).
 */
export function bloqueioCorrecao(l: LancamentoParaCorrigir, collaboratorId: string, agora: Date): string | null {
  if (l.collaboratorId !== collaboratorId) return 'Este lançamento não é seu.'
  if (diaNaFabrica(l.createdAt) !== diaNaFabrica(agora)) return 'Só dá para corrigir o que você lançou hoje. Peça para a gestora.'
  if (l.stepStatus === 'COMPLETED') return 'A atividade já foi concluída. Peça para a gestora.'
  if (l.stepStatus === 'ABORTED') return 'A atividade foi dispensada. Peça para a gestora.'
  return null
}

export function erroMotivo(motivo: unknown): string | null {
  const t = typeof motivo === 'string' ? motivo.trim() : ''
  return t.length >= 3 && t.length <= 500 ? null : 'Informe o motivo (3 a 500 caracteres).'
}

export function erroMinutos(minutos: unknown, antes: number): string | null {
  if (typeof minutos !== 'number' || !Number.isInteger(minutos) || minutos < 1 || minutos > 24 * 60) return 'O tempo deve ser de 1 minuto a 24 horas.'
  if (minutos === antes) return 'O tempo é o mesmo de antes.'
  return null
}
