/**
 * Mesma regra que `src/lib/backlog/operationalBuckets.ts` (Painel Operacional de Esteiras).
 * Usado no servidor para ordenação de “Minhas atividades”.
 */

export type OperationalBucket =
  | 'no_backlog'
  | 'em_revisao'
  | 'em_andamento'
  | 'em_atraso'
  | 'concluidas'

type OperationalStatusUi =
  | 'no_backlog'
  | 'em_revisao'
  | 'pronta_liberar'
  | 'em_producao'
  | 'concluida'

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
  if (row.status === 'concluida') return false
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
    case 'NO_BACKLOG':
      return 'no_backlog'
    case 'EM_REVISAO':
      return 'em_revisao'
    case 'PRONTA_LIBERAR':
      return 'pronta_liberar'
    case 'EM_PRODUCAO':
      return 'em_producao'
    case 'CONCLUIDA':
      return 'concluida'
    default:
      return 'em_producao'
  }
}

export function getOperationalBucketForConveyor(
  operationalStatus: string,
  estimatedDeadline: string | null | undefined,
  now: Date = new Date(),
): OperationalBucket {
  const status = mapDbStatusToUi(operationalStatus)
  const row = { status, estimatedDeadline }
  if (status === 'concluida') return 'concluidas'
  if (isEsteiraOverdueVersusToday(row, now)) return 'em_atraso'
  if (status === 'no_backlog') return 'no_backlog'
  if (status === 'em_revisao') return 'em_revisao'
  if (status === 'pronta_liberar' || status === 'em_producao') {
    return 'em_andamento'
  }
  return 'em_andamento'
}

/** Ordem na lista: atraso → revisão → andamento → backlog → concluídas. */
export function operationalBucketSortRank(b: OperationalBucket): number {
  const order: Record<OperationalBucket, number> = {
    em_atraso: 0,
    em_revisao: 1,
    em_andamento: 2,
    no_backlog: 3,
    concluidas: 4,
  }
  return order[b]
}
