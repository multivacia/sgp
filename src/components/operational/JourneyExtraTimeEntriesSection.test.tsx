/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { JourneyExtraTimeEntriesSection } from './JourneyExtraTimeEntriesSection'
import type { OperationalJourneyExtraTimeEntry } from '../../domain/operational-journey/operational-journey.types'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  edit: vi.fn(),
  remove: vi.fn(),
}))
vi.mock('../../services/my-activities/extraTimeEntriesApiService', () => ({
  listExtraTimeEntryDescriptions: mocks.list,
}))
vi.mock('../../services/operational-journey/extraTimeEntryCorrectionsApiService', () => ({
  editExtraTimeEntry: mocks.edit,
  deleteExtraTimeEntry: mocks.remove,
}))

const ID = '11111111-1111-4111-8111-111111111111'
const entry: OperationalJourneyExtraTimeEntry = {
  id: ID,
  collaboratorId: ID,
  collaboratorName: 'Maria',
  entryDate: '2026-10-20',
  minutes: 30,
  description: 'Limpeza',
  descriptionId: ID,
  updatedAt: '2026-10-20T12:00:00.000Z',
  notes: null,
  origin: 'PRODUCTION',
}
const common = {
  summary: { totalMinutes: 30, entriesCount: 1, topDescriptions: [] },
  entries: [entry],
  limit: 20,
}
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('Jornada Extra Esteira — correção gerencial', () => {
  it('não expõe botões na visão sem permissão', () => {
    render(<JourneyExtraTimeEntriesSection {...common} />)
    expect(screen.queryByRole('button', { name: /Editar apontamento Extra Esteira/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Remover apontamento Extra Esteira/ })).toBeNull()
  })

  it('edita lançamento Kiosk, exigindo motivo e atualiza jornada', async () => {
    mocks.list.mockResolvedValue([{ id: ID, description: 'Limpeza' }])
    mocks.edit.mockResolvedValue({ id: ID, updatedAt: '2026-10-20T13:00:00.000Z' })
    const reload = vi.fn().mockResolvedValue(undefined)
    render(<JourneyExtraTimeEntriesSection {...common} canEdit onMutated={reload} />)
    fireEvent.click(screen.getByRole('button', { name: /Editar apontamento Extra Esteira/ }))
    await screen.findByRole('dialog')
    await waitFor(() => expect(mocks.list).toHaveBeenCalled())
    fireEvent.change(screen.getByLabelText('Minutos Extra Esteira'), { target: { value: '50' } })
    const save = screen.getByRole('button', { name: 'Salvar correção' })
    expect((save as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Motivo da correção'), { target: { value: 'Tempo corrigido' } })
    fireEvent.click(save)
    await waitFor(() => expect(mocks.edit).toHaveBeenCalledWith(ID, expect.objectContaining({
      minutes: 50,
      reason: 'Tempo corrigido',
      expectedUpdatedAt: entry.updatedAt,
    })))
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
  })

  it('exclui mediante confirmação com motivo e atualiza jornada', async () => {
    mocks.remove.mockResolvedValue({ deleted: true, id: ID })
    const reload = vi.fn().mockResolvedValue(undefined)
    render(<JourneyExtraTimeEntriesSection {...common} canDelete onMutated={reload} />)
    fireEvent.click(screen.getByRole('button', { name: /Remover apontamento Extra Esteira/ }))
    await screen.findByRole('dialog')
    const confirm = screen.getByRole('button', { name: 'Confirmar remoção' })
    expect((confirm as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Motivo da correção'), { target: { value: 'Duplicado' } })
    fireEvent.click(confirm)
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(ID, {
      expectedUpdatedAt: entry.updatedAt,
      reason: 'Duplicado',
    }))
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
  })
})
