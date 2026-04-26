/**
 * Armazenamento local encapsulado — sem parse/stringify na UI.
 *
 * Pontos de troca futuros: substituir `localStorage` por cliente HTTP ou adapter assíncrono,
 * mantendo `readDraftsSafely` / `writeDraftsEnvelope` como fachada ou renomeando para um
 * `NovaEsteiraDraftsStore` injetável. Cenários mock (`nova-esteira-cenarios-mock`) migram para
 * templates remotos preservando o shape `NovaEsteiraDraft`.
 */

import {
  NOVA_ESTEIRA_DRAFT_STORAGE_VERSION,
  NOVA_ESTEIRA_RASCUNHO_PERSISTIDO_VERSION,
  NOVA_ESTEIRA_SNAPSHOT_RESUMIDO_VERSION,
  type NovaEsteiraDraftStoreEnvelopeV1,
  type NovaEsteiraRascunhoPersistido,
} from './nova-esteira-persistido'

export const NOVA_ESTEIRA_DRAFTS_STORAGE_KEY = 'sgp.novaEsteira.drafts.v1'

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function safeDraftArray(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) return []
  return raw
}

function normalizeSnapshot(
  s: Record<string, unknown> | undefined,
): NovaEsteiraRascunhoPersistido['lastSnapshot'] | null {
  if (!s || !isRecord(s)) return null
  if (s.version !== NOVA_ESTEIRA_SNAPSHOT_RESUMIDO_VERSION) return null
  const contagem = s.contagem
  if (!isRecord(contagem)) return null
  const cv = contagem.validos
  const cp = contagem.pendentes
  const ci = contagem.invalidos
  if (
    typeof cv !== 'number' ||
    typeof cp !== 'number' ||
    typeof ci !== 'number'
  ) {
    return null
  }
  const statusGeralComposicao = s.statusGeralComposicao
  const podeMaterializar = s.podeMaterializar
  const resumoComposicaoCurto = s.resumoComposicaoCurto
  const nomeExibicao = s.nomeExibicao
  if (
    typeof statusGeralComposicao !== 'string' ||
    typeof podeMaterializar !== 'boolean' ||
    typeof resumoComposicaoCurto !== 'string' ||
    typeof nomeExibicao !== 'string'
  ) {
    return null
  }
  return {
    version: NOVA_ESTEIRA_SNAPSHOT_RESUMIDO_VERSION,
    statusGeralComposicao: statusGeralComposicao as NovaEsteiraRascunhoPersistido['lastSnapshot']['statusGeralComposicao'],
    podeMaterializar,
    motivoPrincipalBloqueio:
      typeof s.motivoPrincipalBloqueio === 'string'
        ? s.motivoPrincipalBloqueio
        : undefined,
    contagem: { validos: cv, pendentes: cp, invalidos: ci },
    destinoPretendido:
      s.destinoPretendido === 'backlog' || s.destinoPretendido === 'exec'
        ? s.destinoPretendido
        : undefined,
    resumoComposicaoCurto,
    nomeExibicao,
    estruturaOrigemLabel:
      typeof s.estruturaOrigemLabel === 'string'
        ? s.estruturaOrigemLabel
        : undefined,
  }
}

/**
 * Reidrata um registro persistido; retorna null se inválido.
 */
export function normalizarDraftPersistido(raw: unknown): NovaEsteiraRascunhoPersistido | null {
  if (!isRecord(raw)) return null
  const id = raw.id
  const draft = raw.draft
  if (typeof id !== 'string' || id.length === 0 || !isRecord(draft)) return null
  const version = raw.version
  if (version !== NOVA_ESTEIRA_RASCUNHO_PERSISTIDO_VERSION) return null
  const origem = raw.origem
  const nomeRascunho = raw.nomeRascunho
  const etapaAtual = raw.etapaAtual
  const statusJornada = raw.statusJornada
  const createdAt = raw.createdAt
  const updatedAt = raw.updatedAt
  if (
    typeof nomeRascunho !== 'string' ||
    typeof createdAt !== 'string' ||
    typeof updatedAt !== 'string'
  ) {
    return null
  }
  const allowedOrigem = ['blank', 'cenario', 'duplicacao', 'rascunho'] as const
  if (!allowedOrigem.includes(origem as (typeof allowedOrigem)[number])) return null
  const allowedEtapa = [
    'dados_iniciais',
    'estrutura_montagem',
    'revisao',
    'montagem',
  ] as const
  if (!allowedEtapa.includes(etapaAtual as (typeof allowedEtapa)[number])) return null
  const allowedStatus = [
    'em_edicao',
    'pronto_revisao',
    'pronto_materializar',
    'materializado',
    'arquivado',
  ] as const
  if (!allowedStatus.includes(statusJornada as (typeof allowedStatus)[number])) return null

  const snap = normalizeSnapshot(raw.lastSnapshot as Record<string, unknown> | undefined)
  if (!snap) return null

  const materializacao = raw.materializacaoVinculada
  let materializacaoVinculada: NovaEsteiraRascunhoPersistido['materializacaoVinculada']
  if (materializacao && isRecord(materializacao)) {
    const eid = materializacao.esteiraRowId
    const seed = materializacao.materializacaoSeed
    const dest = materializacao.destino
    const conc = materializacao.concluidoEm
    const ro = materializacao.rascunhoOrigemId
    if (
      typeof eid === 'string' &&
      typeof seed === 'string' &&
      (dest === 'backlog' || dest === 'exec') &&
      typeof conc === 'string' &&
      typeof ro === 'string'
    ) {
      materializacaoVinculada = {
        esteiraRowId: eid,
        materializacaoSeed: seed,
        destino: dest,
        concluidoEm: conc,
        rascunhoOrigemId: ro,
      }
    }
  }

  return {
    id,
    version: NOVA_ESTEIRA_RASCUNHO_PERSISTIDO_VERSION,
    origem: origem as NovaEsteiraRascunhoPersistido['origem'],
    cenarioId: typeof raw.cenarioId === 'string' ? (raw.cenarioId as NovaEsteiraRascunhoPersistido['cenarioId']) : undefined,
    nomeRascunho,
    descricao: typeof raw.descricao === 'string' ? raw.descricao : undefined,
    destinoPretendido:
      raw.destinoPretendido === 'backlog' || raw.destinoPretendido === 'exec'
        ? raw.destinoPretendido
        : undefined,
    draft: draft as NovaEsteiraRascunhoPersistido['draft'],
    etapaAtual: etapaAtual as NovaEsteiraRascunhoPersistido['etapaAtual'],
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((t): t is string => typeof t === 'string')
      : undefined,
    statusJornada: statusJornada as NovaEsteiraRascunhoPersistido['statusJornada'],
    lastSnapshot: snap,
    createdAt,
    updatedAt,
    lastOpenedAt:
      typeof raw.lastOpenedAt === 'string' ? raw.lastOpenedAt : undefined,
    materializacaoVinculada,
    metadata: isRecord(raw.metadata) ? raw.metadata : undefined,
  }
}

export function readDraftsSafely(): NovaEsteiraRascunhoPersistido[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return []
  }
  try {
    const raw = window.localStorage.getItem(NOVA_ESTEIRA_DRAFTS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed)) return []
    if (parsed.schemaVersion !== NOVA_ESTEIRA_DRAFT_STORAGE_VERSION) {
      return migrateOrFallback(parsed)
    }
    const drafts = safeDraftArray(parsed.drafts)
    const out: NovaEsteiraRascunhoPersistido[] = []
    for (const d of drafts) {
      const n = normalizarDraftPersistido(d)
      if (n) out.push(n)
    }
    return out
  } catch {
    return []
  }
}

function migrateOrFallback(parsed: Record<string, unknown>): NovaEsteiraRascunhoPersistido[] {
  if (parsed.schemaVersion === 1 && Array.isArray(parsed.drafts)) {
    const out: NovaEsteiraRascunhoPersistido[] = []
    for (const d of parsed.drafts) {
      const n = normalizarDraftPersistido(d)
      if (n) out.push(n)
    }
    return out
  }
  return []
}

export function writeDraftsEnvelope(drafts: NovaEsteiraRascunhoPersistido[]): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false
  }
  try {
    const envelope: NovaEsteiraDraftStoreEnvelopeV1 = {
      schemaVersion: NOVA_ESTEIRA_DRAFT_STORAGE_VERSION,
      drafts,
    }
    window.localStorage.setItem(
      NOVA_ESTEIRA_DRAFTS_STORAGE_KEY,
      JSON.stringify(envelope),
    )
    return true
  } catch {
    return false
  }
}
