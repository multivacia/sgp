import { describe, expect, it } from 'vitest'
import {
  SHOW_ARGOS_PANEL_FILTERS,
  SHOW_BACKLOG_ACTIVITIES_COLUMN,
  SHOW_BACKLOG_ARGOS_COLUMN,
  SHOW_BACKLOG_ORIGIN_COLUMN,
} from './backlogUiFlags'

describe('backlogUiFlags', () => {
  it('mantém colunas e painel ARGOS desabilitados temporariamente na UI', () => {
    expect(SHOW_ARGOS_PANEL_FILTERS).toBe(false)
    expect(SHOW_BACKLOG_ORIGIN_COLUMN).toBe(false)
    expect(SHOW_BACKLOG_ACTIVITIES_COLUMN).toBe(false)
    expect(SHOW_BACKLOG_ARGOS_COLUMN).toBe(false)
  })
})
