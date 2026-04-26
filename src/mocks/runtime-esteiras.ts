import type { BacklogRow } from './backlog'

let extraRows: BacklogRow[] = []
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

export function subscribeEsteiras(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function getEsteirasExtraSnapshot(): BacklogRow[] {
  return extraRows
}

export function appendEsteira(row: BacklogRow) {
  extraRows = [...extraRows, row]
  emit()
}

/** Testes — remove linhas extras de backlog runtime. */
export function __resetRuntimeEsteirasExtrasForTests() {
  extraRows = []
  emit()
}
