/**
 * Categorias do Painel Operacional de Esteiras — uma por esteira (sem duplicar linhas).
 *
 * Regra de prioridade (primeira que aplicar):
 * 1. **concluidas** — `operational_status` da esteira = CONCLUIDA.
 * 2. **em_atraso** — não concluída, `estimatedDeadline` informado e interpretável,
 *    e data do prazo (dia civil local) **anterior** ao dia civil atual (local).
 *    Sem prazo válido → não entra em atraso por data (permanece no bucket de status).
 * 3. **no_backlog** — NO_BACKLOG.
 * 4. **em_revisao** — EM_REVISAO.
 * 5. **em_andamento** — PRONTA_LIBERAR ou EM_PRODUCAO (execução / fila de liberação sem atraso de prazo).
 *
 * Os cards e a coluna "Situação" da tabela usam este mesmo enquadramento.
 * Fonte: mesma coleção de linhas que alimenta a listagem (`BacklogRow` + prazo da esteira).
 */

export type OperationalBucket =
  | 'no_backlog'
  | 'em_revisao'
  | 'em_andamento'
  | 'em_atraso'
  | 'concluidas'

export type OperationalPanelKpis = {
  noBacklog: number
  emRevisao: number
  emAndamento: number
  emAtraso: number
  concluidas: number
}

/** Status operacional mapeado na UI (alinhado a `BacklogStatus` / API). */
export type OperationalStatusUi =
  | 'no_backlog'
  | 'em_revisao'
  | 'pronta_liberar'
  | 'em_producao'
  | 'concluida'

export type RowForOperationalBucket = {
  status: OperationalStatusUi
  estimatedDeadline?: string | null
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d.getTime())
  x.setHours(0, 0, 0, 0)
  return x
}

/** Interpreta prazo livre (ISO ou dd/mm/aaaa) para comparação de calendário. */
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
  if (row.status === 'concluida') return false
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
  if (row.status === 'concluida') return 'concluidas'
  if (isEsteiraOverdueVersusToday(row, now)) return 'em_atraso'
  if (row.status === 'no_backlog') return 'no_backlog'
  if (row.status === 'em_revisao') return 'em_revisao'
  if (row.status === 'pronta_liberar' || row.status === 'em_producao') {
    return 'em_andamento'
  }
  return 'em_andamento'
}

/** KPIs = mesma regra de `getOperationalBucket`, sobre o conjunto de linhas passado (ex.: todas as esteiras carregadas). */
export function computeOperationalPanelKpis(
  rows: RowForOperationalBucket[],
  now: Date = new Date(),
): OperationalPanelKpis {
  const z = {
    noBacklog: 0,
    emRevisao: 0,
    emAndamento: 0,
    emAtraso: 0,
    concluidas: 0,
  }
  for (const r of rows) {
    const b = getOperationalBucket(r, now)
    if (b === 'no_backlog') z.noBacklog += 1
    else if (b === 'em_revisao') z.emRevisao += 1
    else if (b === 'em_andamento') z.emAndamento += 1
    else if (b === 'em_atraso') z.emAtraso += 1
    else z.concluidas += 1
  }
  return z
}

export const OPERATIONAL_BUCKET_LABELS: Record<OperationalBucket, string> = {
  no_backlog: 'No backlog',
  em_revisao: 'Em revisão',
  em_andamento: 'Em andamento',
  em_atraso: 'Em atraso',
  concluidas: 'Concluídas',
}

/**
 * Valores aceites em `?situacao=` no painel (`/app/backlog`).
 * Para “ativas” (não concluídas), o produto prefere `?scope=ativas`; `situacao=ativas` permanece legado.
 */
export const OPERATIONAL_SITUACAO_QUERY_VALUES: readonly OperationalBucket[] = [
  'no_backlog',
  'em_revisao',
  'em_andamento',
  'em_atraso',
  'concluidas',
]

export function isOperationalBucketKey(s: string): s is OperationalBucket {
  return (OPERATIONAL_SITUACAO_QUERY_VALUES as readonly string[]).includes(s)
}

/** Inclui buckets oficiais + `ativas` (não concluídas), usado em `?situacao=` do backlog. */
export type BacklogSituacaoQuery = OperationalBucket | 'ativas'

export function isBacklogSituacaoParam(s: string): s is BacklogSituacaoQuery {
  if (s === 'ativas') return true
  return isOperationalBucketKey(s)
}
