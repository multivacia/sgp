export type CollaboratorOperationalHealthWarningV1 = {
  code: string
  message: string
}

const WARNINGS = {
  TEAM_ASSIGNMENTS_INCLUDED: {
    code: 'TEAM_ASSIGNMENTS_INCLUDED',
    message:
      'O snapshot inclui pelo menos um STEP alcançado por alocação em equipa (membership de time).',
  },
  CAPACITY_FALLBACK_USED: {
    code: 'CAPACITY_FALLBACK_USED',
    message:
      'A capacidade diária foi resolvida por valor de fallback (sem default global nem override ativo na data).',
  },
  NO_OPEN_ASSIGNMENTS: {
    code: 'NO_OPEN_ASSIGNMENTS',
    message:
      'Não existem STEPs abertos atribuídos a este colaborador no âmbito considerado pelo snapshot.',
  },
  COLLABORATOR_INACTIVE: {
    code: 'COLLABORATOR_INACTIVE',
    message: 'O colaborador está inativo; os valores refletem o estado atualmente registado.',
  },
} as const

/**
 * Ordem fixa (determinística) alinhada ao contrato V1.
 */
export function buildCollaboratorOperationalHealthDataQualityWarnings(input: {
  teamLinkedSteps: number
  capacitySource: 'OVERRIDE' | 'DEFAULT' | 'FALLBACK' | 'MISSING'
  openDistinctSteps: number
  collaboratorIsActive: boolean
}): CollaboratorOperationalHealthWarningV1[] {
  const out: CollaboratorOperationalHealthWarningV1[] = []
  if (input.teamLinkedSteps > 0) {
    out.push({ ...WARNINGS.TEAM_ASSIGNMENTS_INCLUDED })
  }
  if (input.capacitySource === 'FALLBACK') {
    out.push({ ...WARNINGS.CAPACITY_FALLBACK_USED })
  }
  if (input.openDistinctSteps === 0) {
    out.push({ ...WARNINGS.NO_OPEN_ASSIGNMENTS })
  }
  if (!input.collaboratorIsActive) {
    out.push({ ...WARNINGS.COLLABORATOR_INACTIVE })
  }
  return out
}
