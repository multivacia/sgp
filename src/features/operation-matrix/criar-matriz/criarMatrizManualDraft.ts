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
        // Responsável (= colaborador "principal"/`defaultResponsibleId`) é sempre
        // opcional — não bloqueia o submit, mesmo com vários colaboradores de apoio.
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

/**
 * Responsável na Atividade da Matriz — regra de negócio (equipe → responsável):
 * revalida `primaryCollaboratorId` de cada etapa contra a filiação (ativa) conhecida
 * da equipe efetiva (`teamIds[0]`) daquela etapa. Times sem elegibilidade ainda
 * carregada (ausentes de `eligibleMemberIdsByTeam`) são preservados sem alteração —
 * a decisão fica adiada até a filiação ser conhecida. Reselecionar a mesma equipe
 * não altera nada (o responsável já era válido para ela). Retorna a mesma referência
 * quando nada muda (evita re-render desnecessário).
 */
export function reconcileManualOpcoesResponsiblesAgainstEligibility(
  opcoes: CriarMatrizManualOpcao[],
  eligibleMemberIdsByTeam: ReadonlyMap<string, ReadonlySet<string>>,
): CriarMatrizManualOpcao[] {
  let changed = false
  const next = opcoes.map((op) => {
    let opChanged = false
    const areas = op.areas.map((ar) => {
      let arChanged = false
      const etapas = ar.etapas.map((et) => {
        const rec = reconcileEtapaCollaborators(et)
        const teamId = rec.teamIds[0]
        if (!teamId || !rec.primaryCollaboratorId) return et
        const eligible = eligibleMemberIdsByTeam.get(teamId)
        if (!eligible || eligible.has(rec.primaryCollaboratorId)) return et
        arChanged = true
        return { ...et, primaryCollaboratorId: null }
      })
      if (!arChanged) return ar
      opChanged = true
      return { ...ar, etapas }
    })
    if (!opChanged) return op
    changed = true
    return { ...op, areas }
  })
  return changed ? next : opcoes
}

/**
 * Decide o `defaultResponsibleId` (nó de matriz único, ex.: editor de catálogo)
 * ao aplicar uma mudança de equipe. Sem equipe efetiva o responsável é sempre
 * inválido. Reselecionar a mesma equipe preserva o valor atual. Numa troca real
 * de equipe, só preserva quando `eligibleMemberIds` confirma a elegibilidade —
 * conjunto vazio ou ausência de dado tratam a troca como perda de elegibilidade
 * (uso conservador em telas sem filiação de equipe carregada).
 */
export function reconcileResponsibleOnTeamChange(params: {
  previousTeamId: string | null
  nextTeamId: string | null
  currentResponsibleId: string | null
  eligibleMemberIds: ReadonlySet<string>
}): string | null {
  const { previousTeamId, nextTeamId, currentResponsibleId, eligibleMemberIds } = params
  if (!currentResponsibleId) return null
  if (!nextTeamId) return null
  if (previousTeamId === nextTeamId) return currentResponsibleId
  return eligibleMemberIds.has(currentResponsibleId) ? currentResponsibleId : null
}
