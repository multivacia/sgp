/**
 * Correção de apontamento pela gestora, pela API da V1 (já existe e é auditada):
 * GET/PATCH/DELETE /conveyors/:conveyorId/steps/:stepNodeId/time-entries[/:id].
 * PATCH exige `expectedUpdatedAt` (se outra pessoa mudou antes, a V1 recusa) e motivo.
 */

export type Lancamento = {
  id: string
  collaboratorId: string
  collaboratorName: string | null
  minutes: number
  notes: string | null
  entryAt: string
  updatedAt: string
}

export const MOTIVOS_CORRECAO = ['Lançou tempo errado', 'Esqueceu de pausar', 'Apontou na atividade errada', 'Lançou em dobro']

export function motivoCorrecao(botao: string | null, detalhe: string): string | null {
  const d = detalhe.trim()
  const t = botao ? (d ? `${botao}: ${d}` : botao) : d
  return t.length >= 3 ? t.slice(0, 500) : null
}

/** Só corrige se o tempo mudou e há motivo. */
export function corpoCorrecao(l: Lancamento, minutos: number, motivo: string | null) {
  const m = Math.round(minutos)
  if (!motivo || m <= 0 || m === l.minutes) return null
  return { expectedUpdatedAt: l.updatedAt, reason: motivo, minutes: m }
}

export function corpoRemocao(motivo: string | null) {
  return motivo ? { reason: motivo } : null
}

export function totalMin(ls: Lancamento[]): number {
  return ls.reduce((s, l) => s + l.minutes, 0)
}
