import type pg from 'pg'
import type { ArgosDocumentIngestResult } from '../document-draft.schemas.js'
import { isDocumentDraftPipelineFlagsEnabled } from './documentDraftPipelineDebug.js'

/** Limiares Camada 1 (S3) — determinístico, auditável. */
export const MATCH_THRESHOLD_REUSE = 0.85
export const MATCH_THRESHOLD_REVIEW = 0.65
/** Top1 vs Top2: ambos ≥ limiar de revisão e Δ ≤ este valor ⇒ REVIEW_SIMILAR (ambiguidade). */
export const MATCH_AMBIGUITY_MAX_GAP = 0.08
/** R6 S4 — limiar mínimo para listar candidatos alternativos (revisão humana). */
export const MATCH_ALTERNATIVE_MIN_SCORE = 0.45
/** R6 S9.1 — TASK macro reaproveitável antes de CREATE_NEW (com termo estrutural). */
export const MATCH_TASK_MACRO_MIN_SCORE = 0.58
/** R6 S9.1 — TASK macro com bom alinhamento → pode subir a REUSE_EXISTING. */
export const MATCH_TASK_MACRO_REUSE_SCORE = 0.72
/** Máx. linhas devolvidas pela recall textual ILIKE por serviceItem (MVP). */
export const MATCH_RECALL_LIMIT = 50
/** Recall direto de nós TASK na Matriz (S9.1). */
export const MATCH_TASK_RECALL_LIMIT = 80

/** Amostra em `subtreeSummary.previewActivities` — contrato ARGOS (`max(5)` no schema). */
export const MATRIX_SUBTREE_PREVIEW_ACTIVITIES_LIMIT = 5

export function limitPreviewActivities(activities: string[] | undefined | null): string[] {
  if (!activities?.length) return []
  return activities.slice(0, MATRIX_SUBTREE_PREVIEW_ACTIVITIES_LIMIT)
}

/**
 * PostgreSQL `numeric` / agregações podem chegar ao Node como string.
 * Normaliza para número finito antes do contrato Zod 1.1.0 (R6 S9.2).
 */
export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'bigint') {
    const n = Number(value)
    return Number.isFinite(n) ? n : fallback
  }
  if (typeof value === 'string') {
    const t = value.trim()
    if (t === '') return fallback
    const n = Number(t)
    return Number.isFinite(n) ? n : fallback
  }
  return fallback
}

function toNonNegativeInt(value: unknown, fallback = 0): number {
  return Math.floor(Math.max(0, toFiniteNumber(value, fallback)))
}

const OPERATIONAL_STOPWORDS = new Set([
  'de',
  'da',
  'do',
  'das',
  'dos',
  'para',
  'com',
  'sem',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'e',
  'ou',
  'original',
  'padrao',
  'disponivel',
  'mercado',
  'servico',
  'servicos',
  'pedido',
  'ordem',
  'item',
  'itens',
  'atividade',
  'atividades',
  'unidade',
  'un',
  'par',
  'jogo',
  'com',
  'por',
  'completo',
  'tipo',
])

/** Ruído de veículo/comercial — remove-se da tokenização (não discriminam oficina). */
const NOISE_TOKENS = new Set([
  'brv',
  'gti',
  'gts',
  'gol',
  'vw',
  'laguna',
  'mercedes',
])

/**
 * Sinónimos → forma canónica (token único).
 * Evitar expansões amplas demais (ex.: "reparo" só não expande para tudo).
 */
const TOKEN_CANONICAL = new Map<string, string>([
  ['revestir', 'revestimento'],
  ['tapeçar', 'revestimento'],
  ['tapecar', 'revestimento'],
  ['trocar', 'troca'],
  ['substituicao', 'troca'],
  ['tampa', 'tampa'],
  ['tampao', 'tampao'],
  ['tampão', 'tampao'],
  ['aco', 'aco'],
  ['aço', 'aco'],
  ['courvim', 'courvin'],
  ['aplique', 'aplique'],
  ['apliques', 'aplique'],
  ['reforma', 'reparo'],
  ['laterais', 'lateral'],
  ['traseiras', 'traseira'],
  ['dianteiras', 'dianteira'],
  ['portas', 'porta'],
  ['forros', 'forro'],
  ['ombreiras', 'ombreira'],
  ['tampas', 'tampa'],
  ['bancos', 'banco'],
  ['acabamentos', 'acabamento'],
])

/** Termos estruturais para escalonar TASK macro (S9.1) — não confundir com GENERIC_TERMS sozinhos. */
const MACRO_STRUCTURAL_TERM_SET = new Set(
  [
    'lateral',
    'laterais',
    'traseira',
    'traseiras',
    'dianteira',
    'ombreira',
    'tampa',
    'tampao',
    'porta',
    'porta malas',
    'forro',
    'forros',
    'volante',
    'banco',
    'recaro',
    'cabo',
    'teto',
    'cinto',
    'quebra sol',
    'aplique',
  ].map((t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()),
)

/** S9.3 — interseção serviço × título da TASK (sem preview/descendentes). */
const TASK_TITLE_ALIGNMENT_TERM_SET = new Set<string>([
  ...MACRO_STRUCTURAL_TERM_SET,
  'aco',
  'couro',
  'courvin',
  'tecido',
  'carpete',
  'assoalho',
])

const PROCESSUAL_SERVICE_TOKEN_SET = new Set(
  [
    'limpeza',
    'limpar',
    'montagem',
    'montar',
    'retirada',
    'desmontagem',
    'conferir',
    'conferencia',
    'entrega',
    'finalizar',
    'finalizacao',
  ].map((t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()),
)

/** Δ máximo para preferir TASK com alinhamento estrutural sobre TASK sem alinhamento (S9.3). */
const STRUCTURAL_NEAR_TIE_GAP = 0.12

function clampScore01(score: number): number {
  return Math.max(0, Math.min(1, Number(score.toFixed(4))))
}

/** TASKs de fluxo — só podem ganhar se o serviço trouxer termo processual explícito (S9.3). */
export function isProcessualTaskTitle(title: string): boolean {
  const n = normalizeOperationalText(title).replace(/^\d+\s*-\s*/, '').trim()
  if (/limpeza\s+final/.test(n)) return true
  if (/montagem\s+veiculo/.test(n)) return true
  if (/retirada\s+de\s+pecas/.test(n)) return true
  if (/\bdesmontagem\b/.test(n)) return true
  if (/\bconferencia\b/.test(n)) return true
  if (/\bfinalizacao\b/.test(n)) return true
  if (/\bentrega\b/.test(n) && !/\bembreagem\b/.test(n)) return true
  return false
}

export function serviceHasProcessualServiceTerm(serviceDescription: string): boolean {
  for (const t of tokenizeOperationalText(serviceDescription)) {
    if (PROCESSUAL_SERVICE_TOKEN_SET.has(t)) return true
  }
  const norm = normalizeOperationalText(serviceDescription)
  if (/limpeza\s+final/.test(norm)) return true
  if (/montagem\s+veiculo/.test(norm)) return true
  if (/retirada\s+de\s+pecas/.test(norm)) return true
  return false
}

function serviceIsCableSteelService(svcTok: Set<string>): boolean {
  return svcTok.has('cabo') && svcTok.has('aco')
}

export type TaskTitleStructuralAlignment = {
  hasStructuralAlignment: boolean
  matchedStructuralTerms: string[]
  missingReason?: string
}

const STRONG_TERMS = [
  'banco',
  'recaro',
  'revestimento',
  'ombreira',
  'lateral',
  'porta',
  'porta malas',
  'volante',
  'couro',
  'carpete',
  'courvin',
  'tecido',
  'teto',
  'quebra sol',
  'cinto',
  'tampao',
  'tampa',
  'traseira',
  'dianteira',
  'trocar',
  'troca',
  'cabo',
  'aco',
  'acabamento',
  'aplique',
]

const STRONG_TERM_SET = new Set(
  STRONG_TERMS.map((t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()),
)

/** Candidato só com estes tokens (e poucos) é tratado como genérico demais para REUSE. */
const GENERIC_TERMS = new Set([
  'servico',
  'servicos',
  'geral',
  'reparo',
  'atividade',
  'revestimento',
  'acabamento',
  'troca',
])

/** Times associados à atividade na Matriz (`matrix_node_assignment_teams`), ordenados. */
export type MatrixActivityTeamAssignment = { teamId: string; teamName?: string }

export type MatrixMatchCandidate = {
  matrixNodeId: string
  nodeType: 'TASK' | 'SECTOR' | 'ACTIVITY'
  activity: string
  activityDescription: string | null
  plannedMinutes: number | null
  collaboratorId: string | null
  collaboratorName: string | null
  teamId: string | null
  teamName: string | null
  /** S9.4 — todos os times da atividade (não só o primeiro). */
  teamAssignments?: MatrixActivityTeamAssignment[]
  sector: string | null
  step: string | null
  sectorNodeId: string | null
  taskNodeId: string | null
  /** Ordem na Matriz (filhos do setor). */
  activityOrderIndex?: number | null
  /** Ordem do setor sob a TASK. */
  sectorOrderIndex?: number | null
  descendantActivitiesCount?: number
  descendantSectorsCount?: number
  sampleActivities?: string[]
}

const MATRIX_NODE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isMatrixUuidString(s: string): boolean {
  return MATRIX_NODE_UUID_RE.test(s.trim())
}

function parseTeamAssignmentsFromSqlRow(
  raw: unknown,
): MatrixActivityTeamAssignment[] {
  let arr: unknown[] = []
  if (Array.isArray(raw)) arr = raw
  else if (typeof raw === 'string' && raw.trim()) {
    try {
      const p = JSON.parse(raw) as unknown
      if (Array.isArray(p)) arr = p
    } catch {
      arr = []
    }
  }
  const out: MatrixActivityTeamAssignment[] = []
  const seen = new Set<string>()
  for (const x of arr) {
    if (!x || typeof x !== 'object') continue
    const idRaw = (x as { teamId?: unknown }).teamId
    const teamId = typeof idRaw === 'string' ? idRaw.trim() : ''
    if (!isMatrixUuidString(teamId) || seen.has(teamId)) continue
    seen.add(teamId)
    const tn = (x as { teamName?: unknown }).teamName
    const teamName =
      typeof tn === 'string' && tn.trim() ? tn.trim().slice(0, 200) : undefined
    out.push({ teamId, ...(teamName ? { teamName } : {}) })
  }
  return out
}

/** Campos numéricos vindos de SQL → sempre number no DTO interno (R6 S9.2). */
export function normalizeMatrixMatchCandidateFromSql(row: MatrixMatchCandidate): MatrixMatchCandidate {
  const teamAssignments = parseTeamAssignmentsFromSqlRow(
    (row as { teamAssignments?: unknown }).teamAssignments,
  )
  const firstTeam = teamAssignments[0]
  const planned =
    row.plannedMinutes === null || row.plannedMinutes === undefined
      ? null
      : Math.max(0, toFiniteNumber(row.plannedMinutes, 0))
  const aoi =
    row.activityOrderIndex === null || row.activityOrderIndex === undefined
      ? row.activityOrderIndex
      : toFiniteNumber(row.activityOrderIndex, 0)
  const soi =
    row.sectorOrderIndex === null || row.sectorOrderIndex === undefined
      ? row.sectorOrderIndex
      : toFiniteNumber(row.sectorOrderIndex, 0)
  const dac = row.descendantActivitiesCount
  const dsc = row.descendantSectorsCount
  return {
    ...row,
    teamAssignments: teamAssignments.length > 0 ? teamAssignments : undefined,
    teamId: firstTeam?.teamId ?? row.teamId ?? null,
    teamName: firstTeam?.teamName ?? row.teamName ?? null,
    plannedMinutes: planned,
    activityOrderIndex: aoi,
    sectorOrderIndex: soi,
    descendantActivitiesCount:
      dac === null || dac === undefined ? undefined : toNonNegativeInt(dac, 0),
    descendantSectorsCount:
      dsc === null || dsc === undefined ? undefined : toNonNegativeInt(dsc, 0),
  }
}

/** Limite de folhas serializadas em `matrixSubtree` (payload controlado). */
export const MATRIX_SUBTREE_MAX_ACTIVITIES = 120

export type MatrixSubtreeBuiltActivity = {
  matrixNodeId: string
  title: string
  orderIndex: number
  plannedMinutes: number
  defaultResponsibleId?: string
  defaultResponsibleName?: string
  teamId?: string
  teamName?: string
  teamAssignments?: MatrixActivityTeamAssignment[]
}

export type MatrixSubtreeBuiltArea = {
  matrixNodeId: string
  title: string
  orderIndex: number
  plannedMinutes?: number
  activities: MatrixSubtreeBuiltActivity[]
}

export type MatrixSubtreeBuilt = {
  rootNodeId: string
  rootNodeType: 'TASK' | 'SECTOR'
  rootTitle: string
  totalAreas: number
  totalActivities: number
  totalPlannedMinutes: number
  subtreeTruncated?: boolean
  subtreeWarning?: string
  areas: MatrixSubtreeBuiltArea[]
}

function matrixSubtreeTeamsFromCandidate(a: MatrixMatchCandidate): Pick<
  MatrixSubtreeBuiltActivity,
  'teamId' | 'teamName' | 'teamAssignments'
> {
  const list: MatrixActivityTeamAssignment[] =
    a.teamAssignments?.filter((t) => isMatrixUuidString(t.teamId)) ?? []
  if (list.length > 0) {
    return {
      teamId: list[0]!.teamId,
      teamName: list[0]!.teamName,
      teamAssignments: list,
    }
  }
  if (a.teamId && isMatrixUuidString(a.teamId)) {
    return {
      teamId: a.teamId,
      teamName: a.teamName ?? undefined,
      teamAssignments: [{ teamId: a.teamId, ...(a.teamName ? { teamName: a.teamName } : {}) }],
    }
  }
  return {}
}

function normalizeMatrixSubtreeBuilt(tree: MatrixSubtreeBuilt): MatrixSubtreeBuilt {
  return {
    ...tree,
    totalAreas: toNonNegativeInt(tree.totalAreas, 0),
    totalActivities: toNonNegativeInt(tree.totalActivities, 0),
    totalPlannedMinutes: Math.max(0, toFiniteNumber(tree.totalPlannedMinutes, 0)),
    areas: tree.areas.map((a) => ({
      ...a,
      orderIndex: toNonNegativeInt(a.orderIndex, 0),
      plannedMinutes:
        a.plannedMinutes === undefined
          ? undefined
          : Math.max(0, toFiniteNumber(a.plannedMinutes, 0)),
      activities: a.activities.map((ac) => ({
        ...ac,
        orderIndex: toNonNegativeInt(ac.orderIndex, 0),
        plannedMinutes: Math.max(0, toFiniteNumber(ac.plannedMinutes, 0)),
      })),
    })),
  }
}

export function buildMatrixSubtreeV11FromPool(
  root: MatrixMatchCandidate,
  activityPool: MatrixMatchCandidate[],
): MatrixSubtreeBuilt | null {
  const nodeType = root.nodeType ?? 'ACTIVITY'
  if (nodeType === 'ACTIVITY') return null

  const filtered =
    nodeType === 'TASK'
      ? activityPool.filter(
          (r) =>
            Boolean(r.taskNodeId && root.matrixNodeId && r.taskNodeId === root.matrixNodeId),
        )
      : activityPool.filter(
          (r) =>
            Boolean(
              r.sectorNodeId && root.matrixNodeId && r.sectorNodeId === root.matrixNodeId,
            ),
        )

  if (filtered.length === 0) return null

  const rootTitle =
    nodeType === 'TASK'
      ? String(root.step ?? root.activity ?? '').trim() || 'Tarefa'
      : String(root.sector ?? root.activity ?? '').trim() || 'Setor'

  const totalActivities = filtered.length
  const totalPlannedMinutes = Math.round(
    filtered.reduce(
      (s, r) => s + Math.max(0, toFiniteNumber(r.plannedMinutes ?? 0, 0)),
      0,
    ),
  )

  type Bucket = {
    sectorNodeId: string | null
    sectorTitle: string
    sectorOrder: number
    acts: MatrixMatchCandidate[]
  }
  const bySector = new Map<string, Bucket>()
  for (const r of filtered) {
    const sid = r.sectorNodeId ?? '__orphan__'
    const existing = bySector.get(sid)
    const sectorOrder = toFiniteNumber(r.sectorOrderIndex ?? 0, 0)
    const sectorTitle = (r.sector ?? 'Área').trim() || 'Área'
    if (!existing) {
      bySector.set(sid, {
        sectorNodeId: r.sectorNodeId,
        sectorTitle,
        sectorOrder,
        acts: [r],
      })
    } else {
      existing.acts.push(r)
      existing.sectorOrder = Math.min(existing.sectorOrder, sectorOrder)
    }
  }

  const sectorBuckets = [...bySector.values()].sort((a, b) => {
    if (a.sectorOrder !== b.sectorOrder) return a.sectorOrder - b.sectorOrder
    return a.sectorTitle.localeCompare(b.sectorTitle, 'pt')
  })

  for (const b of sectorBuckets) {
    b.acts.sort((a, c) => {
      const ao = toFiniteNumber(a.activityOrderIndex ?? 0, 0)
      const co = toFiniteNumber(c.activityOrderIndex ?? 0, 0)
      if (ao !== co) return ao - co
      return (a.activity ?? '').localeCompare(c.activity ?? '', 'pt')
    })
  }

  let budget = MATRIX_SUBTREE_MAX_ACTIVITIES
  let truncated = false
  const areasOut: MatrixSubtreeBuilt['areas'] = []
  let areaIdx = 1

  for (const bucket of sectorBuckets) {
    if (budget <= 0) {
      truncated = true
      break
    }
    const sliceActs: MatrixMatchCandidate[] = []
    for (const act of bucket.acts) {
      if (budget <= 0) {
        truncated = true
        break
      }
      sliceActs.push(act)
      budget -= 1
    }
    if (sliceActs.length === 0) continue

    const sectorKey =
      bucket.sectorNodeId ?? `orphan:${root.matrixNodeId}:${bucket.sectorTitle}`
    const plannedSector = sliceActs.reduce(
      (s, a) => s + Math.max(0, toFiniteNumber(a.plannedMinutes ?? 0, 0)),
      0,
    )

    areasOut.push({
      matrixNodeId: sectorKey,
      title: bucket.sectorTitle,
      orderIndex: areaIdx++,
      plannedMinutes: plannedSector > 0 ? Math.round(plannedSector) : undefined,
      activities: sliceActs.map((a, si) => ({
        matrixNodeId: a.matrixNodeId,
        title: String(a.activity ?? '').trim().slice(0, 500),
        orderIndex: si + 1,
        plannedMinutes: Math.max(0, Math.floor(toFiniteNumber(a.plannedMinutes ?? 0, 0))),
        defaultResponsibleId: a.collaboratorId ?? undefined,
        defaultResponsibleName: a.collaboratorName ?? undefined,
        ...matrixSubtreeTeamsFromCandidate(a),
      })),
    })
  }

  const totalAreas = sectorBuckets.length

  return normalizeMatrixSubtreeBuilt({
    rootNodeId: root.matrixNodeId,
    rootNodeType: nodeType,
    rootTitle,
    totalAreas,
    totalActivities,
    totalPlannedMinutes,
    subtreeTruncated: truncated || undefined,
    subtreeWarning: truncated
      ? `Estrutura limitada a ${MATRIX_SUBTREE_MAX_ACTIVITIES} etapas nesta resposta; revise na Matriz se necessário.`
      : undefined,
    areas: areasOut,
  })
}

/**
 * Origem dos candidatos para scoring.
 * `recall_ilike` — subset devolvido por ILIKE em tokens (S4); `enriched`/`fallback` — lista ampla (até 1200).
 */
export type MatrixCandidatesLoadSource = 'enriched' | 'fallback' | 'recall_ilike'

export type MatchOperationalOutcome =
  | { kind: 'ok'; querySource: MatrixCandidatesLoadSource }
  | { kind: 'no_candidates'; querySource: MatrixCandidatesLoadSource }
  | { kind: 'technical_failure'; pgCode?: string; sanitizedMessage: string }

export type MatchOperationalItemsResult = {
  matchingPlan: NonNullable<ArgosDocumentIngestResult['matchingPlan']>
  outcome: MatchOperationalOutcome
}

export type AlternativeMatrixCandidate = {
  matrixNodeId: string
  nodeType?: 'TASK' | 'SECTOR' | 'ACTIVITY'
  kind?: 'MATRIX_SUBTREE' | 'MATRIX_ACTIVITY'
  activity: string
  sector?: string
  step?: string
  plannedMinutes?: number
  confidence: number
  matchReason: string
  matrixSubtree?: MatrixSubtreeBuilt
}

function isRecoverableSchemaOrPermissionError(e: unknown): boolean {
  const code = e && typeof e === 'object' ? (e as { code?: string }).code : undefined
  return code === '42P01' || code === '42703' || code === '42501'
}

function extractPgError(e: unknown): { code?: string; message: string } {
  if (e && typeof e === 'object' && 'message' in e) {
    return {
      code: 'code' in e ? (e as { code?: string }).code : undefined,
      message: String((e as { message?: string }).message ?? 'unknown'),
    }
  }
  return { message: String(e) }
}

export function sanitizeMatchingErrorMessageForLog(message: string): string {
  const oneLine = message.replace(/\s+/g, ' ').trim()
  return oneLine.length > 180 ? `${oneLine.slice(0, 177)}...` : oneLine
}

const SQL_MATRIX_ACTIVITY_CANDIDATES_ENRICHED = `
SELECT
  act.id::text AS "matrixNodeId",
  'ACTIVITY'::text AS "nodeType",
  act.name AS "activity",
  act.description AS "activityDescription",
  act.planned_minutes AS "plannedMinutes",
  COALESCE(act.order_index, 0)::int AS "activityOrderIndex",
  act.default_responsible_id::text AS "collaboratorId",
  c.full_name AS "collaboratorName",
  team_agg.assignments AS "teamAssignments",
  sec.name AS "sector",
  task.name AS "step",
  COALESCE(sec.order_index, 0)::int AS "sectorOrderIndex",
  sec.id::text AS "sectorNodeId",
  task.id::text AS "taskNodeId"
FROM matrix_nodes act
LEFT JOIN matrix_nodes sec
  ON sec.id = act.parent_id
 AND sec.deleted_at IS NULL
 AND sec.node_type = 'SECTOR'
LEFT JOIN matrix_nodes task
  ON task.id = sec.parent_id
 AND task.deleted_at IS NULL
 AND task.node_type = 'TASK'
LEFT JOIN collaborators c
  ON c.id = act.default_responsible_id
 AND c.deleted_at IS NULL
LEFT JOIN LATERAL (
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'teamId', mnat.team_id::text,
        'teamName', tm.name
      )
      ORDER BY mnat.created_at ASC
    ) FILTER (WHERE tm.id IS NOT NULL),
    '[]'::json
  ) AS assignments
  FROM matrix_node_assignment_teams mnat
  INNER JOIN teams tm
    ON tm.id = mnat.team_id
   AND tm.deleted_at IS NULL
   AND tm.is_active = true
  WHERE mnat.matrix_node_id = act.id
    AND mnat.deleted_at IS NULL
) team_agg ON TRUE
WHERE act.deleted_at IS NULL
  AND act.is_active = true
  AND act.node_type = 'ACTIVITY'
ORDER BY act.updated_at DESC
LIMIT 1200
`

const SQL_MATRIX_ACTIVITY_CANDIDATES_FALLBACK = `
SELECT
  act.id::text AS "matrixNodeId",
  'ACTIVITY'::text AS "nodeType",
  act.name AS "activity",
  act.description AS "activityDescription",
  act.planned_minutes AS "plannedMinutes",
  COALESCE(act.order_index, 0)::int AS "activityOrderIndex",
  act.default_responsible_id::text AS "collaboratorId",
  NULL::text AS "collaboratorName",
  '[]'::json AS "teamAssignments",
  NULL::text AS "sector",
  NULL::text AS "step",
  0::int AS "sectorOrderIndex",
  NULL::text AS "sectorNodeId",
  NULL::text AS "taskNodeId"
FROM matrix_nodes act
WHERE act.deleted_at IS NULL
  AND act.is_active = true
  AND act.node_type = 'ACTIVITY'
ORDER BY act.updated_at DESC
LIMIT 1200
`

/**
 * Estratégia S4 (recall):
 * 1) COUNT actividades; 0 ⇒ no_candidates.
 * 2) Por serviço: padrões ILIKE parametrizados (`$1`) → até MATCH_RECALL_LIMIT linhas.
 * 3) Recall vazia ⇒ mesma lista ampla `loadMatrixActivityCandidates` (cache por pedido).
 * Score final continua a ser `computeOperationalMatchScore` (S3).
 */
/** Probe barato: Matriz sem actividades → matching.no_candidates (S4). */
const SQL_MATRIX_ACTIVITY_COUNT = `
SELECT COUNT(*)::int AS "n"
FROM matrix_nodes act
WHERE act.deleted_at IS NULL
  AND act.is_active = true
  AND act.node_type = 'ACTIVITY'
`

/**
 * Recall textual (S4): ILIKE parametrizado por tokens em nome/descrição da actividade,
 * sector e task — sem interpolar texto cru na SQL (lista $1).
 */
const SQL_MATRIX_ACTIVITY_RECALL_ENRICHED = `
SELECT DISTINCT ON (act.id)
  act.id::text AS "matrixNodeId",
  'ACTIVITY'::text AS "nodeType",
  act.name AS "activity",
  act.description AS "activityDescription",
  act.planned_minutes AS "plannedMinutes",
  COALESCE(act.order_index, 0)::int AS "activityOrderIndex",
  act.default_responsible_id::text AS "collaboratorId",
  c.full_name AS "collaboratorName",
  team_agg.assignments AS "teamAssignments",
  sec.name AS "sector",
  task.name AS "step",
  COALESCE(sec.order_index, 0)::int AS "sectorOrderIndex",
  sec.id::text AS "sectorNodeId",
  task.id::text AS "taskNodeId"
FROM matrix_nodes act
LEFT JOIN matrix_nodes sec
  ON sec.id = act.parent_id
 AND sec.deleted_at IS NULL
 AND sec.node_type = 'SECTOR'
LEFT JOIN matrix_nodes task
  ON task.id = sec.parent_id
 AND task.deleted_at IS NULL
 AND task.node_type = 'TASK'
LEFT JOIN collaborators c
  ON c.id = act.default_responsible_id
 AND c.deleted_at IS NULL
LEFT JOIN LATERAL (
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'teamId', mnat.team_id::text,
        'teamName', tm.name
      )
      ORDER BY mnat.created_at ASC
    ) FILTER (WHERE tm.id IS NOT NULL),
    '[]'::json
  ) AS assignments
  FROM matrix_node_assignment_teams mnat
  INNER JOIN teams tm
    ON tm.id = mnat.team_id
   AND tm.deleted_at IS NULL
   AND tm.is_active = true
  WHERE mnat.matrix_node_id = act.id
    AND mnat.deleted_at IS NULL
) team_agg ON TRUE
WHERE act.deleted_at IS NULL
  AND act.is_active = true
  AND act.node_type = 'ACTIVITY'
  AND (
    act.name ILIKE ANY($1::text[])
    OR COALESCE(act.description, '') ILIKE ANY($1::text[])
    OR COALESCE(sec.name, '') ILIKE ANY($1::text[])
    OR COALESCE(task.name, '') ILIKE ANY($1::text[])
  )
ORDER BY act.id, act.updated_at DESC
LIMIT ${MATCH_RECALL_LIMIT}
`

const SQL_MATRIX_ACTIVITY_RECALL_FALLBACK = `
SELECT DISTINCT ON (act.id)
  act.id::text AS "matrixNodeId",
  'ACTIVITY'::text AS "nodeType",
  act.name AS "activity",
  act.description AS "activityDescription",
  act.planned_minutes AS "plannedMinutes",
  COALESCE(act.order_index, 0)::int AS "activityOrderIndex",
  act.default_responsible_id::text AS "collaboratorId",
  NULL::text AS "collaboratorName",
  '[]'::json AS "teamAssignments",
  NULL::text AS "sector",
  NULL::text AS "step",
  0::int AS "sectorOrderIndex",
  NULL::text AS "sectorNodeId",
  NULL::text AS "taskNodeId"
FROM matrix_nodes act
WHERE act.deleted_at IS NULL
  AND act.is_active = true
  AND act.node_type = 'ACTIVITY'
  AND (
    act.name ILIKE ANY($1::text[])
    OR COALESCE(act.description, '') ILIKE ANY($1::text[])
  )
ORDER BY act.id, act.updated_at DESC
LIMIT ${MATCH_RECALL_LIMIT}
`

/**
 * R6 S9.1 — recall direto de TASKs (título/descrição + estatísticas de descendentes).
 */
const SQL_MATRIX_TASK_RECALL_ENRICHED = `
SELECT
  task.id::text AS "matrixNodeId",
  'TASK'::text AS "nodeType",
  task.name AS "activity",
  COALESCE(NULLIF(trim(task.description), ''), NULLIF(trim(stats.preview_text), '')) AS "activityDescription",
  COALESCE(stats.total_minutes, 0)::numeric AS "plannedMinutes",
  COALESCE(stats.n_act, 0)::int AS "descendantActivitiesCount",
  COALESCE(stats.n_sec, 0)::int AS "descendantSectorsCount",
  NULL::text AS "collaboratorId",
  NULL::text AS "collaboratorName",
  NULL::text AS "teamId",
  NULL::text AS "teamName",
  NULL::text AS "sector",
  task.name AS "step",
  NULL::text AS "sectorNodeId",
  task.id::text AS "taskNodeId",
  0::int AS "activityOrderIndex",
  0::int AS "sectorOrderIndex"
FROM matrix_nodes task
LEFT JOIN LATERAL (
  SELECT
    COUNT(DISTINCT act.id)::int AS n_act,
    COUNT(DISTINCT sec.id)::int AS n_sec,
    COALESCE(SUM(act.planned_minutes), 0)::numeric AS total_minutes,
    string_agg(DISTINCT LEFT(act.name, 120), ' | ' ORDER BY LEFT(act.name, 120))
      FILTER (WHERE act.id IS NOT NULL) AS preview_text
  FROM matrix_nodes sec
  LEFT JOIN matrix_nodes act
    ON act.parent_id = sec.id
   AND act.deleted_at IS NULL
   AND act.is_active = true
   AND act.node_type = 'ACTIVITY'
  WHERE sec.parent_id = task.id
    AND sec.deleted_at IS NULL
    AND sec.node_type = 'SECTOR'
) stats ON TRUE
WHERE task.deleted_at IS NULL
  AND task.is_active = true
  AND task.node_type = 'TASK'
  AND (
    task.name ILIKE ANY($1::text[])
    OR COALESCE(task.description, '') ILIKE ANY($1::text[])
    OR COALESCE(stats.preview_text, '') ILIKE ANY($1::text[])
  )
LIMIT ${MATCH_TASK_RECALL_LIMIT}
`

/** Escapa `%` e `_` dentro do literal antes de envolver em `%…%` para ILIKE. */
export function escapeIlikeLiteral(token: string): string {
  return token.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * Tokens úteis para recall (preferência por termos fortes), até 8 padrões ILIKE.
 */
export function buildIlikePatternsFromService(serviceDescription: string): string[] {
  const tokens = tokenizeOperationalText(serviceDescription)
  const strong = tokens.filter((t) => STRONG_TERM_SET.has(t))
  const rest = tokens.filter((t) => !STRONG_TERM_SET.has(t))
  const ordered = [...new Set([...strong, ...rest])].slice(0, 8)
  return ordered.map((t) => `%${escapeIlikeLiteral(t)}%`)
}

async function loadMatrixActivityCandidates(
  pool: pg.Pool,
): Promise<{ rows: MatrixMatchCandidate[]; source: Exclude<MatrixCandidatesLoadSource, 'recall_ilike'> }> {
  try {
    const result = await pool.query<MatrixMatchCandidate>(SQL_MATRIX_ACTIVITY_CANDIDATES_ENRICHED)
    return { rows: result.rows.map(normalizeMatrixMatchCandidateFromSql), source: 'enriched' }
  } catch (e1) {
    if (!isRecoverableSchemaOrPermissionError(e1)) throw e1
    const result = await pool.query<MatrixMatchCandidate>(SQL_MATRIX_ACTIVITY_CANDIDATES_FALLBACK)
    return { rows: result.rows.map(normalizeMatrixMatchCandidateFromSql), source: 'fallback' }
  }
}

async function countMatrixActivities(pool: pg.Pool): Promise<number> {
  const r = await pool.query<{ n: number }>(SQL_MATRIX_ACTIVITY_COUNT)
  return toNonNegativeInt(r.rows[0]?.n as unknown, 0)
}

/**
 * R6 S4 — recall por tokens (ILIKE ANY parametrizado). Falha “soft” → fallback só em matrix_nodes.
 */
async function recallCandidatesByTokens(
  pool: pg.Pool,
  patterns: string[],
): Promise<MatrixMatchCandidate[]> {
  if (patterns.length === 0) return []
  try {
    const result = await pool.query<MatrixMatchCandidate>(SQL_MATRIX_ACTIVITY_RECALL_ENRICHED, [
      patterns,
    ])
    return result.rows.map(normalizeMatrixMatchCandidateFromSql)
  } catch (e1) {
    if (!isRecoverableSchemaOrPermissionError(e1)) throw e1
    const result = await pool.query<MatrixMatchCandidate>(SQL_MATRIX_ACTIVITY_RECALL_FALLBACK, [
      patterns,
    ])
    return result.rows.map(normalizeMatrixMatchCandidateFromSql)
  }
}

/** R6 S9.1 — TASKs da Matriz alinhadas aos mesmos padrões ILIKE das actividades. */
async function recallDirectTaskCandidates(
  pool: pg.Pool,
  patterns: string[],
): Promise<MatrixMatchCandidate[]> {
  if (patterns.length === 0) return []
  try {
    const result = await pool.query<MatrixMatchCandidate>(SQL_MATRIX_TASK_RECALL_ENRICHED, [
      patterns,
    ])
    return result.rows.map((r) => {
      const base = normalizeMatrixMatchCandidateFromSql(r)
      return {
        ...base,
        sampleActivities: base.activityDescription
          ? base.activityDescription
              .split(' | ')
              .map((x) => x.trim())
              .filter(Boolean)
              .slice(0, 6)
          : [],
      }
    })
  } catch (e1) {
    if (!isRecoverableSchemaOrPermissionError(e1)) throw e1
    return []
  }
}

/**
 * Normalização operacional: acentos, minúsculas, símbolos fracos, ruído numérico curto.
 */
export function normalizeOperationalText(value: string): string {
  let s = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  s = s.replace(/porta[\s-]?malas/g, 'porta malas')
  /** Unicode letters/números — `\w` só ASCII e quebra tokens PT (ex.: VEÍCULO). */
  s = s.replace(/[^\p{L}\p{N}\s]/gu, ' ')
  s = s.replace(/\b\d{3,5}\b/g, ' ')
  s = s.replace(/\s+/g, ' ').trim()
  return s
}

/** @deprecated compat S1 — usar {@link normalizeOperationalText}. */
export function normalizeMatchingText(value: string): string {
  return normalizeOperationalText(value)
}

function canonicalToken(token: string): string {
  const t = token.toLowerCase()
  return TOKEN_CANONICAL.get(t) ?? t
}

/**
 * Tokenização: stopwords, ruído, códigos curtos; sinónimos → canónico.
 * Agrega `porta`+`malas` → token forte `porta malas`.
 */
export function tokenizeOperationalText(text: string): string[] {
  const norm = normalizeOperationalText(text)
  const parts = norm.split(/\s+/).filter(Boolean)
  const merged: string[] = []
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === 'porta' && parts[i + 1] === 'malas') {
      merged.push('porta malas')
      i++
    } else {
      merged.push(parts[i])
    }
  }
  const out: string[] = []
  for (let t of merged) {
    if (t.length < 2) continue
    if (OPERATIONAL_STOPWORDS.has(t)) continue
    if (NOISE_TOKENS.has(t)) continue
    if (/^\d+$/.test(t)) continue
    t = canonicalToken(t)
    if (t.length >= 2 && !OPERATIONAL_STOPWORDS.has(t)) out.push(t)
  }
  return expandOperationalSynonyms(out)
}

/**
 * Equivalências de domínio (S9.1) — ponte para títulos macro da Matriz (plural/singular, famílias).
 * Evita explosão: só adiciona termos derivados a partir de tokens já presentes.
 */
export function expandOperationalSynonyms(tokens: string[]): string[] {
  const s = new Set(tokens)
  const has = (x: string) => s.has(x)
  for (const t of tokens) {
    if (t === 'lateral' && has('traseira')) {
      s.add('laterais')
      s.add('traseiras')
    }
    if (t === 'lateral' && has('porta')) {
      s.add('forro')
      s.add('forros')
    }
    if (has('tampa') && has('traseira')) {
      s.add('porta malas')
    }
    if (has('tampao') || has('tampa')) {
      s.add('tampa')
      s.add('tampao')
    }
    if (has('ombreira')) {
      if (has('dianteira') || has('traseira')) s.add('ombreira')
    }
    if (has('troca') && has('tecido')) {
      s.add('troca tecido')
    }
  }
  return [...s]
}

export function removeOperationalStopwords(tokens: string[]): string[] {
  return tokens.filter((t) => !OPERATIONAL_STOPWORDS.has(t) && !NOISE_TOKENS.has(t))
}

export function normalizeOperationalTokens(tokens: string[]): string[] {
  return [...new Set(tokens.map(canonicalToken).filter((t) => t.length >= 2))]
}

export function extractStrongTerms(tokens: string[]): string[] {
  return tokens.filter((t) => STRONG_TERM_SET.has(t))
}

type PhraseDef = { id: string; test: (s: string) => boolean }

const PHRASE_DEFS: PhraseDef[] = [
  {
    id: 'banco+recaro',
    test: (s) => /\bbanco\b/.test(s) && /\brecaro\b/.test(s),
  },
  {
    id: 'volante+couro',
    test: (s) => /\bvolante\b/.test(s) && /\bcouro\b/.test(s),
  },
  {
    id: 'ombreira+dianteira',
    test: (s) => /\bombreira\b/.test(s) && /\bdianteira\b/.test(s),
  },
  {
    id: 'ombreira+traseira',
    test: (s) => /\bombreira\b/.test(s) && /\btraseira\b/.test(s),
  },
  {
    id: 'lateral+porta',
    test: (s) => /\blateral\b/.test(s) && /\bporta\b/.test(s),
  },
  {
    id: 'lateral+traseira',
    test: (s) => /\blateral\b/.test(s) && /\btraseira\b/.test(s),
  },
  {
    id: 'tampa+traseira',
    test: (s) => /\btampa\b/.test(s) && /\btraseira\b/.test(s),
  },
  {
    id: 'revestimento+courvin',
    test: (s) => /\brevestimento\b/.test(s) && /\bcourvin\b/.test(s),
  },
  {
    id: 'troca+tecido',
    test: (s) => /\btroca\b/.test(s) && /\btecido\b/.test(s),
  },
  {
    id: 'cabo+aco',
    test: (s) => /\bcabo\b/.test(s) && /\baco\b/.test(s),
  },
  {
    id: 'tampao+revest',
    test: (s) =>
      /\btampao\b/.test(s) && (/\brevestimento\b/.test(s) || /\brevestir\b/.test(s)),
  },
]

function phraseBonuses(sourceNorm: string, targetNorm: string): { bonus: number; hitIds: string[] } {
  let bonus = 0
  const hitIds: string[] = []
  for (const p of PHRASE_DEFS) {
    if (p.test(sourceNorm) && p.test(targetNorm)) {
      bonus += 0.038
      hitIds.push(p.id)
    }
  }
  return { bonus: Math.min(0.12, bonus), hitIds }
}

/**
 * Alinhamento estrutural título-only (S9.3): tokens fortes + mesmas frases fortes do matching (PHRASE_DEFS).
 */
export function computeTaskTitleStructuralAlignment(
  serviceText: string,
  taskTitle: string,
): TaskTitleStructuralAlignment {
  const svcNorm = normalizeOperationalText(serviceText)
  const titleNorm = normalizeOperationalText(taskTitle)
  const svcTok = new Set(expandOperationalSynonyms(tokenizeOperationalText(serviceText)))
  const titleTok = new Set(expandOperationalSynonyms(tokenizeOperationalText(taskTitle)))

  const matchedStructuralTerms: string[] = []
  for (const t of svcTok) {
    if (TASK_TITLE_ALIGNMENT_TERM_SET.has(t) && titleTok.has(t)) {
      matchedStructuralTerms.push(t)
    }
  }

  let phraseAligned = false
  for (const p of PHRASE_DEFS) {
    if (p.test(svcNorm) && p.test(titleNorm)) {
      phraseAligned = true
      break
    }
  }

  const hasStructuralAlignment = matchedStructuralTerms.length > 0 || phraseAligned

  return {
    hasStructuralAlignment,
    matchedStructuralTerms: [...new Set(matchedStructuralTerms)],
    ...(hasStructuralAlignment
      ? {}
      : {
          missingReason:
            'Sem termos estruturais em comum entre o serviço e o título da tarefa.',
        }),
  }
}

function isGenericCandidate(tokens: Set<string>, activityNorm: string): boolean {
  if (tokens.size === 0) return true
  const arr = [...tokens]
  const compact = activityNorm.replace(/\s+/g, ' ').trim()
  if (/^(revestimento|acabamento|troca)$/.test(compact)) return true
  if (arr.length === 1 && ['revestimento', 'acabamento', 'troca'].includes(arr[0]!)) return true
  if (arr.length <= 3 && arr.every((t) => GENERIC_TERMS.has(t))) return true
  return false
}

export type OperationalScoreBreakdown = {
  score: number
  matchedTerms: string[]
  phraseHitIds: string[]
}

/**
 * Score determinístico 0–1 entre texto de serviço (OS) e texto de candidato (nome/descrição Matriz).
 */
export function computeOperationalMatchScore(
  sourceRaw: string,
  targetRaw: string,
): OperationalScoreBreakdown {
  const sourceNorm = normalizeOperationalText(sourceRaw)
  const targetNorm = normalizeOperationalText(targetRaw)
  const sTokens = new Set(tokenizeOperationalText(sourceNorm))
  const tTokens = new Set(tokenizeOperationalText(targetNorm))
  if (sTokens.size === 0 || tTokens.size === 0) {
    return { score: 0, matchedTerms: [], phraseHitIds: [] }
  }

  const intersection: string[] = []
  for (const st of sTokens) {
    if (tTokens.has(st)) intersection.push(st)
  }

  const union = new Set([...sTokens, ...tTokens]).size
  const jaccard = union > 0 ? intersection.length / union : 0
  const minSet = Math.min(sTokens.size, tTokens.size)
  const overlap = minSet > 0 ? intersection.length / minSet : 0

  let score = jaccard * 0.36 + overlap * 0.41

  const strongMatched = intersection.filter((t) => STRONG_TERM_SET.has(t))
  score += Math.min(0.15, strongMatched.length * 0.036)

  const { bonus: phBonus, hitIds: phraseHitIds } = phraseBonuses(sourceNorm, targetNorm)
  score += phBonus

  const genericPenalty = isGenericCandidate(tTokens, targetNorm)
    ? intersection.some((t) => STRONG_TERM_SET.has(t))
      ? 0.08
      : 0.28
    : 0
  score -= genericPenalty

  const coverage = intersection.length / Math.max(1, sTokens.size)
  if (sTokens.size >= 6 && coverage < 0.12 && tTokens.size <= 3) {
    score -= 0.06
  }

  score = Math.max(0, Math.min(1, Number(score.toFixed(4))))

  const matchedTerms = [...new Set([...strongMatched, ...intersection])].slice(0, 8)

  return { score, matchedTerms, phraseHitIds }
}

/**
 * API estável usada nos testes — delega em {@link computeOperationalMatchScore}.
 */
export function scoreOperationalSimilarity(sourceRaw: string, targetRaw: string): number {
  return computeOperationalMatchScore(sourceRaw, targetRaw).score
}

function actionFromScore(score: number): 'REUSE_EXISTING' | 'REVIEW_SIMILAR' | 'CREATE_NEW' {
  if (score >= MATCH_THRESHOLD_REUSE) return 'REUSE_EXISTING'
  if (score >= MATCH_THRESHOLD_REVIEW) return 'REVIEW_SIMILAR'
  return 'CREATE_NEW'
}

function buildMatchReason(params: {
  score: number
  suggestedAction: 'REUSE_EXISTING' | 'REVIEW_SIMILAR' | 'CREATE_NEW'
  matchedTerms: string[]
  phraseHitIds: string[]
  ambiguous: boolean
  bestPhraseIds: string[]
}): string {
  const { score, suggestedAction, matchedTerms, phraseHitIds, ambiguous, bestPhraseIds } =
    params
  const terms =
    matchedTerms.length > 0 ? matchedTerms.slice(0, 5).join(', ') : 'termos operacionais limitados'
  if (ambiguous) {
    return `Candidatos próximos na Matriz (Δ≤${MATCH_AMBIGUITY_MAX_GAP.toFixed(2)}); revisão humana necessária.`
  }
  if (suggestedAction === 'REUSE_EXISTING') {
    const ph =
      bestPhraseIds.length > 0 ? ` Combinações fortes: ${bestPhraseIds.slice(0, 3).join('; ')}.` : ''
    return `Alta similaridade (${score.toFixed(2)}): ${terms}.${ph}`
  }
  if (suggestedAction === 'REVIEW_SIMILAR') {
    const ph = phraseHitIds.length ? ` Bónus de frase: ${phraseHitIds.slice(0, 2).join(', ')}.` : ''
    return `Similaridade moderada (${score.toFixed(2)}); revisar candidato na Matriz antes de reaproveitar. (${terms})${ph}`
  }
  return `Nenhuma atividade da Matriz atingiu similaridade mínima (melhor ${score.toFixed(2)}).`
}

/**
 * S4: descrição da Matriz pode ser o sinal principal quando o título é genérico.
 * Mantém combinação linear S3 como terceiro termo.
 */
function blendScores(activityScore: number, descriptionScore: number, hasDesc: boolean): number {
  if (!hasDesc) return activityScore
  return Math.max(
    activityScore,
    descriptionScore,
    activityScore * 0.82 + descriptionScore * 0.18,
  )
}

function mergeMatrixTaskSnapshots(a: MatrixMatchCandidate, b: MatrixMatchCandidate): MatrixMatchCandidate {
  const na = toNonNegativeInt(a.descendantActivitiesCount ?? 0, 0)
  const nb = toNonNegativeInt(b.descendantActivitiesCount ?? 0, 0)
  const primary = na >= nb ? a : b
  const secondary = na >= nb ? b : a
  const samp = [
    ...(primary.sampleActivities ?? []),
    ...(secondary.sampleActivities ?? []),
    ...(primary.activityDescription?.split(' | ') ?? []),
    ...(secondary.activityDescription?.split(' | ') ?? []),
  ]
    .map((x) => x.trim())
    .filter(Boolean)
  const sampleActivities = [...new Set(samp)].slice(0, 8)
  const pm = Math.max(
    toFiniteNumber(primary.plannedMinutes ?? 0, 0),
    toFiniteNumber(secondary.plannedMinutes ?? 0, 0),
  )
  return {
    ...primary,
    plannedMinutes: pm > 0 ? pm : null,
    descendantActivitiesCount: Math.max(na, nb),
    descendantSectorsCount: Math.max(
      toNonNegativeInt(a.descendantSectorsCount ?? 0, 0),
      toNonNegativeInt(b.descendantSectorsCount ?? 0, 0),
    ),
    activityDescription:
      [primary.activityDescription, secondary.activityDescription].filter(Boolean).join(' | ') ||
      null,
    sampleActivities,
  }
}

function dedupeTaskCandidatesById(rows: MatrixMatchCandidate[]): MatrixMatchCandidate[] {
  const tasks = new Map<string, MatrixMatchCandidate>()
  const rest: MatrixMatchCandidate[] = []
  for (const r of rows) {
    if (r.nodeType !== 'TASK') {
      rest.push(r)
      continue
    }
    const prev = tasks.get(r.matrixNodeId)
    tasks.set(r.matrixNodeId, prev ? mergeMatrixTaskSnapshots(prev, r) : r)
  }
  return [...rest, ...tasks.values()]
}

function deriveHierarchicalCandidates(candidatePool: MatrixMatchCandidate[]): MatrixMatchCandidate[] {
  const activityRows = candidatePool.filter((c) => (c.nodeType ?? 'ACTIVITY') === 'ACTIVITY')
  const presetMacros = candidatePool.filter((c) => c.nodeType === 'TASK' || c.nodeType === 'SECTOR')
  const out: MatrixMatchCandidate[] = [...activityRows, ...presetMacros]

  const taskGroups = new Map<string, MatrixMatchCandidate[]>()
  const sectorGroups = new Map<string, MatrixMatchCandidate[]>()
  for (const c of activityRows) {
    if (c.taskNodeId && c.step) {
      const key = `${c.taskNodeId}::${c.step}`
      const arr = taskGroups.get(key) ?? []
      arr.push(c)
      taskGroups.set(key, arr)
    }
    if (c.sectorNodeId && c.sector) {
      const key = `${c.sectorNodeId}::${c.sector}`
      const arr = sectorGroups.get(key) ?? []
      arr.push(c)
      sectorGroups.set(key, arr)
    }
  }

  for (const [key, members] of taskGroups) {
    if (members.length < 2) continue
    const [taskNodeId, stepTitle] = key.split('::')
    const planned = members.reduce(
      (sum, m) => sum + Math.max(0, toFiniteNumber(m.plannedMinutes ?? 0, 0)),
      0,
    )
    const sectors = new Set(members.map((m) => m.sector).filter(Boolean))
    const sampleActivities = [...new Set(members.map((m) => m.activity).filter(Boolean))].slice(
      0,
      4,
    )
    out.push({
      matrixNodeId: taskNodeId,
      nodeType: 'TASK',
      activity: stepTitle,
      activityDescription: sampleActivities.join(' | ') || null,
      plannedMinutes: planned > 0 ? planned : null,
      collaboratorId: null,
      collaboratorName: null,
      teamId: null,
      teamName: null,
      sector: null,
      step: stepTitle,
      sectorNodeId: null,
      taskNodeId,
      descendantActivitiesCount: members.length,
      descendantSectorsCount: sectors.size,
      sampleActivities,
    })
  }

  for (const [key, members] of sectorGroups) {
    if (members.length < 2) continue
    const [sectorNodeId, sectorTitle] = key.split('::')
    const planned = members.reduce(
      (sum, m) => sum + Math.max(0, toFiniteNumber(m.plannedMinutes ?? 0, 0)),
      0,
    )
    const sampleActivities = [...new Set(members.map((m) => m.activity).filter(Boolean))].slice(
      0,
      4,
    )
    out.push({
      matrixNodeId: sectorNodeId,
      nodeType: 'SECTOR',
      activity: sectorTitle,
      activityDescription: sampleActivities.join(' | ') || null,
      plannedMinutes: planned > 0 ? planned : null,
      collaboratorId: null,
      collaboratorName: null,
      teamId: null,
      teamName: null,
      sector: sectorTitle,
      step: members[0]?.step ?? null,
      sectorNodeId,
      taskNodeId: members[0]?.taskNodeId ?? null,
      descendantActivitiesCount: members.length,
      descendantSectorsCount: 1,
      sampleActivities,
    })
  }

  return dedupeTaskCandidatesById(out)
}

function serviceHasStructuralMacro(tokens: Set<string>): boolean {
  for (const t of tokens) {
    if (MACRO_STRUCTURAL_TERM_SET.has(t)) return true
  }
  return false
}

function serviceIsGenericMacroOnly(tokens: Set<string>): boolean {
  if (tokens.size === 0) return true
  if (serviceHasStructuralMacro(tokens)) return false
  return [...tokens].every((t) => GENERIC_TERMS.has(t) || t === 'completo')
}

function applyMacroTaskScoreLayer(
  serviceDescription: string,
  candidate: MatrixMatchCandidate,
  baseScore: number,
): number {
  if ((candidate.nodeType ?? 'ACTIVITY') !== 'TASK') return baseScore
  const svcTok = new Set(tokenizeOperationalText(serviceDescription))
  if (serviceIsGenericMacroOnly(svcTok)) {
    return Math.max(0, baseScore - 0.18)
  }
  if (!serviceHasStructuralMacro(svcTok)) {
    const titleOnly = String(candidate.activity ?? '')
    if (
      serviceHasProcessualServiceTerm(serviceDescription) &&
      isProcessualTaskTitle(titleOnly)
    ) {
      return Math.max(0, Math.min(1, Number(baseScore.toFixed(4))))
    }
    return Math.max(0, baseScore - 0.1)
  }
  /** S9.3: overlap estrutural só no título/step da TASK — não usar preview/descendentes aqui. */
  const titleStepBlob = [candidate.activity, candidate.step].filter(Boolean).join(' ')
  const titleStepTok = new Set(expandOperationalSynonyms(tokenizeOperationalText(titleStepBlob)))
  let structuralOverlap = 0
  for (const t of svcTok) {
    if (MACRO_STRUCTURAL_TERM_SET.has(t) && titleStepTok.has(t)) structuralOverlap += 1
  }
  let s = baseScore
  if (structuralOverlap >= 1) s += 0.09
  if (structuralOverlap >= 2) s += 0.07
  const titleOnly = String(candidate.activity ?? '')
  const titleAlign = computeTaskTitleStructuralAlignment(serviceDescription, titleOnly)
  const processualOk =
    isProcessualTaskTitle(titleOnly) && serviceHasProcessualServiceTerm(serviceDescription)
  const complement = ['tecido', 'courvin', 'couro', 'cola', 'revestimento', 'troca', 'acabamento']
  const hasComplement =
    (titleAlign.hasStructuralAlignment || processualOk) &&
    complement.some((w) => svcTok.has(w) && [...titleStepTok].some((tt) => tt.includes(w) || tt === w))
  if (hasComplement && structuralOverlap >= 1) s += 0.045
  if (
    (candidate.descendantActivitiesCount ?? 0) >= 2 &&
    (candidate.plannedMinutes ?? 0) > 0 &&
    (titleAlign.hasStructuralAlignment || processualOk)
  ) {
    s += 0.055
  }
  return Math.max(0, Math.min(1, Number(s.toFixed(4))))
}

/** Penalizações S9.3 após camada macro — sem alterar limiares globais. */
function applyTaskStructuralScorePenalties(
  serviceDescription: string,
  candidate: MatrixMatchCandidate,
  score: number,
): number {
  if ((candidate.nodeType ?? 'ACTIVITY') !== 'TASK') return clampScore01(score)
  let s = score
  const title = String(candidate.activity ?? candidate.step ?? '')
  const svcTok = new Set(tokenizeOperationalText(serviceDescription))

  if (isProcessualTaskTitle(title)) {
    if (!serviceHasProcessualServiceTerm(serviceDescription)) {
      s *= 0.45
    } else {
      /** Reforço determinístico para TASK processual + serviço explícito (sem mexer nos limiares globais). */
      s = Math.min(1, s + 0.1)
      return clampScore01(s)
    }
  }

  if (serviceIsCableSteelService(svcTok)) {
    const titleNorm = normalizeOperationalText(title)
    const hasCableInTitle = /\bcabo\b/.test(titleNorm) && /\baco\b/.test(titleNorm)
    if (hasCableInTitle) {
      return clampScore01(s)
    }
    s *= 0.25
  }

  const align = computeTaskTitleStructuralAlignment(serviceDescription, title)
  if (!align.hasStructuralAlignment) {
    s *= 0.55
  }

  return clampScore01(s)
}

export type RankedOperationalCandidate = {
  candidate: MatrixMatchCandidate
  score: number
  matchedTerms: string[]
  phraseHitIds: string[]
}

function promoteStructuralTaskNearTie(
  ranked: RankedOperationalCandidate[],
  serviceDescription: string,
): { ranked: RankedOperationalCandidate[]; structuralGuardNote?: string } {
  if (ranked.length < 2) return { ranked }
  const head = ranked[0]
  if (!head || head.candidate.nodeType !== 'TASK') return { ranked }

  const headTitle = String(head.candidate.activity ?? '')
  if (computeTaskTitleStructuralAlignment(serviceDescription, headTitle).hasStructuralAlignment) {
    return { ranked }
  }

  let bestAligned: RankedOperationalCandidate | undefined
  for (const r of ranked) {
    if (r.candidate.nodeType !== 'TASK') continue
    const t = String(r.candidate.activity ?? '')
    if (!computeTaskTitleStructuralAlignment(serviceDescription, t).hasStructuralAlignment) continue
    if (isProcessualTaskTitle(t) && !serviceHasProcessualServiceTerm(serviceDescription)) continue
    if (!bestAligned || r.score > bestAligned.score) bestAligned = r
  }
  if (!bestAligned || bestAligned.candidate.matrixNodeId === head.candidate.matrixNodeId) {
    return { ranked }
  }
  if (bestAligned.score >= head.score - STRUCTURAL_NEAR_TIE_GAP) {
    const rest = ranked.filter((r) => r.candidate.matrixNodeId !== bestAligned!.candidate.matrixNodeId)
    return {
      ranked: [bestAligned, ...rest],
      structuralGuardNote: 'Priorizada estrutura da Matriz com maior alinhamento operacional.',
    }
  }
  return { ranked }
}

export function taskMacroStructuralGate(
  serviceDescription: string,
  candidate: MatrixMatchCandidate,
): boolean {
  if ((candidate.nodeType ?? 'ACTIVITY') !== 'TASK') return false
  const svcTok = new Set(tokenizeOperationalText(serviceDescription))
  if (serviceIsGenericMacroOnly(svcTok)) return false

  const title = String(candidate.activity ?? candidate.step ?? '').trim()

  if (isProcessualTaskTitle(title)) {
    return serviceHasProcessualServiceTerm(serviceDescription)
  }

  if (!serviceHasStructuralMacro(svcTok)) return false

  if (serviceIsCableSteelService(svcTok)) {
    const titleNorm = normalizeOperationalText(title)
    const hasCableInTitle = /\bcabo\b/.test(titleNorm) && /\baco\b/.test(titleNorm)
    if (hasCableInTitle) return true
    return computeTaskTitleStructuralAlignment(serviceDescription, title).hasStructuralAlignment
  }

  return computeTaskTitleStructuralAlignment(serviceDescription, title).hasStructuralAlignment
}

function actionFromScoreForNodeType(
  score: number,
  nodeType: 'TASK' | 'SECTOR' | 'ACTIVITY',
): 'REUSE_EXISTING' | 'REVIEW_SIMILAR' | 'CREATE_NEW' {
  if (nodeType === 'TASK') {
    if (score >= MATCH_TASK_MACRO_REUSE_SCORE) return 'REUSE_EXISTING'
    if (score >= MATCH_TASK_MACRO_MIN_SCORE) return 'REVIEW_SIMILAR'
    return 'CREATE_NEW'
  }
  return actionFromScore(score)
}

function rankCandidatesForService(
  serviceDescription: string,
  candidates: MatrixMatchCandidate[],
): { ranked: RankedOperationalCandidate[]; structuralGuardNote?: string } {
  const expanded = deriveHierarchicalCandidates(candidates)
  let rows: RankedOperationalCandidate[] = expanded
    .map((candidate) => {
      const nodeType = candidate.nodeType ?? 'ACTIVITY'
      const hierarchyText =
        nodeType !== 'ACTIVITY'
          ? [candidate.activity, candidate.step, candidate.sector, ...(candidate.sampleActivities ?? [])]
              .filter(Boolean)
              .join(' ')
          : candidate.activity
      const a = computeOperationalMatchScore(serviceDescription, hierarchyText)
      const d = candidate.activityDescription
        ? computeOperationalMatchScore(serviceDescription, candidate.activityDescription)
        : a
      const blended = blendScores(a.score, d.score, Boolean(candidate.activityDescription))
      const hierarchyBonus =
        nodeType === 'TASK' || nodeType === 'SECTOR'
          ? Math.min(
              0.2,
              (nodeType === 'TASK' ? 0.07 : 0.02) +
                ((candidate.descendantActivitiesCount ?? 0) >= 2 ? 0.05 : 0) +
                ((candidate.descendantSectorsCount ?? 0) >= 2 ? 0.04 : 0),
            )
          : 0
      let score = Math.max(0, Math.min(1, Number((blended + hierarchyBonus).toFixed(4))))
      if (nodeType === 'TASK') {
        const withNt = { ...candidate, nodeType }
        score = applyMacroTaskScoreLayer(serviceDescription, withNt, score)
        score = applyTaskStructuralScorePenalties(serviceDescription, withNt, score)
      }
      const mergedTerms = [...new Set([...a.matchedTerms, ...d.matchedTerms])]
      const mergedPhrases = [...new Set([...a.phraseHitIds, ...d.phraseHitIds])]
      return {
        candidate: { ...candidate, nodeType },
        score,
        matchedTerms: mergedTerms,
        phraseHitIds: mergedPhrases,
      }
    })
    .sort((x, y) => {
      if (y.score !== x.score) return y.score - x.score
      const prio = (t: 'TASK' | 'SECTOR' | 'ACTIVITY') =>
        t === 'TASK' ? 3 : t === 'ACTIVITY' ? 2 : 1
      return prio(y.candidate.nodeType) - prio(x.candidate.nodeType)
    })

  const promoted = promoteStructuralTaskNearTie(rows, serviceDescription)
  rows = promoted.ranked
  return { ranked: rows, structuralGuardNote: promoted.structuralGuardNote }
}

function buildAlternativeCandidates(
  ranked: RankedOperationalCandidate[],
  startIdx: number,
  activityPool: MatrixMatchCandidate[],
): AlternativeMatrixCandidate[] {
  return ranked
    .slice(startIdx)
    .filter((r) => r.score >= MATCH_ALTERNATIVE_MIN_SCORE)
    .slice(0, 3)
    .map((r) => {
      const nt = r.candidate.nodeType ?? 'ACTIVITY'
      const subtree =
        nt === 'TASK' || nt === 'SECTOR'
          ? buildMatrixSubtreeV11FromPool(r.candidate, activityPool)
          : undefined
      const pm = r.candidate.plannedMinutes
      return {
        matrixNodeId: r.candidate.matrixNodeId,
        nodeType: nt,
        kind: nt === 'ACTIVITY' ? ('MATRIX_ACTIVITY' as const) : ('MATRIX_SUBTREE' as const),
        activity: r.candidate.activity,
        sector: r.candidate.sector ?? undefined,
        step: r.candidate.step ?? undefined,
        ...(pm === null || pm === undefined
          ? {}
          : { plannedMinutes: Math.max(0, toFiniteNumber(pm, 0)) }),
        confidence: clampConfidence01(r.score),
        matchReason: `Alternativa (${r.score.toFixed(2)}): ${r.candidate.activity}`,
        ...(subtree ? { matrixSubtree: subtree } : {}),
      }
    })
}

/** Para CREATE_NEW: até 3 candidatos ≥ limiar alternativo (TASK macro incluída). */
function collectCreateNewAlternatives(
  ranked: RankedOperationalCandidate[],
  activityPool: MatrixMatchCandidate[],
): AlternativeMatrixCandidate[] {
  const sorted = [...ranked].sort((a, b) => b.score - a.score)
  const seen = new Set<string>()
  const out: AlternativeMatrixCandidate[] = []
  for (const r of sorted) {
    if (r.score < MATCH_ALTERNATIVE_MIN_SCORE) continue
    const id = r.candidate.matrixNodeId
    if (seen.has(id)) continue
    seen.add(id)
    const nt = r.candidate.nodeType ?? 'ACTIVITY'
    const subtree =
      nt === 'TASK' || nt === 'SECTOR'
        ? buildMatrixSubtreeV11FromPool(r.candidate, activityPool)
        : undefined
    const pm = r.candidate.plannedMinutes
    out.push({
      matrixNodeId: id,
      nodeType: nt,
      kind: nt === 'ACTIVITY' ? ('MATRIX_ACTIVITY' as const) : ('MATRIX_SUBTREE' as const),
      activity: r.candidate.activity,
      sector: r.candidate.sector ?? undefined,
      step: r.candidate.step ?? undefined,
      ...(pm === null || pm === undefined
        ? {}
        : { plannedMinutes: Math.max(0, toFiniteNumber(pm, 0)) }),
      confidence: clampConfidence01(r.score),
      matchReason: `Alternativa (${r.score.toFixed(2)}): ${r.candidate.activity}`,
      ...(subtree ? { matrixSubtree: subtree } : {}),
    })
    if (out.length >= 3) break
  }
  return out
}

function clampConfidence01(score: number): number {
  return Math.min(1, Math.max(0, toFiniteNumber(score, 0)))
}

function passesReviewThreshold(
  entry: RankedOperationalCandidate | undefined,
  serviceDescription: string,
): boolean {
  if (!entry) return false
  if (entry.score >= MATCH_THRESHOLD_REVIEW) return true
  return (
    entry.candidate.nodeType === 'TASK' &&
    entry.score >= MATCH_TASK_MACRO_MIN_SCORE &&
    taskMacroStructuralGate(serviceDescription, entry.candidate)
  )
}

function planSingleService(
  service: NonNullable<ArgosDocumentIngestResult['extractedItems']>['serviceItems'][number],
  candidates: MatrixMatchCandidate[],
  opts?: { serviceItemIndex?: number },
): NonNullable<ArgosDocumentIngestResult['matchingPlan']>[number] {
  if (candidates.length === 0) {
    return {
      extractedServiceDescription: service.description,
      suggestedAction: 'CREATE_NEW' as const,
      confidence: 0.35,
      matchReason: 'Nenhuma atividade ativa encontrada na matriz.',
    }
  }

  const { ranked: rankedRaw, structuralGuardNote } = rankCandidatesForService(
    service.description,
    candidates,
  )
  const topActivity = rankedRaw.find((r) => (r.candidate.nodeType ?? 'ACTIVITY') === 'ACTIVITY')
  const topActivityScore = topActivity?.score ?? 0
  const head = rankedRaw[0]
  const headWeak = !head || head.score < MATCH_THRESHOLD_REVIEW
  const activityWeak = topActivityScore < MATCH_THRESHOLD_REVIEW

  let ranked = rankedRaw
  if (headWeak && activityWeak) {
    const macroHits = rankedRaw.filter(
      (r) =>
        r.candidate.nodeType === 'TASK' &&
        r.score >= MATCH_TASK_MACRO_MIN_SCORE &&
        taskMacroStructuralGate(service.description, r.candidate),
    )
    if (macroHits.length > 0) {
      const pick = macroHits[0]!
      ranked = [pick, ...rankedRaw.filter((x) => x !== pick)]
    }
  }

  const best = ranked[0]
  const second = ranked[1]
  const createNewAlts = collectCreateNewAlternatives(ranked, candidates)

  if (isDocumentDraftPipelineFlagsEnabled()) {
    const tasksTop = rankedRaw
      .filter((r) => r.candidate.nodeType === 'TASK')
      .slice(0, 3)
      .map((r) => ({
        title: r.candidate.activity,
        score: r.score,
        totalActivities: r.candidate.descendantActivitiesCount ?? 0,
        totalPlannedMinutes: r.candidate.plannedMinutes ?? 0,
      }))
    console.info({
      stage: 'document_draft.matching.hierarchical_summary',
      serviceItemIndex: opts?.serviceItemIndex,
      topScoreRaw: rankedRaw[0]?.score ?? null,
      topCandidateNodeTypeRaw: rankedRaw[0]?.candidate.nodeType ?? null,
      topCandidateTitleRaw: rankedRaw[0]?.candidate.activity ?? null,
      taskCandidatesCount: rankedRaw.filter((r) => r.candidate.nodeType === 'TASK').length,
      sectorCandidatesCount: rankedRaw.filter((r) => r.candidate.nodeType === 'SECTOR').length,
      activityCandidatesCount: rankedRaw.filter(
        (r) => (r.candidate.nodeType ?? 'ACTIVITY') === 'ACTIVITY',
      ).length,
      topTaskCandidates: tasksTop,
      macroReorderApplied:
        (ranked[0]?.candidate.matrixNodeId ?? '') !== (rankedRaw[0]?.candidate.matrixNodeId ?? ''),
      reason: 'pre_threshold_check',
    })
  }

  if (!passesReviewThreshold(best, service.description)) {
    const planWeak: NonNullable<ArgosDocumentIngestResult['matchingPlan']>[number] = {
      extractedServiceDescription: service.description,
      suggestedAction: 'CREATE_NEW' as const,
      confidence: best ? Math.max(0.2, clampConfidence01(best.score)) : 0.2,
      matchReason: buildMatchReason({
        score: best?.score ?? 0,
        suggestedAction: 'CREATE_NEW',
        matchedTerms: best?.matchedTerms ?? [],
        phraseHitIds: best?.phraseHitIds ?? [],
        ambiguous: false,
        bestPhraseIds: [],
      }),
      ...(createNewAlts.length > 0 ? { alternativeCandidates: createNewAlts } : {}),
    }
    if (isDocumentDraftPipelineFlagsEnabled()) {
      console.info({
        stage: 'document_draft.matching.hierarchical_summary',
        serviceItemIndex: opts?.serviceItemIndex,
        suggestedAction: planWeak.suggestedAction,
        topScore: best?.score ?? null,
        topCandidateNodeType: best?.candidate.nodeType ?? null,
        topCandidateTitle: best?.candidate.activity ?? null,
        reason: 'below_review_threshold',
      })
    }
    return planWeak
  }

  const nt = (best!.candidate.nodeType ?? 'ACTIVITY') as 'TASK' | 'SECTOR' | 'ACTIVITY'
  const ambiguous =
    Boolean(second) &&
    passesReviewThreshold(second, service.description) &&
    best!.score - second.score <= MATCH_AMBIGUITY_MAX_GAP

  const suggestedAction = ambiguous
    ? ('REVIEW_SIMILAR' as const)
    : actionFromScoreForNodeType(best!.score, nt)

  let matchReason =
    ambiguous || nt !== 'TASK' || best!.score >= MATCH_THRESHOLD_REVIEW
      ? buildMatchReason({
          score: best!.score,
          suggestedAction,
          matchedTerms: best!.matchedTerms,
          phraseHitIds: best!.phraseHitIds,
          ambiguous,
          bestPhraseIds: best!.phraseHitIds,
        })
      : `Tarefa macro da Matriz (${best!.score.toFixed(2)}): ${best!.matchedTerms.slice(0, 5).join(', ') || 'estrutura operacional'}. Confirmar correspondência com o serviço da OS.`

  if (structuralGuardNote) {
    matchReason = `${matchReason} ${structuralGuardNote}`.trim()
  }

  const alternatives = buildAlternativeCandidates(ranked, 1, candidates)

  const primaryKind =
    (best!.candidate.nodeType ?? 'ACTIVITY') === 'ACTIVITY'
      ? ('MATRIX_ACTIVITY' as const)
      : ('MATRIX_SUBTREE' as const)
  const matrixSubtree =
    primaryKind === 'MATRIX_SUBTREE'
      ? buildMatrixSubtreeV11FromPool(best!.candidate, candidates)
      : undefined

  const plannedPrimary =
    best!.candidate.plannedMinutes === null || best!.candidate.plannedMinutes === undefined
      ? undefined
      : Math.max(0, toFiniteNumber(best!.candidate.plannedMinutes, 0))

  const planOk: NonNullable<ArgosDocumentIngestResult['matchingPlan']>[number] = {
    extractedServiceDescription: service.description,
    suggestedAction,
    confidence: clampConfidence01(best!.score),
    matchReason,
    matchedMatrixNodeId: best!.candidate.matrixNodeId,
    matchedMatrixNodeType: best!.candidate.nodeType ?? 'ACTIVITY',
    matchedConveyorNodeId: undefined,
    reusedStructure: {
      kind: primaryKind,
      step: best!.candidate.step ?? undefined,
      sector: best!.candidate.sector ?? undefined,
      activity: best!.candidate.activity,
      plannedMinutes: plannedPrimary,
      teamId: best!.candidate.teamId ?? undefined,
      teamName: best!.candidate.teamName ?? undefined,
      collaboratorId: best!.candidate.collaboratorId ?? undefined,
      collaboratorName: best!.candidate.collaboratorName ?? undefined,
      isPrimary: true,
    },
    ...((best!.candidate.nodeType ?? 'ACTIVITY') !== 'ACTIVITY'
      ? {
          subtreeSummary: {
            rootNodeType: best!.candidate.nodeType ?? 'ACTIVITY',
            totalAreas:
              (best!.candidate.nodeType ?? 'ACTIVITY') === 'TASK'
                ? toNonNegativeInt(best!.candidate.descendantSectorsCount ?? 0, 0)
                : 1,
            totalActivities: toNonNegativeInt(
              best!.candidate.descendantActivitiesCount ?? 0,
              0,
            ),
            totalPlannedMinutes: Math.max(
              0,
              toFiniteNumber(best!.candidate.plannedMinutes ?? 0, 0),
            ),
            previewActivities: limitPreviewActivities(best!.candidate.sampleActivities ?? []),
          },
        }
      : {}),
    ...(matrixSubtree ? { matrixSubtree } : {}),
    ...(alternatives.length > 0 ? { alternativeCandidates: alternatives } : {}),
  }

  if (isDocumentDraftPipelineFlagsEnabled()) {
    console.info({
      stage: 'document_draft.matching.hierarchical_summary',
      serviceItemIndex: opts?.serviceItemIndex,
      suggestedAction: planOk.suggestedAction,
      topScore: best?.score ?? null,
      topCandidateNodeType: best?.candidate.nodeType ?? null,
      topCandidateTitle: best?.candidate.activity ?? null,
      reason: 'matched',
    })
  }

  return planOk
}

/**
 * R6 S4: por serviceItem — recall ILIKE com tokens → score S3; fallback lista ampla (enriched/fallback)
 * se recall vazia; `matching.no_candidates` só quando a Matriz não tem actividades.
 */
export async function matchOperationalItems(params: {
  pool: pg.Pool
  serviceItems: NonNullable<ArgosDocumentIngestResult['extractedItems']>['serviceItems']
}): Promise<MatchOperationalItemsResult> {
  const { pool, serviceItems } = params
  const started = Date.now()

  if (serviceItems.length === 0) {
    return {
      matchingPlan: [],
      outcome: { kind: 'ok', querySource: 'enriched' },
    }
  }

  try {
    const matrixCount = await countMatrixActivities(pool)
    if (matrixCount === 0) {
      return {
        matchingPlan: serviceItems.map((s) => planSingleService(s, [])),
        outcome: { kind: 'no_candidates', querySource: 'enriched' },
      }
    }

    let fullMatrixCache: {
      rows: MatrixMatchCandidate[]
      source: Exclude<MatrixCandidatesLoadSource, 'recall_ilike'>
    } | null = null
    let outcomeSource: MatrixCandidatesLoadSource = 'recall_ilike'

    const ensureFullMatrix = async (): Promise<MatrixMatchCandidate[]> => {
      if (!fullMatrixCache) {
        fullMatrixCache = await loadMatrixActivityCandidates(pool)
        outcomeSource = fullMatrixCache.source
      }
      return fullMatrixCache.rows
    }

    const matchingPlan: NonNullable<ArgosDocumentIngestResult['matchingPlan']> = []

    for (const service of serviceItems) {
      const patterns = buildIlikePatternsFromService(service.description)
      let candidates: MatrixMatchCandidate[] = []
      if (patterns.length > 0) {
        const recalledActs = await recallCandidatesByTokens(pool, patterns)
        const recalledTasks = await recallDirectTaskCandidates(pool, patterns)
        candidates = [...recalledActs, ...recalledTasks]
      }
      if (candidates.length === 0) {
        candidates = await ensureFullMatrix()
      }
      matchingPlan.push(planSingleService(service, candidates, { serviceItemIndex: matchingPlan.length }))
    }

    if (isDocumentDraftPipelineFlagsEnabled()) {
      console.info({
        stage: 'document_draft.matching.recall_summary',
        serviceItemsCount: serviceItems.length,
        matrixActivityCount: matrixCount,
        usedFullMatrixFallback: Boolean(fullMatrixCache),
        durationMs: Date.now() - started,
        topScoresSample: matchingPlan.map((p) => p.confidence ?? 0).slice(0, 8),
      })
    }

    return {
      matchingPlan,
      outcome: { kind: 'ok', querySource: outcomeSource },
    }
  } catch (e) {
    const { code, message } = extractPgError(e)
    return {
      matchingPlan: [],
      outcome: {
        kind: 'technical_failure',
        pgCode: code,
        sanitizedMessage: sanitizeMatchingErrorMessageForLog(message),
      },
    }
  }
}
