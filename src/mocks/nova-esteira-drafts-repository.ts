/**
 * Repositório mock de rascunhos da Nova Esteira — operações centralizadas sobre storage local.
 *
 * Troca futura (API/DB): substituir `readDraftsSafely` / `writeDraftsEnvelope` por um adapter
 * que preserve o contrato `NovaEsteiraRascunhoPersistido` e as funções exportadas deste módulo.
 */

import {
  buildSnapshotResumido,
  deriveStatusJornada,
} from './nova-esteira-persistencia-snapshot'
import { novoIdRascunhoNovaEsteira, timestampIso } from './nova-esteira-persistencia-ids'
import {
  NOVA_ESTEIRA_RASCUNHO_PERSISTIDO_VERSION,
  type NovaEsteiraMaterializacaoVinculada,
  type NovaEsteiraRascunhoPersistido,
} from './nova-esteira-persistido'
import { readDraftsSafely, writeDraftsEnvelope } from './nova-esteira-drafts-storage'
import type { NovaEsteiraDraft } from './nova-esteira-composicao'
import { normalizeRascunhoNovaEsteira } from './nova-esteira-jornada-migration'
import type { NovaEsteiraEtapaPersistida } from './nova-esteira-persistido'

function persistAll(drafts: NovaEsteiraRascunhoPersistido[]): boolean {
  return writeDraftsEnvelope(drafts)
}

function touchUpdated(p: NovaEsteiraRascunhoPersistido): NovaEsteiraRascunhoPersistido {
  return { ...p, updatedAt: timestampIso() }
}

function recomputeDerived(
  p: NovaEsteiraRascunhoPersistido,
): NovaEsteiraRascunhoPersistido {
  const materializado = Boolean(p.materializacaoVinculada)
  const arquivado = p.statusJornada === 'arquivado'
  const lastSnapshot = buildSnapshotResumido(p.draft, {
    destinoPretendido: p.destinoPretendido,
  })
  const statusJornada = deriveStatusJornada(
    p.draft,
    p.etapaAtual,
    materializado,
    arquivado,
  )
  return {
    ...p,
    nomeRascunho: p.draft.dados.nome.trim() || p.nomeRascunho || 'Sem título',
    lastSnapshot,
    statusJornada: arquivado ? 'arquivado' : materializado ? 'materializado' : statusJornada,
  }
}

export function listarRascunhosNovaEsteira(opcoes?: {
  incluirArquivados?: boolean
}): NovaEsteiraRascunhoPersistido[] {
  const all = readDraftsSafely()
  const filtrados =
    opcoes?.incluirArquivados === true
      ? all
      : all.filter((d) => d.statusJornada !== 'arquivado')
  return [...filtrados]
    .map((d) => normalizeRascunhoNovaEsteira(d))
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
}

export function obterRascunhoPorId(
  id: string,
): NovaEsteiraRascunhoPersistido | null {
  const raw = readDraftsSafely().find((d) => d.id === id) ?? null
  return raw ? normalizeRascunhoNovaEsteira(raw) : null
}

export function salvarRascunhoNovaEsteira(
  registro: NovaEsteiraRascunhoPersistido,
): boolean {
  const all = readDraftsSafely()
  const next = recomputeDerived(touchUpdated(registro))
  const idx = all.findIndex((d) => d.id === next.id)
  let drafts: NovaEsteiraRascunhoPersistido[]
  if (idx >= 0) {
    drafts = [...all]
    drafts[idx] = next
  } else {
    drafts = [next, ...all]
  }
  return persistAll(drafts)
}

export function atualizarRascunhoNovaEsteira(
  id: string,
  patch: Partial<
    Pick<
      NovaEsteiraRascunhoPersistido,
      | 'draft'
      | 'etapaAtual'
      | 'nomeRascunho'
      | 'descricao'
      | 'destinoPretendido'
      | 'tags'
      | 'metadata'
    >
  >,
): NovaEsteiraRascunhoPersistido | null {
  const cur = obterRascunhoPorId(id)
  if (!cur) return null
  if (cur.statusJornada === 'materializado' || cur.statusJornada === 'arquivado') {
    return null
  }
  const merged: NovaEsteiraRascunhoPersistido = {
    ...cur,
    ...patch,
    draft: patch.draft ?? cur.draft,
    version: NOVA_ESTEIRA_RASCUNHO_PERSISTIDO_VERSION,
  }
  const next = recomputeDerived(touchUpdated(merged))
  const all = readDraftsSafely()
  const idx = all.findIndex((d) => d.id === id)
  if (idx < 0) return null
  const drafts = [...all]
  drafts[idx] = next
  if (!persistAll(drafts)) return null
  return next
}

export function registrarAberturaRascunho(id: string): NovaEsteiraRascunhoPersistido | null {
  const cur = obterRascunhoPorId(id)
  if (!cur) return null
  const next = touchUpdated(
    recomputeDerived({
      ...cur,
      lastOpenedAt: timestampIso(),
    }),
  )
  const all = readDraftsSafely()
  const idx = all.findIndex((d) => d.id === id)
  if (idx < 0) return null
  const drafts = [...all]
  drafts[idx] = next
  if (!persistAll(drafts)) return null
  return next
}

export function duplicarRascunhoNovaEsteira(
  idOrigem: string,
): NovaEsteiraRascunhoPersistido | null {
  const src = obterRascunhoPorId(idOrigem)
  if (!src) return null
  const now = timestampIso()
  const draftClone = structuredClone(src.draft) as NovaEsteiraDraft
  const novo: NovaEsteiraRascunhoPersistido = recomputeDerived({
    id: novoIdRascunhoNovaEsteira(),
    version: NOVA_ESTEIRA_RASCUNHO_PERSISTIDO_VERSION,
    origem: 'duplicacao',
    nomeRascunho: `${src.nomeRascunho} (cópia)`,
    draft: draftClone,
    etapaAtual: 'estrutura_montagem' as NovaEsteiraEtapaPersistida,
    statusJornada: 'em_edicao',
    lastSnapshot: buildSnapshotResumido(draftClone, {}),
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
    descricao: src.descricao,
    destinoPretendido: src.destinoPretendido,
    tags: src.tags ? [...src.tags] : undefined,
    metadata: { ...((src.metadata ?? {}) as Record<string, unknown>), duplicadoDe: src.id },
  })
  const all = readDraftsSafely()
  if (!persistAll([novo, ...all])) return null
  return novo
}

export function arquivarRascunhoNovaEsteira(id: string): boolean {
  const cur = obterRascunhoPorId(id)
  if (!cur) return false
  const next = recomputeDerived(
    touchUpdated({
      ...cur,
      statusJornada: 'arquivado',
    }),
  )
  const all = readDraftsSafely()
  const idx = all.findIndex((d) => d.id === id)
  if (idx < 0) return false
  const drafts = [...all]
  drafts[idx] = next
  return persistAll(drafts)
}

export function removerRascunhoNovaEsteira(id: string): boolean {
  const all = readDraftsSafely()
  const next = all.filter((d) => d.id !== id)
  if (next.length === all.length) return false
  return persistAll(next)
}

export function marcarMaterializacaoRascunhoNovaEsteira(
  rascunhoId: string,
  vinculo: Omit<NovaEsteiraMaterializacaoVinculada, 'rascunhoOrigemId'> & {
    rascunhoOrigemId?: string
  },
): NovaEsteiraRascunhoPersistido | null {
  const cur = obterRascunhoPorId(rascunhoId)
  if (!cur) return null
  const materializacaoVinculada: NovaEsteiraMaterializacaoVinculada = {
    esteiraRowId: vinculo.esteiraRowId,
    materializacaoSeed: vinculo.materializacaoSeed,
    destino: vinculo.destino,
    concluidoEm: vinculo.concluidoEm,
    rascunhoOrigemId: vinculo.rascunhoOrigemId ?? rascunhoId,
  }
  const merged = touchUpdated({
    ...cur,
    materializacaoVinculada,
    statusJornada: 'materializado',
  })
  const next = recomputeDerived(merged)
  const all = readDraftsSafely()
  const idx = all.findIndex((d) => d.id === rascunhoId)
  if (idx < 0) return null
  const drafts = [...all]
  drafts[idx] = next
  if (!persistAll(drafts)) return null
  return next
}
