import { describe, expect, it } from 'vitest'
import type { ConveyorDetailApi } from '../conveyors.dto.js'
import type { ConveyorNodeWorkloadApi } from '../conveyorNodeWorkload.dto.js'
import {
  CONVEYOR_HEALTH_CALLER_SYSTEM,
  CONVEYOR_HEALTH_INTENT,
  type ConveyorHealthExecutionAggregatesV1,
  CONVEYOR_HEALTH_METADATA_SOURCE,
  CONVEYOR_HEALTH_SNAPSHOT_TIMEZONE,
  CONVEYOR_OPERATIONAL_SNAPSHOT_SCHEMA_VERSION,
  CONVEYOR_OPERATIONAL_SNAPSHOT_VERSION,
  DEFAULT_CONVEYOR_HEALTH_POLICY,
} from './conveyor-health.argos-types.js'
import { buildConveyorOperationalSnapshotV1, toArgosOperationalStatus } from './conveyor-health.snapshot-builder.js'

const FIXED_NOW = new Date('2026-04-27T12:00:00.000Z')

const STEP_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const AREA_A = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const OPT_A = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const CONV_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd'

function baseDetail(overrides: Partial<ConveyorDetailApi> = {}): ConveyorDetailApi {
  return {
    id: CONV_ID,
    code: 'E-001',
    name: 'Esteira fixture',
    clientName: 'Cliente X',
    vehicle: 'V1',
    modelVersion: 'M1',
    plate: 'ABC1D23',
    initialNotes: null,
    responsible: 'Gestor',
    priority: 'media',
    originRegister: 'MANUAL',
    baseRefSnapshot: null,
    baseCodeSnapshot: null,
    baseNameSnapshot: null,
    baseVersionSnapshot: null,
    matrixRootItemId: null,
    operationalStatus: 'NO_BACKLOG',
    createdAt: '2026-01-01T10:00:00.000Z',
    completedAt: null,
    estimatedDeadline: '2026-12-31',
    totalOptions: 1,
    totalAreas: 1,
    totalSteps: 1,
    totalPlannedMinutes: 30,
    structure: {
      options: [
        {
          id: OPT_A,
          name: 'Opção 1',
          orderIndex: 1,
          areas: [
            {
              id: AREA_A,
              name: 'Área 1',
              orderIndex: 1,
              steps: [
                {
                  id: STEP_A,
                  name: 'Etapa 1',
                  orderIndex: 1,
                  plannedMinutes: 30,
                  assignees: [
                    {
                      type: 'COLLABORATOR',
                      collaboratorId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
                      collaboratorName: 'Ana',
                      teamId: null,
                      teamName: null,
                      isPrimary: true,
                      orderIndex: 0,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    ...overrides,
  }
}

function baseWorkload(overrides: Partial<ConveyorNodeWorkloadApi> = {}): ConveyorNodeWorkloadApi {
  return {
    semanticsVersion: '1.5',
    conveyorId: CONV_ID,
    conveyor: {
      operationalBucket: 'em_andamento',
      isOverdueContext: false,
    },
    notes: '',
    steps: [
      {
        optionId: OPT_A,
        optionName: 'Opção 1',
        areaId: AREA_A,
        areaName: 'Área 1',
        stepId: STEP_A,
        stepName: 'Etapa 1',
        plannedMinutes: 30,
        realizedMinutes: 10,
        pendingMinutes: 20,
      },
    ],
    areas: [
      {
        optionId: OPT_A,
        optionName: 'Opção 1',
        areaId: AREA_A,
        areaName: 'Área 1',
        plannedMinutesSum: 30,
        realizedMinutesSum: 10,
        pendingMinutesSum: 20,
      },
    ],
    ...overrides,
  }
}

describe('buildConveyorOperationalSnapshotV1', () => {
  it('monta snapshot saudável com metadata e request corretos', () => {
    const detail = baseDetail()
    const workload = baseWorkload()
    const snap = buildConveyorOperationalSnapshotV1({
      conveyorDetail: detail,
      nodeWorkload: workload,
      requestId: 'req-1',
      correlationId: 'corr-1',
      now: FIXED_NOW,
    })

    expect(snap.schemaVersion).toBe(CONVEYOR_OPERATIONAL_SNAPSHOT_SCHEMA_VERSION)
    expect(snap.metadata.snapshotVersion).toBe(CONVEYOR_OPERATIONAL_SNAPSHOT_VERSION)
    expect(snap.metadata.source).toBe(CONVEYOR_HEALTH_METADATA_SOURCE)
    expect(snap.metadata.timezone).toBe(CONVEYOR_HEALTH_SNAPSHOT_TIMEZONE)
    expect(snap.request.requestId).toBe('req-1')
    expect(snap.request.correlationId).toBe('corr-1')
    expect(snap.request.policy).toBe(DEFAULT_CONVEYOR_HEALTH_POLICY)
    expect(snap.request.callerSystem).toBe(CONVEYOR_HEALTH_CALLER_SYSTEM)
    expect(snap.request.intent).toBe(CONVEYOR_HEALTH_INTENT)
    expect(snap.request.generatedAt).toBe(FIXED_NOW.toISOString())

    expect(snap.totals.totalSteps).toBe(1)
    expect(snap.totals.plannedMinutes).toBe(30)
    expect(snap.totals.realizedMinutes).toBe(10)
    expect(snap.totals.pendingMinutes).toBe(20)
    expect(snap.structure.options[0]!.areas[0]!.steps[0]!.realizedMinutes).toBe(10)
    expect(snap.structure.options[0]!.areas[0]!.steps[0]!.pendingMinutes).toBe(20)
    expect(snap.structure.options[0]!.plannedMinutes).toBe(30)
    expect(snap.structure.options[0]!.areas[0]!.plannedMinutes).toBe(30)
    expect(snap.structure.options[0]!.areas[0]!.steps[0]!.assignees[0]).toMatchObject({
      id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      name: 'Ana',
    })

    expect(snap.areaExecutionSummary).toHaveLength(1)
    expect(snap.areaExecutionSummary[0]!.pendingMinutes).toBe(20)

    expect(snap.peopleExecutionSummary).toEqual([])
    expect(snap.teamExecutionSummary).toEqual([])
    expect(snap.recentActivity).toEqual({ timeEntries: [] })

    expect(snap.dataQuality.missingAssigneeSteps).toBe(0)
    expect(snap.dataQuality.missingPlannedMinutesSteps).toBe(0)
    expect(snap.dataQuality.inconsistentTimeEntries).toBe(0)
  })

  it('usa policy do input quando informada', () => {
    const snap = buildConveyorOperationalSnapshotV1({
      conveyorDetail: baseDetail(),
      nodeWorkload: baseWorkload(),
      policy: 'economy',
      requestId: 'r',
      correlationId: 'c',
      now: FIXED_NOW,
    })
    expect(snap.request.policy).toBe('economy')
  })

  it('esteira com forte pendência reflete workload nas áreas', () => {
    const workload = baseWorkload({
      steps: [
        {
          optionId: OPT_A,
          optionName: 'Opção 1',
          areaId: AREA_A,
          areaName: 'Área 1',
          stepId: STEP_A,
          stepName: 'Etapa 1',
          plannedMinutes: 30,
          realizedMinutes: 5,
          pendingMinutes: 25,
        },
      ],
      areas: [
        {
          optionId: OPT_A,
          optionName: 'Opção 1',
          areaId: AREA_A,
          areaName: 'Área 1',
          plannedMinutesSum: 30,
          realizedMinutesSum: 5,
          pendingMinutesSum: 25,
        },
      ],
    })
    const snap = buildConveyorOperationalSnapshotV1({
      conveyorDetail: baseDetail(),
      nodeWorkload: workload,
      requestId: 'r',
      correlationId: 'c',
      now: FIXED_NOW,
    })
    expect(snap.structure.options[0]!.areas[0]!.steps[0]!.pendingMinutes).toBe(25)
    expect(snap.areaExecutionSummary[0]!.pendingMinutes).toBe(25)
  })

  it('STEP sem assignee incrementa stepsWithoutAssignee', () => {
    const detail = baseDetail({
      structure: {
        options: [
          {
            id: OPT_A,
            name: 'Opção 1',
            orderIndex: 1,
            areas: [
              {
                id: AREA_A,
                name: 'Área 1',
                orderIndex: 1,
                steps: [
                  {
                    id: STEP_A,
                    name: 'Etapa 1',
                    orderIndex: 1,
                    plannedMinutes: 30,
                    assignees: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    })
    const snap = buildConveyorOperationalSnapshotV1({
      conveyorDetail: detail,
      nodeWorkload: baseWorkload(),
      requestId: 'r',
      correlationId: 'c',
      now: FIXED_NOW,
    })
    expect(snap.dataQuality.missingAssigneeSteps).toBe(1)
  })

  it('realizado maior que previsto incrementa contador', () => {
    const workload = baseWorkload({
      steps: [
        {
          optionId: OPT_A,
          optionName: 'Opção 1',
          areaId: AREA_A,
          areaName: 'Área 1',
          stepId: STEP_A,
          stepName: 'Etapa 1',
          plannedMinutes: 30,
          realizedMinutes: 50,
          pendingMinutes: 0,
        },
      ],
      areas: [
        {
          optionId: OPT_A,
          optionName: 'Opção 1',
          areaId: AREA_A,
          areaName: 'Área 1',
          plannedMinutesSum: 30,
          realizedMinutesSum: 50,
          pendingMinutesSum: 0,
        },
      ],
    })
    const snap = buildConveyorOperationalSnapshotV1({
      conveyorDetail: baseDetail(),
      nodeWorkload: workload,
      requestId: 'r',
      correlationId: 'c',
      now: FIXED_NOW,
    })
    expect(snap.dataQuality.inconsistentTimeEntries).toBe(1)
    expect(snap.structure.options[0]!.areas[0]!.steps[0]!.realizedMinutes).toBe(50)
  })

  it('STEP sem plannedMinutes incrementa stepsWithoutPlannedMinutes', () => {
    const detail = baseDetail({
      totalPlannedMinutes: 0,
      structure: {
        options: [
          {
            id: OPT_A,
            name: 'Opção 1',
            orderIndex: 1,
            areas: [
              {
                id: AREA_A,
                name: 'Área 1',
                orderIndex: 1,
                steps: [
                  {
                    id: STEP_A,
                    name: 'Etapa 1',
                    orderIndex: 1,
                    plannedMinutes: null,
                    assignees: [
                      {
                        type: 'COLLABORATOR',
                        collaboratorId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
                        collaboratorName: 'Ana',
                        teamId: null,
                        teamName: null,
                        isPrimary: true,
                        orderIndex: 0,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    })
    const workload = baseWorkload({
      steps: [
        {
          optionId: OPT_A,
          optionName: 'Opção 1',
          areaId: AREA_A,
          areaName: 'Área 1',
          stepId: STEP_A,
          stepName: 'Etapa 1',
          plannedMinutes: null,
          realizedMinutes: 0,
          pendingMinutes: 0,
        },
      ],
      areas: [
        {
          optionId: OPT_A,
          optionName: 'Opção 1',
          areaId: AREA_A,
          areaName: 'Área 1',
          plannedMinutesSum: 0,
          realizedMinutesSum: 0,
          pendingMinutesSum: 0,
        },
      ],
    })
    const snap = buildConveyorOperationalSnapshotV1({
      conveyorDetail: detail,
      nodeWorkload: workload,
      requestId: 'r',
      correlationId: 'c',
      now: FIXED_NOW,
    })
    expect(snap.dataQuality.missingPlannedMinutesSteps).toBe(1)
  })

  it('incorpora aggregates quando fornecidos', () => {
    const aggregates: ConveyorHealthExecutionAggregatesV1 = {
      peopleExecutionSummary: [
        {
          collaboratorId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          collaboratorName: 'Ana',
          assignedSteps: 1,
          primarySteps: 1,
          plannedMinutes: 30,
          realizedMinutes: 42,
          pendingMinutes: 0,
          completionRatio: 1,
        },
      ],
      teamExecutionSummary: [
        {
          teamId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
          teamName: 'Equipe Z',
          assignedSteps: 1,
          plannedMinutes: 30,
          realizedMinutes: 15,
          pendingMinutes: 15,
          completionRatio: 0.5,
        },
      ],
      recentActivity: {
        timeEntries: [
          {
            id: 'aaaaaaaa-bbbb-bbbb-bbbb-cccccccccccc',
            stepId: STEP_A,
            stepName: 'Etapa 1',
            collaboratorId: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
            collaboratorName: 'Ana',
            minutes: 10,
            entryDate: '2026-04-27T08:00:00.000Z',
            note: 'ok',
          },
        ],
      },
    }
    const snap = buildConveyorOperationalSnapshotV1({
      conveyorDetail: baseDetail(),
      nodeWorkload: baseWorkload(),
      requestId: 'r',
      correlationId: 'c',
      now: FIXED_NOW,
      aggregates,
    })
    expect(snap.peopleExecutionSummary).toHaveLength(1)
    expect(snap.peopleExecutionSummary[0]!.realizedMinutes).toBe(42)
    expect(snap.teamExecutionSummary).toHaveLength(1)
    expect(snap.teamExecutionSummary[0]!.completionRatio).toBe(0.5)
    expect(snap.recentActivity.timeEntries).toHaveLength(1)
    expect(snap.dataQuality.missingAssigneeSteps).toBe(0)
  })

  it('quando operationalStatus é desconhecido aplica fallback e warning', () => {
    const snap = buildConveyorOperationalSnapshotV1({
      conveyorDetail: baseDetail({ operationalStatus: 'NO_MAP' as never }),
      nodeWorkload: baseWorkload(),
      requestId: '11111111-1111-1111-1111-111111111111',
      correlationId: 'c-warning',
      now: FIXED_NOW,
    })
    expect(snap.conveyor.operationalStatus).toBe('no_backlog')
    expect(snap.dataQuality.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'unknown_operational_status_fallback',
          message: 'operationalStatus desconhecido recebido do SGP; aplicado fallback para no_backlog.',
        }),
      ]),
    )
  })
})

describe('toArgosOperationalStatus', () => {
  it('normaliza status para enum lowercase do ARGOS', () => {
    expect(toArgosOperationalStatus('NO_BACKLOG')).toBe('no_backlog')
    expect(toArgosOperationalStatus('EM_REVISAO')).toBe('em_revisao')
    expect(toArgosOperationalStatus('EM_PRODUCAO')).toBe('em_andamento')
    expect(toArgosOperationalStatus('EM_ATRASO')).toBe('em_atraso')
    expect(toArgosOperationalStatus('CONCLUIDA')).toBe('concluidas')
  })
})
