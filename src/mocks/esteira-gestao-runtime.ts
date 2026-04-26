/**
 * Overrides locais por atividade (detalhe da esteira) — mock de orquestração leve.
 */
import type {
  EsteiraAtividadeMock,
  EsteiraDetalheMock,
} from './esteira-detalhe'

const overrides = new Map<string, Partial<EsteiraAtividadeMock>>()
const listeners = new Set<() => void>()

let version = 0

function bump() {
  version += 1
  listeners.forEach((l) => l())
}

export function subscribeGestao(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function getGestaoVersion(): number {
  return version
}

export function applyAtividadeOverride(
  activityId: string,
  patch: Partial<EsteiraAtividadeMock>,
) {
  const prev = overrides.get(activityId) ?? {}
  overrides.set(activityId, { ...prev, ...patch })
  bump()
}

export function mergeAtividade(a: EsteiraAtividadeMock): EsteiraAtividadeMock {
  const o = overrides.get(a.id)
  if (!o) return a
  return { ...a, ...o }
}

export function mergeEsteiraDetalhe(e: EsteiraDetalheMock): EsteiraDetalheMock {
  return {
    ...e,
    tarefas: e.tarefas.map((t) => ({
      ...t,
      atividades: t.atividades.map(mergeAtividade),
    })),
  }
}

/** Testes — remove overrides de atividade. */
export function __resetGestaoOverridesForTests() {
  overrides.clear()
  bump()
}
