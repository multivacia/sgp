/**
 * Categorias do Painel Operacional de Esteiras — uma por esteira (sem duplicar linhas).
 */

export type OperationalBucket =
  | 'em_elaboracao'
  | 'aguardando_planejamento'
  | 'em_planejamento'
  | 'em_execucao'
  | 'em_atraso'
  | 'finalizadas'
  | 'canceladas'

export type OperationalPanelKpis = {
  emElaboracao: number
  aguardandoPlanejamento: number
  emPlanejamento: number
  emExecucao: number
  emAtraso: number
  finalizadas: number
  canceladas: number
}

export type OperationalStatusUi =
  | 'em_elaboracao'
  | 'aguardando_planejamento'
  | 'em_planejamento'
  | 'a_iniciar'
  | 'em_andamento'
  | 'finalizada'
  | 'cancelada'

export type RowForOperationalBucket = {
  status: OperationalStatusUi
  estimatedDeadline?: string | null
}

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

export function isEsteiraOverdueVersusToday(
  row: Pick<RowForOperationalBucket, 'status' | 'estimatedDeadline'>,
  now: Date = new Date(),
): boolean {
  if (row.status === 'finalizada' || row.status === 'cancelada') return false
  const dl = parseFlexibleDeadlineToDate(row.estimatedDeadline ?? undefined)
  if (dl === null) return false
  const today = startOfLocalDay(now)
  const deadlineDay = startOfLocalDay(dl)
  return today.getTime() > deadlineDay.getTime()
}

export function getOperationalBucket(
  row: RowForOperationalBucket,
  now: Date = new Date(),
): OperationalBucket {
  if (row.status === 'finalizada') return 'finalizadas'
  if (row.status === 'cancelada') return 'canceladas'
  if (isEsteiraOverdueVersusToday(row, now)) return 'em_atraso'
  if (row.status === 'em_elaboracao') return 'em_elaboracao'
  if (row.status === 'aguardando_planejamento') return 'aguardando_planejamento'
  if (row.status === 'em_planejamento') return 'em_planejamento'
  if (row.status === 'a_iniciar' || row.status === 'em_andamento') {
    return 'em_execucao'
  }
  return 'em_execucao'
}

export function computeOperationalPanelKpis(
  rows: RowForOperationalBucket[],
  now: Date = new Date(),
): OperationalPanelKpis {
  const z = {
    emElaboracao: 0,
    aguardandoPlanejamento: 0,
    emPlanejamento: 0,
    emExecucao: 0,
    emAtraso: 0,
    finalizadas: 0,
    canceladas: 0,
  }
  for (const r of rows) {
    const b = getOperationalBucket(r, now)
    if (b === 'em_elaboracao') z.emElaboracao += 1
    else if (b === 'aguardando_planejamento') z.aguardandoPlanejamento += 1
    else if (b === 'em_planejamento') z.emPlanejamento += 1
    else if (b === 'em_execucao') z.emExecucao += 1
    else if (b === 'em_atraso') z.emAtraso += 1
    else if (b === 'finalizadas') z.finalizadas += 1
    else z.canceladas += 1
  }
  return z
}

export const OPERATIONAL_BUCKET_LABELS: Record<OperationalBucket, string> = {
  em_elaboracao: 'Rascunho / Em elaboração',
  aguardando_planejamento: 'Aguardando planejamento',
  em_planejamento: 'Em planejamento',
  em_execucao: 'Em execução',
  em_atraso: 'Em atraso',
  finalizadas: 'Finalizadas',
  canceladas: 'Canceladas',
}

export const OPERATIONAL_SITUACAO_QUERY_VALUES: readonly OperationalBucket[] = [
  'em_elaboracao',
  'aguardando_planejamento',
  'em_planejamento',
  'em_execucao',
  'em_atraso',
  'finalizadas',
  'canceladas',
]

export function isOperationalBucketKey(s: string): s is OperationalBucket {
  return (OPERATIONAL_SITUACAO_QUERY_VALUES as readonly string[]).includes(s)
}

export type BacklogSituacaoQuery = OperationalBucket | 'ativas'

export function isBacklogSituacaoParam(s: string): s is BacklogSituacaoQuery {
  if (s === 'ativas') return true
  return isOperationalBucketKey(s)
}
