/** Rascunho de etapa (domínio: ACTIVITY). */
export type CriarMatrizManualEtapa = {
  id: string
  name: string
  /** Minutos previstos; opcional no assistente. */
  plannedMinutes: number | null
  /** Times operacionais associados (não substituem pessoas). */
  teamIds: string[]
  /**
   * Colaboradores associados à etapa (ordem de seleção).
   * Principal = `primaryCollaboratorId` (também persistido como defaultResponsibleId).
   */
  collaboratorIds: string[]
  /** Deve existir em `collaboratorIds` ou ser null. */
  primaryCollaboratorId: string | null
}

/** Rascunho de área (domínio: SECTOR). */
export type CriarMatrizManualArea = {
  id: string
  name: string
  etapas: CriarMatrizManualEtapa[]
}

/** Rascunho de opção (domínio: TASK). */
export type CriarMatrizManualOpcao = {
  id: string
  name: string
  description: string
  areas: CriarMatrizManualArea[]
}

export function newManualOpcao(id: string): CriarMatrizManualOpcao {
  return {
    id,
    name: 'Nova opção',
    description: '',
    areas: [],
  }
}

export function newManualArea(id: string): CriarMatrizManualArea {
  return {
    id,
    name: 'Nova área',
    etapas: [],
  }
}

export function newManualEtapa(id: string): CriarMatrizManualEtapa {
  return {
    id,
    name: 'Nova etapa',
    plannedMinutes: null,
    teamIds: [],
    collaboratorIds: [],
    primaryCollaboratorId: null,
  }
}

/** Remove duplicados, garante principal ∈ lista ou null; se ficar 1 colaborador, define principal. */
export function reconcileEtapaCollaborators(
  et: CriarMatrizManualEtapa,
): CriarMatrizManualEtapa {
  const ids = [...new Set(et.collaboratorIds.filter(Boolean))]
  let primary = et.primaryCollaboratorId
  if (primary && !ids.includes(primary)) {
    primary = null
  }
  if (ids.length === 0) {
    return { ...et, collaboratorIds: [], primaryCollaboratorId: null }
  }
  if (ids.length === 1) {
    return { ...et, collaboratorIds: ids, primaryCollaboratorId: ids[0]! }
  }
  if (primary && ids.includes(primary)) {
    return { ...et, collaboratorIds: ids, primaryCollaboratorId: primary }
  }
  return { ...et, collaboratorIds: ids, primaryCollaboratorId: null }
}

/**
 * Valida rascunho antes do POST. Retorna mensagem curta ou null.
 */
export function validateManualOpcoesForSubmit(
  opcoes: CriarMatrizManualOpcao[],
): string | null {
  for (const op of opcoes) {
    if (!op.name.trim()) {
      return 'Cada opção nova precisa de um nome.'
    }
    for (const ar of op.areas) {
      if (!ar.name.trim()) {
        return 'Cada área precisa de um nome.'
      }
      for (const et of ar.etapas) {
        if (!et.name.trim()) {
          return 'Cada etapa precisa de um nome.'
        }
        const r = reconcileEtapaCollaborators(et)
        if (
          r.primaryCollaboratorId &&
          !r.collaboratorIds.includes(r.primaryCollaboratorId)
        ) {
          return 'O colaborador principal tem de estar entre os selecionados na etapa.'
        }
        if (r.collaboratorIds.length > 1 && !r.primaryCollaboratorId) {
          return 'Quando há mais do que um colaborador na etapa, indique quem é o principal.'
        }
      }
    }
  }
  return null
}

export function manualStructureIsNonEmpty(
  opcoes: CriarMatrizManualOpcao[],
): boolean {
  return opcoes.length > 0
}
