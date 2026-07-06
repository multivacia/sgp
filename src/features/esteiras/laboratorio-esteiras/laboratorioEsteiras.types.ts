import type {
  ManualOptionDraft,
  NovaEsteiraAlocacaoLinha,
} from '../nova-esteira/matrixToConveyorCreateInput'

export type LabActivityOverride = {
  name?: string
  plannedMinutes?: number
}

export type LabActivityItem = {
  id: string
  name: string
  plannedMinutes: number
  taskId: string
  taskName: string
  sectorId: string
  sectorName: string
}

export type LabSectorGroup = {
  sectorId: string
  sectorName: string
  taskId: string
  taskName: string
  activities: LabActivityItem[]
}

export type AppliedMatrixBlock = {
  /** Instância única no laboratório (permite a mesma matriz mais de uma vez). */
  blockId: string
  matrixId: string
  matrixName: string
  selectedActivityIds: string[]
  options: ManualOptionDraft[]
  allocations: Record<string, NovaEsteiraAlocacaoLinha[]>
}

export type LabPhase = 'catalog' | 'review'

export type LabBasicDataDraft = {
  cliente: string
  descricao: string
  quantidade: string
  prazo: string
}
