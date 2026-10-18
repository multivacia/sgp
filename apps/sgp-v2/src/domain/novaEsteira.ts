/**
 * Nova esteira pelo "cardápio": matriz (combo) → etapas (TASK) → setores (SECTOR) → atividades (ACTIVITY).
 * Monta o corpo do POST /api/v1/conveyors da V1 — as regras finais continuam no backend.
 */
import { dadosParaCriar, type DadosEsteira } from './dadosEsteira'

export type MatrixNodeType = 'ITEM' | 'TASK' | 'SECTOR' | 'ACTIVITY'

/** Subconjunto de MatrixNodeTreeApi (GET /api/v1/operation-matrix/items/:id/tree). */
export type MatrixNode = {
  id: string
  node_type: MatrixNodeType
  name: string
  description: string | null
  order_index: number
  is_active: boolean
  planned_minutes: number | null
  default_responsible_id: string | null
  team_ids: string[]
  required: boolean
  source_key: string | null
  children: MatrixNode[]
}

export type Collaborator = { id: string; full_name: string; nickname: string | null; sector_name: string | null }

/** Nome curto para botões: apelido ou primeiro + último nome. */
export function nomeCurto(c: Collaborator | undefined): string {
  if (!c) return 'Sem responsável'
  if (c.nickname?.trim()) return c.nickname.trim()
  const parts = c.full_name.trim().split(/\s+/)
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0]
}


/** Escolhas da gestora sobre a matriz: atividades tiradas e responsáveis trocados. */
export type Draft = {
  off: Set<string>
  resp: Record<string, string>
}

export const emptyDraft = (): Draft => ({ off: new Set(), resp: {} })

function children(n: MatrixNode, type: MatrixNodeType): MatrixNode[] {
  return n.children.filter((c) => c.node_type === type && c.is_active !== false).sort((a, b) => a.order_index - b.order_index)
}

export const tasksOf = (item: MatrixNode) => children(item, 'TASK')
export const sectorsOf = (task: MatrixNode) => children(task, 'SECTOR')
export const activitiesOf = (sector: MatrixNode) => children(sector, 'ACTIVITY')
export const taskActivities = (task: MatrixNode) => sectorsOf(task).flatMap(activitiesOf)

export function minutesOf(a: MatrixNode): number {
  return Math.max(0, Math.floor(Number(a.planned_minutes ?? 0)))
}

/** "6 -  CARPETE / ASSOALHO" → "Carpete / assoalho". */
export function displayName(name: string): string {
  const t = name.replace(/^\s*\d+\s*[-–.)]\s*/, '').replace(/\s+/g, ' ').trim()
  return t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t
}

const FIGURAS: [RegExp, number][] = [
  [/retirada|desmont/, 1],
  [/limpeza final/, 19],
  [/limpeza/, 2],
  [/isolante|feltro/, 3],
  [/porta.?malas/, 8],
  [/tampa traseira/, 9],
  [/tampao/, 17],
  [/teto/, 4],
  [/cinto/, 5],
  [/carpete|assoalho/, 6],
  [/console/, 7],
  [/lateral|laterais/, 10],
  [/ombreira/, 11],
  [/forro|porta/, 12],
  [/acabamento/, 13],
  [/banco.*tras/, 14],
  [/banco/, 15],
  [/volante/, 16],
  [/montagem/, 18],
  [/inspe|qualidade/, 20],
]

/**
 * Ilustrações das 20 etapas do fluxo de revestimento (Tabler Icons, MIT; ver
 * `public/etapas/revestimento-automotivo/`). São símbolos aproximados, não fotos das peças.
 */
export const ILUSTRACOES = [
  '01-retirada-pecas',
  '02-limpeza-inicial',
  '03-isolante-feltro',
  '04-teto',
  '05-cintos',
  '06-carpete-assoalho',
  '07-console-central',
  '08-porta-malas',
  '09-tampa-traseira',
  '10-laterais-traseiras',
  '11-ombreira',
  '12-forros-portas',
  '13-acabamentos',
  '14-bancos-traseiros',
  '15-bancos-dianteiros',
  '16-volante',
  '17-tampao',
  '18-montagem-veiculo',
  '19-limpeza-final',
  '20-inspecao-qualidade',
] as const

/** Endereço da ilustração da Etapa `n` (1 a 20) do fluxo. */
export function ilustracao(n: number): string {
  return `${import.meta.env.BASE_URL}etapas/revestimento-automotivo/${ILUSTRACOES[n - 1]}.svg`
}

/** Ilustração da etapa pelo nome; só visual, não muda a sequência nem os títulos da matriz. */
export function figuraDaEtapa(name: string): string | null {
  const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const hit = FIGURAS.find(([re]) => re.test(n))
  return hit ? ilustracao(hit[1]) : null
}

/** A ilustração é um ícone quadrado: mostrar inteira, com respiro, nunca recortada. */
export function ehIlustracao(src: string): boolean {
  return src.endsWith('.svg')
}

export type Totals = { etapas: number; atividades: number; minutos: number }

export function totals(item: MatrixNode, d: Draft): Totals {
  const t: Totals = { etapas: 0, atividades: 0, minutos: 0 }
  for (const task of tasksOf(item)) {
    const ativas = taskActivities(task).filter((a) => !d.off.has(a.id))
    if (!ativas.length) continue
    t.etapas++
    t.atividades += ativas.length
    t.minutos += ativas.reduce((s, a) => s + minutesOf(a), 0)
  }
  return t
}

/** Liga/desliga um grupo de atividades (etapa ou setor): se alguma está marcada, tira todas; senão, inclui todas. */
export function toggleGroup(d: Draft, activities: MatrixNode[]): Draft {
  const anyOn = activities.some((a) => !d.off.has(a.id))
  const off = new Set(d.off)
  for (const a of activities) {
    if (anyOn) off.add(a.id)
    else off.delete(a.id)
  }
  return { ...d, off }
}

export function toggleActivity(d: Draft, a: MatrixNode): Draft {
  const off = new Set(d.off)
  if (off.has(a.id)) off.delete(a.id)
  else off.add(a.id)
  return { ...d, off }
}

/** Responsável atual: o trocado pela gestora ou o padrão da matriz. */
export function responsavelDe(d: Draft, a: MatrixNode): string | null {
  return d.resp[a.id] ?? a.default_responsible_id ?? null
}

/** Troca o responsável; escolher o mesmo da matriz desfaz a troca. */
export function setResponsavel(d: Draft, activities: MatrixNode[], collaboratorId: string): Draft {
  const resp = { ...d.resp }
  for (const a of activities) {
    if (a.default_responsible_id === collaboratorId) delete resp[a.id]
    else resp[a.id] = collaboratorId
  }
  return { ...d, resp }
}

type Assignee = { type: 'COLLABORATOR' | 'TEAM'; collaboratorId?: string; teamId?: string; isPrimary: boolean }

/** Corpo do POST /api/v1/conveyors (mesma tradução matriz → esteira que a V1 faz). */
export function buildCreateBody(item: MatrixNode, d: Draft, dados: DadosEsteira) {
  const options = tasksOf(item)
    .map((task) => ({
      titulo: task.name.trim(),
      sourceOrigin: 'base' as const,
      areas: sectorsOf(task)
        .map((sector) => ({
          titulo: sector.name.trim(),
          sourceOrigin: 'base' as const,
          steps: activitiesOf(sector)
            .filter((a) => !d.off.has(a.id))
            .map((a, i) => {
              const assignees: Assignee[] = []
              const resp = responsavelDe(d, a)
              if (resp) assignees.push({ type: 'COLLABORATOR', collaboratorId: resp, isPrimary: true })
              const team = a.team_ids?.[0]
              if (team) assignees.push({ type: 'TEAM', teamId: team, isPrimary: false })
              return {
                titulo: a.name.trim(),
                orderIndex: i + 1,
                plannedMinutes: minutesOf(a),
                plannedQuantity: 1,
                sourceOrigin: 'base' as const,
                sourceKey: a.source_key?.trim() || a.id,
                required: a.required,
                assignees,
              }
            }),
        }))
        .filter((area) => area.steps.length > 0)
        .map((area, i) => ({ ...area, orderIndex: i + 1 })),
    }))
    .filter((o) => o.areas.length > 0)
    .map((o, i) => ({ ...o, orderIndex: i + 1 }))

  if (options.length === 0) throw new Error('Marque pelo menos uma atividade.')

  return {
    dados: dadosParaCriar(dados, displayName(item.name)),
    originType: 'BASE' as const,
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    matrixRootItemId: item.id,
    options,
  }
}

/** Prazo em YYYY-MM-DD a partir dos atalhos da tela (data local). */
export function prazoPara(atalho: 'hoje' | 'amanha' | 'sexta', now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (atalho === 'amanha') d.setDate(d.getDate() + 1)
  if (atalho === 'sexta') d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
