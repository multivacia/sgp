/**
 * Runtime em memória dos apontamentos — sem dependência de `esteira-operacional`
 * (evita ciclo com a projeção que consome apontamentos por atividade).
 */
import type {
  ApontamentoHistoricoAtividade,
  ApontamentoOperacional,
} from './apontamentos-types'

const store: ApontamentoOperacional[] = []
let seq = 0
let version = 0
const listeners = new Set<() => void>()

function bump() {
  version += 1
  listeners.forEach((l) => l())
}

export function subscribeApontamentos(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function getApontamentosVersion(): number {
  return version
}

export function nextSeq(): number {
  seq += 1
  return seq
}

export function pushApontamento(ap: ApontamentoOperacional): void {
  store.push(ap)
  bump()
}

export function listarApontamentosPorEsteira(
  esteiraId: string,
): ApontamentoOperacional[] {
  return store
    .filter((x) => x.esteiraId === esteiraId)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
}

export function listarApontamentosPorAtividade(
  esteiraId: string,
  atividadeId: string,
): ApontamentoOperacional[] {
  return store
    .filter((x) => x.esteiraId === esteiraId && x.atividadeId === atividadeId)
    .slice()
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
}

export function obterHistoricoAgregadoAtividade(
  esteiraId: string,
  atividadeId: string,
): ApontamentoHistoricoAtividade {
  const itens = listarApontamentosPorAtividade(esteiraId, atividadeId)
  const totalMinutos = itens.reduce((s, x) => s + x.minutos, 0)
  const ultimo = itens.length ? itens[itens.length - 1] : undefined
  return {
    quantidade: itens.length,
    totalMinutos,
    ultimo,
    itens: itens.slice().sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    ),
  }
}

export function obterResumoApontamentosEsteira(esteiraId: string): {
  totalApontamentos: number
  totalMinutos: number
  atividadesComApontamento: number
} {
  const subset = store.filter((x) => x.esteiraId === esteiraId)
  const totalMinutos = subset.reduce((s, x) => s + x.minutos, 0)
  const ats = new Set(subset.map((x) => x.atividadeId))
  return {
    totalApontamentos: subset.length,
    totalMinutos,
    atividadesComApontamento: ats.size,
  }
}

export function listarTodosApontamentosOperacionais(): ApontamentoOperacional[] {
  return store
    .slice()
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
}

export function __resetApontamentosStoreForTests() {
  store.length = 0
  seq = 0
  bump()
}
