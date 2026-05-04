/**
 * Matriz simulada para testes de matching determinístico (R6 S3) — não é seed SQL.
 */

export type MatrixSeedRow = {
  matrixNodeId: string
  activity: string
  activityDescription: string | null
  plannedMinutes: number
  sector: string
  step: string
  /** IDs opcionais para testes de hierarquia TASK/SECTOR (S8/S9). */
  sectorNodeId?: string
  taskNodeId?: string
}

/** IDs estáveis para TASKs macro nos testes de homologação (R6 S9 / S9.1). */
export const BRAVO_MACRO_TASK_IDS = {
  tampaTraseira: '90000009-0000-4000-8000-000000000009',
  lateraisTraseiras: '90000010-0000-4000-8000-000000000010',
  ombreira: '90000011-0000-4000-8000-000000000011',
  forrosPortas: '90000012-0000-4000-8000-000000000012',
  /** Cenários negativos S9.3 (guarda estrutural). */
  limpezaFinal: '90000019-0000-4000-8000-000000000019',
  bancosDianteiros: '90000015-0000-4000-8000-000000000015',
} as const

/** TASKs artificiais para testes S9.3 — competir com recall macro realista. */
export function bravoGuardNegativeTaskRows(): unknown[] {
  return [
    {
      matrixNodeId: BRAVO_MACRO_TASK_IDS.limpezaFinal,
      nodeType: 'TASK',
      activity: '19 - LIMPEZA FINAL',
      activityDescription: 'revestimento courvin acabamento final polimento interno',
      plannedMinutes: 820,
      descendantActivitiesCount: 16,
      descendantSectorsCount: 10,
      collaboratorId: null,
      collaboratorName: null,
      teamId: null,
      teamName: null,
      sector: null,
      step: '19 - LIMPEZA FINAL',
      sectorNodeId: null,
      taskNodeId: BRAVO_MACRO_TASK_IDS.limpezaFinal,
      activityOrderIndex: 0,
      sectorOrderIndex: 0,
    },
    {
      matrixNodeId: BRAVO_MACRO_TASK_IDS.bancosDianteiros,
      nodeType: 'TASK',
      activity: '15 - BANCOS DIANTEIROS',
      activityDescription: 'revestimento banco dianteiro',
      plannedMinutes: 410,
      descendantActivitiesCount: 11,
      descendantSectorsCount: 5,
      collaboratorId: null,
      collaboratorName: null,
      teamId: null,
      teamName: null,
      sector: null,
      step: '15 - BANCOS DIANTEIROS',
      sectorNodeId: null,
      taskNodeId: BRAVO_MACRO_TASK_IDS.bancosDianteiros,
      activityOrderIndex: 0,
      sectorOrderIndex: 0,
    },
  ]
}

function slugPart(value: string): string {
  const t = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
  return t.length > 0 ? t : 'x'
}

/** Cobertura dos serviços típicos da fixture Bravo sanitizada. */
export const BRAVO_MATRIX_MATCHING_SEED: MatrixSeedRow[] = [
  {
    matrixNodeId: 'a0000001-0000-0000-0000-000000000001',
    activity: 'Revestimento banco Recaro',
    activityDescription: null,
    plannedMinutes: 180,
    sector: 'Tapeçaria',
    step: 'Bancos',
  },
  {
    matrixNodeId: 'a0000001-0000-0000-0000-000000000002',
    activity: 'Revestimento de volante em couro',
    activityDescription: null,
    plannedMinutes: 120,
    sector: 'Tapeçaria',
    step: 'Volante',
  },
  {
    matrixNodeId: 'a0000001-0000-0000-0000-000000000003',
    activity: 'Revestimento ombreira dianteira',
    activityDescription: null,
    plannedMinutes: 100,
    sector: 'Tapeçaria',
    step: '11 - OMBREIRA',
    taskNodeId: BRAVO_MACRO_TASK_IDS.ombreira,
  },
  {
    matrixNodeId: 'a0000001-0000-0000-0000-000000000004',
    activity: 'Troca de tecido lateral traseira',
    activityDescription: null,
    plannedMinutes: 110,
    sector: 'Tapeçaria',
    step: '10 - LATERAIS TRASEIRAS',
    taskNodeId: BRAVO_MACRO_TASK_IDS.lateraisTraseiras,
  },
  {
    matrixNodeId: 'a0000001-0000-0000-0000-000000000005',
    activity: 'Revestimento acabamento tampa traseira courvin',
    activityDescription: null,
    plannedMinutes: 90,
    sector: 'Tapeçaria',
    step: '9 - TAMPA TRASEIRA',
    taskNodeId: BRAVO_MACRO_TASK_IDS.tampaTraseira,
  },
  {
    matrixNodeId: 'a0000001-0000-0000-0000-000000000006',
    activity: 'Troca cabo de aço',
    activityDescription: null,
    plannedMinutes: 30,
    sector: 'Mecânica leve',
    step: 'Cabos',
  },
  {
    matrixNodeId: 'a0000001-0000-0000-0000-000000000007',
    activity: 'Revestimento lateral de porta',
    activityDescription: null,
    plannedMinutes: 85,
    sector: 'Tapeçaria',
    step: '12 - FORROS DE PORTAS',
    taskNodeId: BRAVO_MACRO_TASK_IDS.forrosPortas,
  },
  {
    matrixNodeId: 'a0000001-0000-0000-0000-000000000008',
    activity: 'Revestimento tampão traseiro',
    activityDescription: null,
    plannedMinutes: 70,
    sector: 'Tapeçaria',
    step: '9 - TAMPA TRASEIRA',
    taskNodeId: BRAVO_MACRO_TASK_IDS.tampaTraseira,
  },
  {
    matrixNodeId: 'a0000001-0000-0000-0000-000000000009',
    activity: 'Revestimento ombreira traseira',
    activityDescription: null,
    plannedMinutes: 105,
    sector: 'Tapeçaria',
    step: '11 - OMBREIRA',
    taskNodeId: BRAVO_MACRO_TASK_IDS.ombreira,
  },
  {
    matrixNodeId: 'a0000001-0000-0000-0000-00000000000a',
    activity: 'Revestimento ombreira com aplique',
    activityDescription: null,
    plannedMinutes: 108,
    sector: 'Tapeçaria',
    step: '11 - OMBREIRA',
    taskNodeId: BRAVO_MACRO_TASK_IDS.ombreira,
  },
  {
    matrixNodeId: 'a0000001-0000-0000-0000-0000000000bb',
    activity: 'Revestimento banco genérico',
    activityDescription: null,
    plannedMinutes: 60,
    sector: 'Tapeçaria',
    step: 'Bancos',
  },
]

/**
 * Linhas no formato retornado por `SQL_MATRIX_TASK_RECALL_ENRICHED` (recall direto de TASK).
 * Usar com `fakePool(poolRowsFromMatrixSeed(...), bravoMacroTaskDirectRecallRows())`.
 */
export function bravoMacroTaskDirectRecallRows(): unknown[] {
  return [
    {
      matrixNodeId: BRAVO_MACRO_TASK_IDS.tampaTraseira,
      nodeType: 'TASK',
      activity: '9 - TAMPA TRASEIRA',
      activityDescription: 'revestimento courvin | acabamento tampa | tampao traseiro',
      plannedMinutes: 170,
      descendantActivitiesCount: 7,
      descendantSectorsCount: 6,
      collaboratorId: null,
      collaboratorName: null,
      teamId: null,
      teamName: null,
      sector: null,
      step: '9 - TAMPA TRASEIRA',
      sectorNodeId: null,
      taskNodeId: BRAVO_MACRO_TASK_IDS.tampaTraseira,
      activityOrderIndex: 0,
      sectorOrderIndex: 0,
    },
    {
      matrixNodeId: BRAVO_MACRO_TASK_IDS.lateraisTraseiras,
      nodeType: 'TASK',
      activity: '10 - LATERAIS TRASEIRAS',
      activityDescription: 'troca tecido lateral | lateral traseira | acabamento lateral',
      plannedMinutes: 305,
      descendantActivitiesCount: 8,
      descendantSectorsCount: 4,
      collaboratorId: null,
      collaboratorName: null,
      teamId: null,
      teamName: null,
      sector: null,
      step: '10 - LATERAIS TRASEIRAS',
      sectorNodeId: null,
      taskNodeId: BRAVO_MACRO_TASK_IDS.lateraisTraseiras,
      activityOrderIndex: 0,
      sectorOrderIndex: 0,
    },
    {
      matrixNodeId: BRAVO_MACRO_TASK_IDS.ombreira,
      nodeType: 'TASK',
      activity: '11 - OMBREIRA',
      activityDescription: 'ombreira dianteira | ombreira traseira | aplique',
      plannedMinutes: 295,
      descendantActivitiesCount: 7,
      descendantSectorsCount: 4,
      collaboratorId: null,
      collaboratorName: null,
      teamId: null,
      teamName: null,
      sector: null,
      step: '11 - OMBREIRA',
      sectorNodeId: null,
      taskNodeId: BRAVO_MACRO_TASK_IDS.ombreira,
      activityOrderIndex: 0,
      sectorOrderIndex: 0,
    },
    {
      matrixNodeId: BRAVO_MACRO_TASK_IDS.forrosPortas,
      nodeType: 'TASK',
      activity: '12 - FORROS DE PORTAS',
      activityDescription: 'lateral porta | forro porta | revestimento porta',
      plannedMinutes: 365,
      descendantActivitiesCount: 14,
      descendantSectorsCount: 6,
      collaboratorId: null,
      collaboratorName: null,
      teamId: null,
      teamName: null,
      sector: null,
      step: '12 - FORROS DE PORTAS',
      sectorNodeId: null,
      taskNodeId: BRAVO_MACRO_TASK_IDS.forrosPortas,
      activityOrderIndex: 0,
      sectorOrderIndex: 0,
    },
  ]
}

export function poolRowsFromMatrixSeed(seeds: MatrixSeedRow[]): unknown[] {
  return seeds.map((s, idx) => ({
    matrixNodeId: s.matrixNodeId,
    nodeType: 'ACTIVITY',
    activity: s.activity,
    activityDescription: s.activityDescription,
    plannedMinutes: s.plannedMinutes,
    activityOrderIndex: idx,
    sectorOrderIndex: 0,
    collaboratorId: null,
    collaboratorName: null,
    teamId: 'e1111111-1111-1111-1111-111111111111',
    teamName: 'Equipe tapeçaria teste',
    sector: s.sector,
    step: s.step,
    sectorNodeId:
      s.sectorNodeId ?? `sec-${slugPart(s.step)}-${slugPart(s.sector)}`,
    taskNodeId: s.taskNodeId ?? `task-${slugPart(s.step)}`,
  }))
}
