/** Rascunho de etapa (domínio: ACTIVITY). */
export type CriarMatrizManualEtapa = {
  id: string
  name: string
  /** Minutos previstos por unidade; opcional no assistente. */
  plannedMinutes: number | null
  plannedQuantity?: number
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
    name: 'Nova tarefa',
    description: '',
    areas: [],
  }
}

export function newManualArea(id: string): CriarMatrizManualArea {
  return {
    id,
    name: 'Novo setor',
    etapas: [],
  }
}

export function newManualEtapa(id: string): CriarMatrizManualEtapa {
  return {
    id,
    name: 'Nova atividade',
    plannedMinutes: null,
    plannedQuantity: 1,
    teamIds: [],
    collaboratorIds: [],
    primaryCollaboratorId: null,
  }
}

/** Remove duplicados de colaboradores; garante principal ∈ lista ou null; no máximo 1 equipe padrão. */
export function reconcileEtapaCollaborators(
  et: CriarMatrizManualEtapa,
): CriarMatrizManualEtapa {
  const teamIds = [...new Set(et.teamIds.filter(Boolean))].slice(0, 1)
  const ids = [...new Set(et.collaboratorIds.filter(Boolean))]
  let primary = et.primaryCollaboratorId
  if (primary && !ids.includes(primary)) {
    primary = null
  }
  if (ids.length === 0) {
    return { ...et, teamIds, collaboratorIds: [], primaryCollaboratorId: null }
  }
  if (ids.length === 1) {
    return {
      ...et,
      teamIds,
      collaboratorIds: ids,
      primaryCollaboratorId: ids[0]!,
    }
  }
  if (primary && ids.includes(primary)) {
    return { ...et, teamIds, collaboratorIds: ids, primaryCollaboratorId: primary }
  }
  return { ...et, teamIds, collaboratorIds: ids, primaryCollaboratorId: null }
}

/**
 * Valida rascunho antes do POST. Retorna mensagem curta ou null.
 */
export function validateManualOpcoesForSubmit(
  opcoes: CriarMatrizManualOpcao[],
): string | null {
  for (const op of opcoes) {
    if (!op.name.trim()) {
      return 'Cada tarefa nova precisa de um nome.'
    }
    for (const ar of op.areas) {
      if (!ar.name.trim()) {
        return 'Cada setor precisa de um nome.'
      }
      for (const et of ar.etapas) {
        if (!et.name.trim()) {
          return 'Cada atividade precisa de um nome.'
        }
        if (et.teamIds.filter(Boolean).length > 1) {
          return 'Cada atividade pode ter no máximo uma equipe padrão.'
        }
        const supportIds = [...new Set(et.collaboratorIds.filter(Boolean))]
        if (supportIds.length > 1 && !et.primaryCollaboratorId?.trim()) {
          return 'Selecione um colaborador principal quando houver mais de um colaborador associado à atividade.'
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
