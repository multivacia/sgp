/**
 * Mesma regra que `src/lib/backlog/operationalBuckets.ts` (Painel Operacional de Esteiras).
 * Usado no servidor para ordenação de “Minhas atividades”.
 */

export type OperationalBucket =
  | 'em_elaboracao'
  | 'aguardando_planejamento'
  | 'em_planejamento'
  | 'em_execucao'
  | 'em_atraso'
  | 'finalizadas'
  | 'canceladas'

type OperationalStatusUi =
  | 'em_elaboracao'
  | 'aguardando_planejamento'
  | 'em_planejamento'
  | 'a_iniciar'
  | 'em_andamento'
  | 'finalizada'
  | 'cancelada'

function startOfLocalDay(d: Date): Date {
  const x = new Date(d.getTime())
  x.setHours(0, 0, 0, 0)
  return x
}

export function parseFlexibleDeadlineToDate(
  value: string | null | undefined,
): Date | null {
  if (value == null || value.trim() === '') return null
  const t = value.trim()
  const iso = Date.parse(t)
  if (!Number.isNaN(iso)) return new Date(iso)
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t)
  if (br) {
    const dd = Number(br[1])
    const mm = Number(br[2]) - 1
    const yy = Number(br[3])
    const d = new Date(yy, mm, dd)
    if (!Number.isNaN(d.getTime())) return d
  }
  return null
}

function isEsteiraOverdueVersusToday(
  row: Pick<{ status: OperationalStatusUi; estimatedDeadline?: string | null }, 'status' | 'estimatedDeadline'>,
  now: Date = new Date(),
): boolean {
  if (row.status === 'finalizada' || row.status === 'cancelada') return false
  const dl = parseFlexibleDeadlineToDate(row.estimatedDeadline ?? undefined)
  if (dl === null) return false
  const today = startOfLocalDay(now)
  const deadlineDay = startOfLocalDay(dl)
  return today.getTime() > deadlineDay.getTime()
}

function mapDbStatusToUi(
  operationalStatus: string,
): OperationalStatusUi {
  switch (operationalStatus) {
    case 'EM_ELABORACAO':
      return 'em_elaboracao'
    case 'AGUARDANDO_PLANEJAMENTO':
      return 'aguardando_planejamento'
    case 'EM_PLANEJAMENTO':
      return 'em_planejamento'
    case 'A_INICIAR':
      return 'a_iniciar'
    case 'EM_ANDAMENTO':
      return 'em_andamento'
    case 'FINALIZADA':
      return 'finalizada'
    case 'CANCELADA':
      return 'cancelada'
    default:
      return 'em_andamento'
  }
}

export function getOperationalBucketForConveyor(
  operationalStatus: string,
  estimatedDeadline: string | null | undefined,
  now: Date = new Date(),
): OperationalBucket {
  const status = mapDbStatusToUi(operationalStatus)
  const row = { status, estimatedDeadline }
  if (status === 'finalizada') return 'finalizadas'
  if (status === 'cancelada') return 'canceladas'
  if (isEsteiraOverdueVersusToday(row, now)) return 'em_atraso'
  if (status === 'em_elaboracao') return 'em_elaboracao'
  if (status === 'aguardando_planejamento') return 'aguardando_planejamento'
  if (status === 'em_planejamento') return 'em_planejamento'
  if (status === 'a_iniciar' || status === 'em_andamento') {
    return 'em_execucao'
  }
  return 'em_execucao'
}

/** Ordem na lista: atraso → planejamento → execução → rascunho → finalizadas → canceladas. */
export function operationalBucketSortRank(b: OperationalBucket): number {
  const order: Record<OperationalBucket, number> = {
    em_atraso: 0,
    aguardando_planejamento: 1,
    em_planejamento: 2,
    em_execucao: 3,
    em_elaboracao: 4,
    finalizadas: 5,
    canceladas: 6,
  }
  return order[b]
}
