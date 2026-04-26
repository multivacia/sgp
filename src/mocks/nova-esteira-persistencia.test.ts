import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function installWindowLocalStorage() {
  const store: Record<string, string> = {}
  const ls = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = String(v)
    },
    removeItem: (k: string) => {
      delete store[k]
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k]
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
    get length() {
      return Object.keys(store).length
    },
  } as Storage
  vi.stubGlobal('window', { localStorage: ls } as unknown as Window & typeof globalThis)
}
import {
  NOVA_ESTEIRA_DRAFTS_STORAGE_KEY,
  normalizarDraftPersistido,
  readDraftsSafely,
} from './nova-esteira-drafts-storage'
import {
  avaliarComposicaoNovaEsteira,
  snapshotComposicaoMontagem,
} from './nova-esteira-composicao'
import {
  arquivarRascunhoNovaEsteira,
  atualizarRascunhoNovaEsteira,
  listarRascunhosNovaEsteira,
  marcarMaterializacaoRascunhoNovaEsteira,
  obterRascunhoPorId,
  salvarRascunhoNovaEsteira,
} from './nova-esteira-drafts-repository'
import {
  criarDraftNovaEsteiraAPartirDeCenario,
  criarDraftNovaEsteiraEmBranco,
  criarRegistroRascunhoSalvo,
  duplicarDraftNovaEsteiraPersistido,
} from './nova-esteira-draft-factory'
import {
  NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL,
  NOVA_ESTEIRA_EXEMPLO_VAZIA,
} from './nova-esteira-composicao-exemplos'
import {
  buildSnapshotResumido,
  deriveStatusJornada,
} from './nova-esteira-persistencia-snapshot'

beforeEach(() => {
  installWindowLocalStorage()
  globalThis.localStorage = (
    globalThis as unknown as { window: { localStorage: Storage } }
  ).window.localStorage
})

afterEach(() => {
  globalThis.localStorage.clear()
})

describe('Nova Esteira — persistência mock', () => {
  it('cria draft em branco (fábrica)', () => {
    const p = criarDraftNovaEsteiraEmBranco()
    expect(p.origem).toBe('blank')
    expect(p.draft.estruturaOrigem).toBeNull()
    expect(p.lastSnapshot.nomeExibicao).toBeDefined()
  })

  it('cria draft a partir de cenário', () => {
    const p = criarDraftNovaEsteiraAPartirDeCenario('minima-valida')
    expect(p).not.toBeNull()
    expect(p!.origem).toBe('cenario')
    expect(p!.cenarioId).toBe('minima-valida')
    expect(p!.draft.linhasManual.length).toBeGreaterThan(0)
  })

  it('duplica draft com novo id e trilha temporal', () => {
    const a = criarRegistroRascunhoSalvo(
      structuredClone(NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL),
      'estrutura_montagem',
      'blank',
    )
    salvarRascunhoNovaEsteira(a)
    const dup = duplicarDraftNovaEsteiraPersistido(a.id)
    expect(dup).not.toBeNull()
    expect(dup!.id).not.toBe(a.id)
    expect(dup!.origem).toBe('duplicacao')
    expect(dup!.createdAt).not.toBe(a.createdAt)
    expect(listarRascunhosNovaEsteira()).toHaveLength(2)
  })

  it('salva e reabre draft', () => {
    const draft = structuredClone(NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL)
    const reg = criarRegistroRascunhoSalvo(draft, 'revisao', 'blank')
    salvarRascunhoNovaEsteira(reg)
    const loaded = obterRascunhoPorId(reg.id)
    expect(loaded?.draft.dados.nome).toBe(draft.dados.nome)
    expect(loaded?.etapaAtual).toBe('revisao')
  })

  it('restaura etapa atual ao ler storage', () => {
    const reg = criarRegistroRascunhoSalvo(
      structuredClone(NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL),
      'revisao',
      'blank',
    )
    salvarRascunhoNovaEsteira(reg)
    const again = obterRascunhoPorId(reg.id)
    expect(again?.etapaAtual).toBe('revisao')
  })

  it('snapshot persistido coerente com domínio', () => {
    const draft = structuredClone(NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL)
    const snap = buildSnapshotResumido(draft)
    const dom = avaliarComposicaoNovaEsteira(draft)
    expect(snap.statusGeralComposicao).toBe(dom.montagem.statusGeral)
    expect(snap.podeMaterializar).toBe(dom.montagem.podeMaterializar)
    expect(snap.contagem.validos).toBe(dom.montagem.blocosValidos.length)
  })

  it('trata storage vazio e JSON inválido', () => {
    expect(readDraftsSafely()).toEqual([])
    localStorage.setItem(NOVA_ESTEIRA_DRAFTS_STORAGE_KEY, 'not-json{')
    expect(readDraftsSafely()).toEqual([])
  })

  it('normalizarDraftPersistido rejeita registro inválido e aceita válido', () => {
    expect(normalizarDraftPersistido(null)).toBeNull()
    expect(normalizarDraftPersistido({ foo: 1 })).toBeNull()
    const p = criarDraftNovaEsteiraEmBranco()
    salvarRascunhoNovaEsteira(p)
    const raw = JSON.parse(localStorage.getItem(NOVA_ESTEIRA_DRAFTS_STORAGE_KEY)!)
    const first = raw.drafts[0]
    expect(normalizarDraftPersistido(first)).not.toBeNull()
  })

  it('vínculo de materialização persiste referência', () => {
    const reg = criarRegistroRascunhoSalvo(
      structuredClone(NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL),
      'revisao',
      'blank',
    )
    salvarRascunhoNovaEsteira(reg)
    const out = marcarMaterializacaoRascunhoNovaEsteira(reg.id, {
      esteiraRowId: 'est-1',
      materializacaoSeed: 'seed-x',
      destino: 'backlog',
      concluidoEm: '2026-04-01T12:00:00.000Z',
    })
    expect(out?.statusJornada).toBe('materializado')
    expect(out?.materializacaoVinculada?.esteiraRowId).toBe('est-1')
    expect(out?.materializacaoVinculada?.rascunhoOrigemId).toBe(reg.id)
  })

  it('ao reabrir, composição revalida a partir do draft — snapshot não é fonte de verdade', () => {
    const draft = structuredClone(NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL)
    const reg = criarRegistroRascunhoSalvo(draft, 'estrutura_montagem', 'blank')
    salvarRascunhoNovaEsteira(reg)
    const loaded = obterRascunhoPorId(reg.id)!
    const staleSnapshot = loaded.lastSnapshot
    const draftAlterado = {
      ...loaded.draft,
      dados: { ...loaded.draft.dados, nome: 'Nome alterado' },
    }
    atualizarRascunhoNovaEsteira(reg.id, { draft: draftAlterado })
    const refreshed = obterRascunhoPorId(reg.id)!
    const fresh = snapshotComposicaoMontagem(refreshed.draft)
    expect(fresh.resultado.montagem.podeMaterializar).toBe(
      snapshotComposicaoMontagem(draftAlterado).resultado.montagem.podeMaterializar,
    )
    expect(refreshed.lastSnapshot.nomeExibicao).not.toBe(staleSnapshot.nomeExibicao)
  })

  it('duplicarDraftNovaEsteiraPersistido delega ao repositório', () => {
    const a = criarDraftNovaEsteiraEmBranco()
    salvarRascunhoNovaEsteira(a)
    const dup = duplicarDraftNovaEsteiraPersistido(a.id)
    expect(dup?.origem).toBe('duplicacao')
  })

  it('atualizar não altera rascunho já materializado (autosave seguro)', () => {
    const reg = criarRegistroRascunhoSalvo(
      structuredClone(NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL),
      'revisao',
      'blank',
    )
    salvarRascunhoNovaEsteira(reg)
    marcarMaterializacaoRascunhoNovaEsteira(reg.id, {
      esteiraRowId: 'est-mat',
      materializacaoSeed: 'seed',
      destino: 'backlog',
      concluidoEm: '2026-04-01T12:00:00.000Z',
    })
    const antes = obterRascunhoPorId(reg.id)!
    const tentativa = atualizarRascunhoNovaEsteira(reg.id, {
      draft: { ...antes.draft, dados: { ...antes.draft.dados, nome: 'Tentativa' } },
    })
    expect(tentativa).toBeNull()
    const depois = obterRascunhoPorId(reg.id)!
    expect(depois.draft.dados.nome).toBe(antes.draft.dados.nome)
    expect(depois.statusJornada).toBe('materializado')
  })

  it('salvar retorna false quando o storage falha na gravação', () => {
    const ls = globalThis.localStorage
    const orig = ls.setItem
    ls.setItem = () => {
      throw new Error('quota')
    }
    try {
      const p = criarDraftNovaEsteiraEmBranco()
      expect(salvarRascunhoNovaEsteira(p)).toBe(false)
    } finally {
      ls.setItem = orig
    }
  })

  it('arquivar remove da listagem padrão e mantém com incluirArquivados', () => {
    const reg = criarRegistroRascunhoSalvo(
      structuredClone(NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL),
      'estrutura_montagem',
      'blank',
    )
    salvarRascunhoNovaEsteira(reg)
    expect(listarRascunhosNovaEsteira()).toHaveLength(1)
    arquivarRascunhoNovaEsteira(reg.id)
    expect(listarRascunhosNovaEsteira()).toHaveLength(0)
    expect(listarRascunhosNovaEsteira({ incluirArquivados: true })).toHaveLength(1)
  })

  it('deriveStatusJornada reflete etapa e composição', () => {
    expect(
      deriveStatusJornada(
        NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL,
        'estrutura_montagem',
        false,
        false,
      ),
    ).toBe('pronto_revisao')
    expect(
      deriveStatusJornada(NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL, 'revisao', false, false),
    ).toBe('pronto_materializar')
    expect(
      deriveStatusJornada(NOVA_ESTEIRA_EXEMPLO_VAZIA, 'estrutura_montagem', false, false),
    ).toBe(
      'em_edicao',
    )
  })

  it('mensagens coerentes em retomada inválida: obterRascunhoPorId null', () => {
    expect(obterRascunhoPorId('id-inexistente')).toBeNull()
  })

  it('duplicação preserva draft e gera nova identidade sem materialização', () => {
    const a = criarRegistroRascunhoSalvo(
      structuredClone(NOVA_ESTEIRA_EXEMPLO_VALIDA_MANUAL),
      'revisao',
      'blank',
    )
    salvarRascunhoNovaEsteira(a)
    marcarMaterializacaoRascunhoNovaEsteira(a.id, {
      esteiraRowId: 'e1',
      materializacaoSeed: 's',
      destino: 'exec',
      concluidoEm: '2026-04-01T12:00:00.000Z',
    })
    const dup = duplicarDraftNovaEsteiraPersistido(a.id)
    expect(dup?.id).not.toBe(a.id)
    expect(dup?.materializacaoVinculada).toBeUndefined()
    expect(dup?.statusJornada).not.toBe('materializado')
    expect(dup?.draft.dados.nome).toBe(a.draft.dados.nome)
  })
})
