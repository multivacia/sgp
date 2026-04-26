/**
 * Esteiras materializadas pela Nova Esteira (mock) — detalhe resolvível por id estável (`ne-…`).
 */

import type { EsteiraDetalheMock } from './esteira-detalhe-types'
import { buildEsteiraDetalheFromMaterializacao } from './nova-esteira-materializacao-detalhe'
import type { NovaEsteiraMaterializacaoResultado } from './nova-esteira-pipeline'

const porId = new Map<string, EsteiraDetalheMock>()

export function registerNovaEsteiraMaterializacao(
  result: NovaEsteiraMaterializacaoResultado,
): void {
  const d = buildEsteiraDetalheFromMaterializacao(result)
  porId.set(d.id, d)
}

export function getMaterializadaEsteiraDetalhe(
  id: string,
): EsteiraDetalheMock | undefined {
  return porId.get(id)
}

/** Ids `ne-…` registrados na sessão (materializações da Nova Esteira). */
export function listMaterializadaEsteiraIds(): string[] {
  return [...porId.keys()]
}

/** Testes — limpa materializações de sessão. */
export function __resetMaterializacoesRegistryForTests() {
  porId.clear()
}
