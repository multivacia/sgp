/**
 * Helpers puros — opções / áreas / etapas da Nova Esteira (pedido real).
 */

import type {
  NovaEsteiraAreaDraft,
  NovaEsteiraEtapaDraft,
  NovaEsteiraNoOrigem,
  NovaEsteiraOpcaoDraft,
} from './nova-esteira-jornada-draft'

export function novoId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function ordenarOpcoes(list: NovaEsteiraOpcaoDraft[]): NovaEsteiraOpcaoDraft[] {
  return [...list]
    .sort((a, b) => a.ordem - b.ordem)
    .map((o, i) => ({
      ...o,
      ordem: i + 1,
      areas: ordenarAreas(o.areas),
    }))
}

export function ordenarAreas(list: NovaEsteiraAreaDraft[]): NovaEsteiraAreaDraft[] {
  return [...list]
    .sort((a, b) => a.ordem - b.ordem)
    .map((a, i) => ({
      ...a,
      ordem: i + 1,
      etapas: ordenarEtapas(a.etapas),
    }))
}

export function ordenarEtapas(list: NovaEsteiraEtapaDraft[]): NovaEsteiraEtapaDraft[] {
  return [...list]
    .sort((a, b) => a.ordem - b.ordem)
    .map((e, i) => ({ ...e, ordem: i + 1 }))
}

/** Gate mínimo: ≥1 opção, cada uma com ≥1 área com ≥1 etapa com título. */
export function estruturaOpcoesMinimaValida(opcoes: NovaEsteiraOpcaoDraft[]): boolean {
  if (opcoes.length === 0) return false
  for (const op of opcoes) {
    if (!op.titulo.trim()) return false
    if (op.areas.length === 0) return false
    for (const ar of op.areas) {
      if (!ar.titulo.trim()) return false
      if (ar.etapas.length === 0) return false
      for (const et of ar.etapas) {
        if (!et.titulo.trim()) return false
        if (et.tempoEstimadoMin < 0) return false
      }
    }
  }
  return true
}

export function totaisOpcoes(opcoes: NovaEsteiraOpcaoDraft[]): {
  areas: number
  etapas: number
  minutos: number
} {
  let areas = 0
  let etapas = 0
  let minutos = 0
  for (const o of opcoes) {
    areas += o.areas.length
    for (const a of o.areas) {
      etapas += a.etapas.length
      for (const e of a.etapas) {
        minutos += e.tempoEstimadoMin
      }
    }
  }
  return { areas, etapas, minutos }
}

export function opcaoVazia(
  titulo: string,
  origem: NovaEsteiraNoOrigem,
  ordem: number,
): NovaEsteiraOpcaoDraft {
  return {
    id: novoId('op'),
    titulo,
    origem,
    ordem,
    areas: [],
  }
}

export function areaVazia(
  titulo: string,
  origem: NovaEsteiraNoOrigem,
  ordem: number,
): NovaEsteiraAreaDraft {
  return {
    id: novoId('ar'),
    titulo,
    origem,
    ordem,
    etapas: [],
  }
}

export function etapaVazia(
  titulo: string,
  tempoMin: number,
  origem: NovaEsteiraNoOrigem,
  ordem: number,
): NovaEsteiraEtapaDraft {
  return {
    id: novoId('et'),
    titulo,
    tempoEstimadoMin: tempoMin,
    origem,
    ordem,
  }
}

/** Opção nova com uma área e uma etapa para o usuário renomear (gate mínimo). */
export function criarOpcaoManualComEstruturaMinima(ordem: number): NovaEsteiraOpcaoDraft {
  const et = etapaVazia('Nova etapa', 60, 'manual', 1)
  const ar: NovaEsteiraAreaDraft = {
    id: novoId('ar'),
    titulo: 'Nova área',
    origem: 'manual',
    ordem: 1,
    etapas: [et],
  }
  return {
    id: novoId('op'),
    titulo: 'Nova opção',
    origem: 'manual',
    ordem,
    areas: [ar],
  }
}

/** Duplica hierarquia com novos ids (edição independente). */
export function duplicarOpcaoComNovosIds(
  op: NovaEsteiraOpcaoDraft,
  ordem: number,
): NovaEsteiraOpcaoDraft {
  const areas: NovaEsteiraAreaDraft[] = op.areas.map((a) => ({
    id: novoId('ar'),
    titulo: a.titulo,
    origem: a.origem,
    ordem: a.ordem,
    etapas: a.etapas.map((e) => ({
      id: novoId('et'),
      titulo: e.titulo,
      tempoEstimadoMin: e.tempoEstimadoMin,
      origem: e.origem,
      ordem: e.ordem,
    })),
  }))
  return {
    id: novoId('op'),
    titulo: `${op.titulo} (cópia)`,
    origem: 'manual',
    ordem,
    areas: ordenarAreas(areas),
  }
}
