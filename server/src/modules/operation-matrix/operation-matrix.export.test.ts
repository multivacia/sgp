import { describe, expect, it } from 'vitest'
import type { MatrixNodeTreeApi } from './operation-matrix.dto.js'
import {
  buildMatrixExportFilename,
  buildTaskSeparatorLabel,
  buildValidationSequence,
  displayMatrixOrder,
  flattenMatrixTreeForExport,
  formatPlannedMinutesLabel,
} from './operation-matrix.export.js'

function node(
  partial: Partial<MatrixNodeTreeApi> & Pick<MatrixNodeTreeApi, 'node_type' | 'name'>,
  children: MatrixNodeTreeApi[] = [],
): MatrixNodeTreeApi {
  return {
    id: partial.id ?? 'id',
    parent_id: partial.parent_id ?? null,
    root_id: partial.root_id ?? 'root',
    code: partial.code ?? null,
    description: partial.description ?? null,
    order_index: partial.order_index ?? 0,
    level_depth: partial.level_depth ?? 0,
    is_active: partial.is_active ?? true,
    planned_minutes: partial.planned_minutes ?? null,
    default_responsible_id: partial.default_responsible_id ?? null,
    team_ids: partial.team_ids ?? [],
    required: partial.required ?? true,
    source_key: partial.source_key ?? null,
    metadata_json: partial.metadata_json ?? null,
    created_at: partial.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: partial.updated_at ?? '2026-01-01T00:00:00.000Z',
    deleted_at: partial.deleted_at ?? null,
    node_type: partial.node_type,
    name: partial.name,
    children,
  }
}

describe('operation-matrix.export', () => {
  it('formatPlannedMinutesLabel', () => {
    expect(formatPlannedMinutesLabel(null)).toBe('—')
    expect(formatPlannedMinutesLabel(30)).toBe('30 min')
    expect(formatPlannedMinutesLabel(90)).toBe('1 h 30 min')
    expect(formatPlannedMinutesLabel(120)).toBe('2 h')
  })

  it('buildMatrixExportFilename prioriza nome sanitizado, data e fallbacks', () => {
    const exportedAt = new Date('2026-05-13T12:00:00')
    expect(
      buildMatrixExportFilename('id-1', 'MX-01', 'Nome Matriz', exportedAt),
    ).toBe('matriz-Nome-Matriz-2026-05-13.xlsx')
    expect(
      buildMatrixExportFilename('id-1', 'MX-01', 'Matriz Gol GTI', exportedAt),
    ).toBe('matriz-Matriz-Gol-GTI-2026-05-13.xlsx')
    expect(buildMatrixExportFilename('id-1', 'MX-01', '', exportedAt)).toBe(
      'matriz-MX-01-2026-05-13.xlsx',
    )
    expect(buildMatrixExportFilename('id-1', null, '', exportedAt)).toBe(
      'matriz-id-1-2026-05-13.xlsx',
    )
  })

  it('buildTaskSeparatorLabel usa ordem começando em 1', () => {
    expect(buildTaskSeparatorLabel(0, 'Retirada de peças')).toBe(
      'TAREFA 1 — Retirada de peças',
    )
  })

  it('displayMatrixOrder e buildValidationSequence usam ordens começando em 1', () => {
    expect(displayMatrixOrder(0)).toBe(1)
    expect(buildValidationSequence(0, 0, 0)).toBe('1.1.1')
    expect(buildValidationSequence(1, 0, 1)).toBe('2.1.2')
  })

  it('flattenMatrixTreeForExport preserva hierarquia e monta validação', () => {
    const tree = node(
      { node_type: 'ITEM', name: 'Item' },
      [
        node(
          { node_type: 'TASK', name: 'Zebra', order_index: 2 },
          [
            node(
              { node_type: 'SECTOR', name: 'S2', order_index: 1 },
              [
                node({
                  node_type: 'ACTIVITY',
                  name: 'A2',
                  order_index: 1,
                  planned_minutes: 15,
                }),
              ],
            ),
          ],
        ),
        node(
          { node_type: 'TASK', name: 'Alpha', order_index: 1 },
          [
            node(
              { node_type: 'SECTOR', name: 'S1', order_index: 0 },
              [
                node({
                  node_type: 'ACTIVITY',
                  name: 'A1',
                  order_index: 0,
                  planned_minutes: 77,
                  team_ids: ['team-1'],
                }),
              ],
            ),
          ],
        ),
      ],
    )

    const teamNames = new Map([['team-1', 'Equipe Norte']])
    const { structureRows, operationalRows, validationRows } =
      flattenMatrixTreeForExport(tree, teamNames)

    expect(structureRows.map((r) => r.taskName)).toEqual(['Alpha', 'Zebra'])
    expect(structureRows[0]).toMatchObject({
      taskOrder: 1,
      sectorOrder: 0,
      activityOrder: 0,
      plannedMinutes: 77,
      teamName: 'Equipe Norte',
    })
    expect(operationalRows[0]?.path).toBe('Alpha > S1 > A1')
    expect(validationRows[0]).toMatchObject({
      seq: '2.1.1',
      taskName: 'Alpha',
      sectorName: 'S1',
      activityName: 'A1',
      plannedTime: '1 h 17 min',
      teamName: 'Equipe Norte',
    })
    expect(validationRows[1]?.seq).toBe('3.2.2')
  })
})
