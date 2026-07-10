import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { OperationalPlanningCapacityPanel } from './OperationalPlanningCapacityPanel'
import type { OperationalPlanningCapacityPayload } from '../../domain/operational-planning/operational-planning.types'

const sampleCapacity: OperationalPlanningCapacityPayload = {
  summary: {
    collaboratorsCount: 5,
    totalPlannedMinutes: 9300,
    totalOverloadMinutes: 780,
    byStatus: {
      SEM_CAPACIDADE_CADASTRADA: 1,
      DISPONIVEL: 1,
      PROXIMO_DO_LIMITE: 1,
      ACIMA_DA_CAPACIDADE: 1,
      SOBRECARGA_CRITICA: 1,
    },
  },
  collaborators: [
    {
      collaboratorId: 'col-1',
      collaboratorName: 'Ana',
      capacityMinutes: 2400,
      plannedMinutes: 1200,
      availableMinutes: 1200,
      overloadMinutes: 0,
      occupancyPct: 50,
      status: 'DISPONIVEL',
    },
    {
      collaboratorId: 'col-2',
      collaboratorName: 'Bruno',
      capacityMinutes: 2400,
      plannedMinutes: 2160,
      availableMinutes: 240,
      overloadMinutes: 0,
      occupancyPct: 90,
      status: 'PROXIMO_DO_LIMITE',
    },
    {
      collaboratorId: 'col-3',
      collaboratorName: 'Carla',
      capacityMinutes: 2400,
      plannedMinutes: 2520,
      availableMinutes: 0,
      overloadMinutes: 120,
      occupancyPct: 105,
      status: 'ACIMA_DA_CAPACIDADE',
    },
    {
      collaboratorId: 'col-4',
      collaboratorName: 'Diego',
      capacityMinutes: 2400,
      plannedMinutes: 3060,
      availableMinutes: 0,
      overloadMinutes: 660,
      occupancyPct: 127.5,
      status: 'SOBRECARGA_CRITICA',
    },
    {
      collaboratorId: 'col-5',
      collaboratorName: 'Eva',
      capacityMinutes: null,
      plannedMinutes: 360,
      availableMinutes: null,
      overloadMinutes: 0,
      occupancyPct: null,
      status: 'SEM_CAPACIDADE_CADASTRADA',
    },
  ],
}

describe('OperationalPlanningPage capacity panel', () => {
  it('renderiza os 5 labels de status e a mensagem de planejamento permitido', () => {
    const html = renderToStaticMarkup(<OperationalPlanningCapacityPanel capacity={sampleCapacity} />)

    expect(html).toContain('Disponível')
    expect(html).toContain('Próximo do limite')
    expect(html).toContain('Acima da capacidade')
    expect(html).toContain('Sobrecarga crítica')
    expect(html).toContain('Sem capacidade cadastrada')
    expect(html).toContain('Planejamento acima da capacidade. Ainda assim, o plano pode ser salvo e publicado.')
  })

  it('renderiza os campos de capacidade por colaborador e o alerta cadastral', () => {
    const html = renderToStaticMarkup(<OperationalPlanningCapacityPanel capacity={sampleCapacity} />)

    expect(html).toContain('Capacidade')
    expect(html).toContain('Planejado')
    expect(html).toContain('Disponível')
    expect(html).toContain('Excesso')
    expect(html).toContain('Ocupação')
    expect(html).toContain('Status')
    expect(html).toContain(
      'Sem capacidade cadastrada. Revise a carga horária diária do colaborador.',
    )
  })
})
