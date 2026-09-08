/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type { TimeEntryJustificationOption } from '../../domain/operational-settings/timeEntryJustifications.types'
import { OPERATIONAL_JUSTIFICATION_MESSAGES } from '../../domain/operational/timeEntryJustificationField'
import {
  JustificationSelect,
  JUSTIFICATION_SELECT_MESSAGES,
} from './JustificationSelect'

const { listMyTimeEntryJustificationsMock, listProductionTimeEntryJustificationsMock } =
  vi.hoisted(() => ({
    listMyTimeEntryJustificationsMock: vi.fn(),
    listProductionTimeEntryJustificationsMock: vi.fn(),
  }))

vi.mock(
  '../../services/time-entry-justifications/timeEntryJustificationsSelectionApiService',
  () => ({
    listMyTimeEntryJustifications: listMyTimeEntryJustificationsMock,
    listProductionTimeEntryJustifications: listProductionTimeEntryJustificationsMock,
  }),
)

const OPTIONS: TimeEntryJustificationOption[] = [
  {
    id: 'seq-1',
    label: 'Atividade anterior pendente de outro colaborador',
    description: null,
    category: 'SEQUENCE',
    requiresComplement: false,
    sortOrder: 30,
  },
  {
    id: 'sub-1',
    label: 'Substituição por ausência',
    description: null,
    category: 'SUBSTITUTION',
    requiresComplement: false,
    sortOrder: 10,
  },
]

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('JustificationSelect — sem pré-seleção', () => {
  it('com preferredCategory e value vazio, após load permanece no placeholder e não chama onChange', async () => {
    listMyTimeEntryJustificationsMock.mockResolvedValue(OPTIONS)
    const onChange = vi.fn()

    render(
      <JustificationSelect
        channel="app"
        value=""
        complement=""
        legacyText=""
        preferredCategory="SEQUENCE"
        preferredLabelHint="outro colaborador"
        onChange={onChange}
      />,
    )

    expect(screen.getByText('Carregando justificativas…')).toBeTruthy()

    const select = await waitFor(() => {
      const el = screen.getByRole('combobox')
      expect(el).toBeTruthy()
      return el as HTMLSelectElement
    })

    expect(select.value).toBe('')
    expect(screen.getByText(OPERATIONAL_JUSTIFICATION_MESSAGES.placeholder)).toBeTruthy()
    expect(JUSTIFICATION_SELECT_MESSAGES.placeholder).toBe(
      'Selecione uma justificativa...',
    )
    expect(onChange).not.toHaveBeenCalled()
    expect(listMyTimeEntryJustificationsMock).toHaveBeenCalledTimes(1)
    expect(listProductionTimeEntryJustificationsMock).not.toHaveBeenCalled()
  })
})
