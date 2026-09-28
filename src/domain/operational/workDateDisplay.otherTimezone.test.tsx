/** @vitest-environment jsdom */
// Navegador fora de São Paulo: Tóquio (UTC+9). 12:00 de SP (15:00 UTC) já é 00:00 do dia
// seguinte em Tóquio — a exibição deve continuar mostrando o dia de SP, sem horário.

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  formatWorkDateFromEntryAt,
  operationalDayRangeIso,
  operationalTodayIso,
} from './workDate'
import { PlanningExecutionOutsidePlanPanel } from '../../features/operational-planning/PlanningExecutionOutsidePlanPanel'

vi.stubEnv('TZ', 'Asia/Tokyo')

afterEach(() => cleanup())

describe('data de realização com navegador em outro fuso', () => {
  it('ambiente do teste está mesmo fora de SP', () => {
    expect(new Date('2026-09-27T15:00:00.000Z').getDate()).toBe(28)
    expect(new Date('2026-09-27T15:00:00.000Z').toLocaleString('pt-BR')).toContain('28/09/2026')
  })

  it('formatWorkDateFromEntryAt usa o dia de SP e nunca mostra hora', () => {
    expect(formatWorkDateFromEntryAt('2026-09-27T12:00:00-03:00')).toBe('27/09/2026')
    expect(formatWorkDateFromEntryAt('2026-09-27T15:00:00.000Z')).toBe('27/09/2026')
    // 31/08 23:30 em SP (01/09 02:30 UTC)
    expect(formatWorkDateFromEntryAt('2026-09-01T02:30:00.000Z')).toBe('31/08/2026')
    expect(formatWorkDateFromEntryAt(null)).toBe('—')
  })

  it('intervalo personalizado é enviado com limites de SP, independente do fuso do navegador', () => {
    expect(operationalDayRangeIso('2026-09-01', '2026-09-30')).toEqual({
      from: '2026-09-01T00:00:00.000-03:00',
      to: '2026-09-30T23:59:59.999-03:00',
    })
    expect(operationalTodayIso(new Date('2026-09-28T16:00:00.000Z'))).toBe('2026-09-28')
  })

  it('lista de apontamentos (planejamento) exibe só dd/mm/aaaa, sem o 12:00 convencional', () => {
    render(
      <MemoryRouter>
        <PlanningExecutionOutsidePlanPanel
          summaryTotalMinutes={30}
          entries={[
            {
              id: 'te-1',
              conveyorId: 'conv-1',
              conveyorTitle: 'OS-1',
              activityNodeId: 'step-1',
              activityTitle: 'Costurar',
              taskTitle: 'Estofamento',
              sectorTitle: 'Costura',
              collaboratorId: 'c-1',
              collaboratorName: 'Maria',
              entryAt: '2026-09-27T15:00:00.000Z',
              minutes: 30,
              entryOrigin: 'ASSIGNED',
              exceptionJustification: null,
              notes: null,
            },
          ]}
        />
      </MemoryRouter>,
    )
    const line = screen.getByText(/Maria ·/)
    expect(line.textContent).toBe('Maria · 27/09/2026')
    expect(line.textContent).not.toMatch(/\d{2}:\d{2}/)
  })
})
