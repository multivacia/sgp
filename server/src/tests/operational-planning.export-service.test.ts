import { afterEach, describe, expect, it, vi } from 'vitest'
import ExcelJS from 'exceljs'
import type pg from 'pg'
import { AppError } from '../shared/errors/AppError.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js'
import * as repo from '../modules/operational-planning/operational-planning.repository.js'
import type { PlanItemExportRow } from '../modules/operational-planning/operational-planning.repository.js'
import * as capacityMatrix from '../modules/operational-planning/buildCapacityByCollaboratorDay.js'
import * as conveyorPlanRepo from '../modules/conveyor-operational-plan/conveyor-operational-plan.repository.js'
import * as collaboratorsRepo from '../modules/collaborators/collaborators.repository.js'
import {
  classifyCapacityRow,
  mapExportActivityStatusLabel,
  serviceExportOperationalPlanningWeekXlsx,
} from '../modules/operational-planning/operational-planning.service.js'

const pool = {} as pg.Pool

function samplePlanRow(
  overrides: Partial<PlanItemExportRow> = {},
): PlanItemExportRow {
  return {
    id: 'item-1',
    conveyor_id: 'cv-1',
    conveyor_title: 'Esteira A',
    conveyor_code: null,
    conveyor_client_name: 'Cliente A',
    conveyor_vehicle: 'Fusca',
    conveyor_plate: 'ABC1234',
    conveyor_estimated_deadline: '2026-09-20',
    activity_node_id: 'step-1',
    activity_title: 'Atividade A',
    task_title: 'Tarefa A',
    sector_title: 'Setor A',
    assigned_collaborator_id: 'col-1',
    assigned_collaborator_name: 'Maria Silva',
    assigned_team_id: null,
    assigned_team_name: null,
    planned_date: '2026-09-07',
    planned_order: 0,
    planned_minutes: 90,
    status: 'PLANNED',
    notes: null,
    activity_operational_status: 'PENDING',
    conveyor_operational_plan_item_id: null,
    ...overrides,
  }
}

describe('mapExportActivityStatusLabel', () => {
  it('mapeia os 6 status conhecidos', () => {
    expect(mapExportActivityStatusLabel('PENDING')).toBe('Aberta')
    expect(mapExportActivityStatusLabel('IN_PROGRESS')).toBe('Em andamento')
    expect(mapExportActivityStatusLabel('BLOCKED')).toBe('Bloqueada')
    expect(mapExportActivityStatusLabel('COMPLETED')).toBe('Concluída')
    expect(mapExportActivityStatusLabel('REOPENED')).toBe('Reaberta')
    expect(mapExportActivityStatusLabel('ABORTED')).toBe('Dispensada')
  })

  it('usa fallback seguro para status desconhecido ou nulo', () => {
    expect(mapExportActivityStatusLabel('SOMETHING_ELSE')).toBe('SOMETHING_ELSE')
    expect(mapExportActivityStatusLabel(null)).toBe('—')
    expect(mapExportActivityStatusLabel(undefined)).toBe('—')
  })
})

describe('classifyCapacityRow', () => {
  it('classifica Disponível quando planejado < capacidade', () => {
    const r = classifyCapacityRow(480, 300)
    expect(r.statusLabel).toBe('Disponível')
    expect(r.balanceMinutes).toBe(180)
    expect(r.occupancyRatio).toBeCloseTo(300 / 480)
  })

  it('classifica No limite quando planejado == capacidade', () => {
    const r = classifyCapacityRow(480, 480)
    expect(r.statusLabel).toBe('No limite')
    expect(r.balanceMinutes).toBe(0)
    expect(r.occupancyRatio).toBe(1)
  })

  it('classifica Sobrecarregado quando planejado > capacidade (sem limiar de 90%)', () => {
    const r = classifyCapacityRow(480, 500)
    expect(r.statusLabel).toBe('Sobrecarregado')
    expect(r.balanceMinutes).toBe(-20)
    expect(r.occupancyRatio).toBeCloseTo(500 / 480)
  })

  it('classifica planejado a 95% da capacidade como Disponível — comprova ausência de limiar de 90%', () => {
    const r = classifyCapacityRow(100, 95)
    expect(r.statusLabel).toBe('Disponível')
  })

  it('classifica Capacidade não cadastrada quando capacidade é null/0/negativa/NaN', () => {
    for (const invalid of [null, undefined, 0, -10, Number.NaN]) {
      const r = classifyCapacityRow(invalid, 60)
      expect(r.statusLabel).toBe('Capacidade não cadastrada')
      expect(r.balanceMinutes).toBeNull()
      expect(r.occupancyRatio).toBeNull()
    }
  })
})

describe('serviceExportOperationalPlanningWeekXlsx', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lança erro de domínio (não 500) quando não há plano na semana', async () => {
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)

    await expect(
      serviceExportOperationalPlanningWeekXlsx(pool, '2026-09-07'),
    ).rejects.toMatchObject({
      statusCode: 404,
      code: ErrorCodes.NOT_FOUND,
    } satisfies Partial<AppError>)
  })

  it('lança erro de domínio (não 500) quando o plano não tem itens', async () => {
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue({
      id: 'plan-1',
      week_start_date: '2026-09-07',
      week_end_date: '2026-09-11',
      status: 'DRAFT',
      created_by: 'user-1',
      published_at: null,
      published_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlanExport').mockResolvedValue([])

    await expect(
      serviceExportOperationalPlanningWeekXlsx(pool, '2026-09-07'),
    ).rejects.toMatchObject({
      statusCode: 400,
      code: ErrorCodes.VALIDATION_ERROR,
    } satisfies Partial<AppError>)
  })

  it('resolve situação RASCUNHO quando só há draft', async () => {
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue({
      id: 'plan-1',
      week_start_date: '2026-09-07',
      week_end_date: '2026-09-11',
      status: 'DRAFT',
      created_by: 'user-1',
      published_at: null,
      published_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlanExport').mockResolvedValue([samplePlanRow()])
    vi.spyOn(conveyorPlanRepo, 'loadConveyorPlanItemsForWeekSync').mockResolvedValue(new Map())
    vi.spyOn(capacityMatrix, 'listActiveCollaboratorIdsForPlanningBoard').mockResolvedValue([])
    vi.spyOn(capacityMatrix, 'buildCapacityByCollaboratorDay').mockResolvedValue([])
    vi.spyOn(collaboratorsRepo, 'listCollaborators').mockResolvedValue([])

    const out = await serviceExportOperationalPlanningWeekXlsx(pool, '2026-09-07')
    expect(out.filename).toBe(
      'planejamento-semanal-2026-09-07-a-2026-09-11-rascunho.xlsx',
    )
    expect(Buffer.isBuffer(out.buffer)).toBe(true)
  })

  it('resolve situação PUBLICADO quando só há published', async () => {
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue({
      id: 'plan-2',
      week_start_date: '2026-09-07',
      week_end_date: '2026-09-11',
      status: 'PUBLISHED',
      created_by: 'user-1',
      published_at: new Date().toISOString(),
      published_by: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlanExport').mockResolvedValue([samplePlanRow()])
    vi.spyOn(conveyorPlanRepo, 'loadConveyorPlanItemsForWeekSync').mockResolvedValue(new Map())
    vi.spyOn(capacityMatrix, 'listActiveCollaboratorIdsForPlanningBoard').mockResolvedValue([])
    vi.spyOn(capacityMatrix, 'buildCapacityByCollaboratorDay').mockResolvedValue([])
    vi.spyOn(collaboratorsRepo, 'listCollaborators').mockResolvedValue([])

    const out = await serviceExportOperationalPlanningWeekXlsx(pool, '2026-09-07')
    expect(out.filename).toBe(
      'planejamento-semanal-2026-09-07-a-2026-09-11-publicado.xlsx',
    )
  })

  it('resolve situação REVISAO_NAO_PUBLICADA quando há draft e published', async () => {
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue({
      id: 'plan-1',
      week_start_date: '2026-09-07',
      week_end_date: '2026-09-11',
      status: 'DRAFT',
      created_by: 'user-1',
      published_at: null,
      published_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue({
      id: 'plan-2',
      week_start_date: '2026-09-07',
      week_end_date: '2026-09-11',
      status: 'PUBLISHED',
      created_by: 'user-1',
      published_at: new Date().toISOString(),
      published_by: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlanExport').mockResolvedValue([samplePlanRow()])
    vi.spyOn(conveyorPlanRepo, 'loadConveyorPlanItemsForWeekSync').mockResolvedValue(new Map())
    vi.spyOn(capacityMatrix, 'listActiveCollaboratorIdsForPlanningBoard').mockResolvedValue([])
    vi.spyOn(capacityMatrix, 'buildCapacityByCollaboratorDay').mockResolvedValue([])
    vi.spyOn(collaboratorsRepo, 'listCollaborators').mockResolvedValue([])

    const out = await serviceExportOperationalPlanningWeekXlsx(pool, '2026-09-07')
    expect(out.filename).toBe(
      'planejamento-semanal-2026-09-07-a-2026-09-11-revisao-nao-publicada.xlsx',
    )
  })

  it('usa DRAFT (draft ?? published) como plano editável ignorando o published quando ambos existem', async () => {
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue({
      id: 'plan-draft',
      week_start_date: '2026-09-07',
      week_end_date: '2026-09-11',
      status: 'DRAFT',
      created_by: 'user-1',
      published_at: null,
      published_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue({
      id: 'plan-published',
      week_start_date: '2026-09-07',
      week_end_date: '2026-09-11',
      status: 'PUBLISHED',
      created_by: 'user-1',
      published_at: new Date().toISOString(),
      published_by: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const spy = vi
      .spyOn(repo, 'listEnrichedItemsForWorkPlanExport')
      .mockResolvedValue([samplePlanRow()])
    vi.spyOn(conveyorPlanRepo, 'loadConveyorPlanItemsForWeekSync').mockResolvedValue(new Map())
    vi.spyOn(capacityMatrix, 'listActiveCollaboratorIdsForPlanningBoard').mockResolvedValue([])
    vi.spyOn(capacityMatrix, 'buildCapacityByCollaboratorDay').mockResolvedValue([])
    vi.spyOn(collaboratorsRepo, 'listCollaborators').mockResolvedValue([])

    await serviceExportOperationalPlanningWeekXlsx(pool, '2026-09-07')
    expect(spy).toHaveBeenCalledWith(pool, 'plan-draft')
  })

  it('grava "Revisão necessária" legível no workbook real: sem link, sincronizado, divergente e órfão', async () => {
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue({
      id: 'plan-1',
      week_start_date: '2026-09-07',
      week_end_date: '2026-09-11',
      status: 'DRAFT',
      created_by: 'user-1',
      published_at: null,
      published_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)

    const copSyncedId = 'cop-synced'
    const copDivergedId = 'cop-diverged'
    const copOrphanId = 'cop-orphan'

    vi.spyOn(repo, 'listEnrichedItemsForWorkPlanExport').mockResolvedValue([
      // 1) sem vínculo com o plano da esteira → "Não".
      samplePlanRow({ id: 'item-no-link', conveyor_operational_plan_item_id: null }),
      // 2) vínculo sem nenhuma divergência → "Não".
      samplePlanRow({
        id: 'item-synced',
        conveyor_operational_plan_item_id: copSyncedId,
        planned_date: '2026-09-07',
        planned_minutes: 90,
        assigned_collaborator_id: 'col-1',
        assigned_team_id: null,
        status: 'PLANNED',
      }),
      // 3) vínculo com divergência real de data → "Sim — <mensagem legível>".
      samplePlanRow({
        id: 'item-diverged',
        conveyor_operational_plan_item_id: copDivergedId,
        planned_date: '2026-09-07',
        planned_minutes: 90,
        assigned_collaborator_id: 'col-1',
        status: 'PLANNED',
      }),
      // 4) vínculo para item do plano da esteira que não existe mais (órfão) → "Sim — <mensagem legível>".
      samplePlanRow({ id: 'item-orphan', conveyor_operational_plan_item_id: copOrphanId }),
    ])
    vi.spyOn(conveyorPlanRepo, 'loadConveyorPlanItemsForWeekSync').mockResolvedValue(
      new Map([
        [
          copSyncedId,
          {
            id: copSyncedId,
            planned_date: '2026-09-07',
            planned_minutes: 90,
            planned_collaborator_id: 'col-1',
            planned_team_id: null,
            status: 'PLANNED',
            review_required: false,
            origin_work_plan_item_id: 'item-synced',
          },
        ],
        [
          copDivergedId,
          {
            id: copDivergedId,
            planned_date: '2026-09-08',
            planned_minutes: 90,
            planned_collaborator_id: 'col-1',
            planned_team_id: null,
            status: 'PLANNED',
            review_required: false,
            origin_work_plan_item_id: 'item-diverged',
          },
        ],
        // copOrphanId propositalmente ausente do Map — simula item removido/não encontrado.
      ]),
    )
    vi.spyOn(capacityMatrix, 'listActiveCollaboratorIdsForPlanningBoard').mockResolvedValue([])
    vi.spyOn(capacityMatrix, 'buildCapacityByCollaboratorDay').mockResolvedValue([])
    vi.spyOn(collaboratorsRepo, 'listCollaborators').mockResolvedValue([])

    const out = await serviceExportOperationalPlanningWeekXlsx(pool, '2026-09-07')

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(out.buffer)
    const sheet = workbook.getWorksheet('Planejamento')
    expect(sheet).toBeTruthy()

    // Cabeçalho na linha 7; dados a partir da linha 8 (ver PLANNING_HEADER_ROW no módulo de export).
    const REVIEW_REQUIRED_COLUMN = 18
    const cellValue = (rowOffset: number): string =>
      String(sheet!.getRow(7 + rowOffset).getCell(REVIEW_REQUIRED_COLUMN).value ?? '')

    expect(cellValue(1)).toBe('Não')
    expect(cellValue(2)).toBe('Não')

    const divergedLabel = cellValue(3)
    expect(divergedLabel).toMatch(/^Sim — /)
    expect(divergedLabel).toContain('Data do plano da esteira difere da data da fábrica.')
    // Nenhum código interno de divergência (enum técnico) deve vazar para a célula.
    expect(divergedLabel).not.toMatch(
      /PLANNED_DATE_CHANGED|PLANNED_MINUTES_CHANGED|ASSIGNEE_CHANGED|TEAM_CHANGED|FACTORY_ITEM_MISSING/,
    )

    const orphanLabel = cellValue(4)
    expect(orphanLabel).toBe(
      'Sim — Item do plano da esteira vinculado não foi encontrado.',
    )
  })

  it('meta: totalActivities, totalPlannedMinutes (nulls como 0) e collaboratorsWithActivityCount', async () => {
    vi.spyOn(repo, 'findDraftOperationalWorkPlanByWeekStart').mockResolvedValue({
      id: 'plan-1',
      week_start_date: '2026-09-07',
      week_end_date: '2026-09-11',
      status: 'DRAFT',
      created_by: 'user-1',
      published_at: null,
      published_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    vi.spyOn(repo, 'findPublishedOperationalWorkPlanByWeekStart').mockResolvedValue(null)
    vi.spyOn(repo, 'listEnrichedItemsForWorkPlanExport').mockResolvedValue([
      samplePlanRow({ id: 'i1', assigned_collaborator_id: 'col-1', planned_minutes: 90 }),
      samplePlanRow({ id: 'i2', assigned_collaborator_id: 'col-1', planned_minutes: null }),
      samplePlanRow({ id: 'i3', assigned_collaborator_id: 'col-2', planned_minutes: 30 }),
    ])
    vi.spyOn(conveyorPlanRepo, 'loadConveyorPlanItemsForWeekSync').mockResolvedValue(new Map())
    vi.spyOn(capacityMatrix, 'listActiveCollaboratorIdsForPlanningBoard').mockResolvedValue([])
    vi.spyOn(capacityMatrix, 'buildCapacityByCollaboratorDay').mockResolvedValue([])
    vi.spyOn(collaboratorsRepo, 'listCollaborators').mockResolvedValue([])

    const buildBuffer = await import('../modules/operational-planning/operational-planning.export.js')
    const spyBuild = vi.spyOn(buildBuffer, 'buildOperationalPlanningExportWorkbookBuffer')

    await serviceExportOperationalPlanningWeekXlsx(pool, '2026-09-07')

    expect(spyBuild).toHaveBeenCalledTimes(1)
    const call = spyBuild.mock.calls[0]?.[0]
    expect(call?.meta.totalActivities).toBe(3)
    expect(call?.meta.totalPlannedMinutes).toBe(120)
    expect(call?.meta.collaboratorsWithActivityCount).toBe(2)
  })
})
