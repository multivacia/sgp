/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ApiError } from '../../lib/api/apiErrors'
import type {
  ExtraTimeEntryDescriptionOption,
  ExtraTimeEntryItem,
} from '../../domain/my-activities/extraTimeEntries.types'
import { KioskExtraActivityModal } from './KioskExtraActivityModal'
import { todayIsoDate } from './kioskExtraActivityModalLogic'
import * as productionApiService from '../../services/production/productionApiService'

vi.mock('../../services/production/productionApiService', () => ({
  listProductionExtraTimeEntryDescriptions: vi.fn(),
  listProductionExtraTimeEntries: vi.fn(),
  createProductionExtraTimeEntry: vi.fn(),
  PRODUCTION_EXTRA_TIME_ENTRY_ERROR_MESSAGE:
    'Não foi possível registrar o apontamento extra esteira.',
}))

const DESCRIPTIONS: ExtraTimeEntryDescriptionOption[] = [
  { id: 'desc-1', description: 'Reunião de alinhamento' },
  { id: 'desc-2', description: 'Manutenção de equipamento' },
]

const HISTORY: ExtraTimeEntryItem[] = [
  {
    id: 'entry-1',
    descriptionId: 'desc-1',
    description: 'Reunião de alinhamento',
    entryDate: '2026-09-01',
    minutes: 30,
    notes: 'Nota anterior',
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
  },
]

function mockedService() {
  return productionApiService as unknown as {
    listProductionExtraTimeEntryDescriptions: ReturnType<typeof vi.fn>
    listProductionExtraTimeEntries: ReturnType<typeof vi.fn>
    createProductionExtraTimeEntry: ReturnType<typeof vi.fn>
  }
}

async function fillValidForm() {
  const select = screen.getByLabelText(/tipo de atividade/i) as HTMLSelectElement
  fireEvent.change(select, { target: { value: 'desc-1' } })
  const minutes = screen.getByPlaceholderText(/ex\.: 30/i)
  fireEvent.change(minutes, { target: { value: '45' } })
  await waitFor(() => {
    expect((minutes as HTMLInputElement).value).toBe('45')
  })
}

describe('KioskExtraActivityModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const svc = mockedService()
    svc.listProductionExtraTimeEntryDescriptions.mockResolvedValue(DESCRIPTIONS)
    svc.listProductionExtraTimeEntries.mockResolvedValue(HISTORY)
    svc.createProductionExtraTimeEntry.mockResolvedValue(HISTORY[0])
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('não renderiza nada quando open=false', () => {
    render(<KioskExtraActivityModal open={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('abre e carrega descrições e histórico', async () => {
    render(<KioskExtraActivityModal open onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeTruthy()

    const select = screen.getByLabelText(/tipo de atividade/i) as HTMLSelectElement
    await waitFor(() => {
      expect(select.querySelectorAll('option')).toHaveLength(DESCRIPTIONS.length + 1)
    })
    expect(mockedService().listProductionExtraTimeEntryDescriptions).toHaveBeenCalledTimes(1)
    expect(mockedService().listProductionExtraTimeEntries).toHaveBeenCalledWith({ limit: 5 })

    await waitFor(() => {
      expect(screen.getByText('Nota anterior')).toBeTruthy()
    })
  })

  it('fecha ao clicar em Fechar', async () => {
    const onClose = vi.fn()
    render(<KioskExtraActivityModal open onClose={onClose} />)
    await waitFor(() => {
      expect(mockedService().listProductionExtraTimeEntryDescriptions).toHaveBeenCalled()
    })
    fireEvent.click(screen.getByText('Fechar'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('reseta formulário e histórico completamente ao reabrir', async () => {
    const { rerender } = render(<KioskExtraActivityModal open onClose={vi.fn()} />)
    await waitFor(() => {
      expect(mockedService().listProductionExtraTimeEntryDescriptions).toHaveBeenCalledTimes(1)
    })
    await fillValidForm()
    fireEvent.change(screen.getByLabelText(/observação/i), {
      target: { value: 'Rascunho não enviado' },
    })

    // Fecha o modal (troca de colaborador / logout no mesmo tablet).
    rerender(<KioskExtraActivityModal open={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()

    // Reabre — nada do preenchimento anterior deve sobreviver.
    rerender(<KioskExtraActivityModal open onClose={vi.fn()} />)
    await waitFor(() => {
      expect(mockedService().listProductionExtraTimeEntryDescriptions).toHaveBeenCalledTimes(2)
    })

    const minutesInput = screen.getByPlaceholderText(/ex\.: 30/i) as HTMLInputElement
    expect(minutesInput.value).toBe('')
    const notesInput = screen.getByLabelText(/observação/i) as HTMLTextAreaElement
    expect(notesInput.value).toBe('')
    const select = screen.getByLabelText(/tipo de atividade/i) as HTMLSelectElement
    expect(select.value).toBe('')
  })

  it('submete com payload correto', async () => {
    const onClose = vi.fn()
    const onSuccess = vi.fn()
    render(<KioskExtraActivityModal open onClose={onClose} onSuccess={onSuccess} />)
    await waitFor(() => {
      expect(mockedService().listProductionExtraTimeEntryDescriptions).toHaveBeenCalled()
    })
    await fillValidForm()
    fireEvent.change(screen.getByLabelText(/^data$/i), {
      target: { value: '2026-08-20' },
    })
    fireEvent.change(screen.getByLabelText(/observação/i), {
      target: { value: '  Nota de teste  ' },
    })

    fireEvent.click(screen.getByRole('button', { name: /registrar apontamento/i }))

    await waitFor(() => {
      expect(mockedService().createProductionExtraTimeEntry).toHaveBeenCalledWith({
        descriptionId: 'desc-1',
        entryDate: '2026-08-20',
        minutes: 45,
        notes: 'Nota de teste',
      })
    })
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })

  it('bloqueia data futura no frontend', async () => {
    render(<KioskExtraActivityModal open onClose={vi.fn()} />)
    await waitFor(() => {
      expect(mockedService().listProductionExtraTimeEntryDescriptions).toHaveBeenCalled()
    })
    await fillValidForm()

    const future = new Date()
    future.setDate(future.getDate() + 5)
    const futureIso = future.toISOString().slice(0, 10)
    expect(futureIso > todayIsoDate()).toBe(true)

    fireEvent.change(screen.getByLabelText(/^data$/i), {
      target: { value: futureIso },
    })

    const submitButton = screen.getByRole('button', {
      name: /registrar apontamento/i,
    }) as HTMLButtonElement
    expect(submitButton.disabled).toBe(true)

    fireEvent.click(submitButton)
    expect(mockedService().createProductionExtraTimeEntry).not.toHaveBeenCalled()
  })

  it('exibe erro de backend em banner', async () => {
    mockedService().createProductionExtraTimeEntry.mockRejectedValue(
      new ApiError('Descrição inexistente, inativa ou removida.', 422),
    )
    render(<KioskExtraActivityModal open onClose={vi.fn()} />)
    await waitFor(() => {
      expect(mockedService().listProductionExtraTimeEntryDescriptions).toHaveBeenCalled()
    })
    await fillValidForm()

    fireEvent.click(screen.getByRole('button', { name: /registrar apontamento/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain(
        'Descrição inexistente, inativa ou removida.',
      )
    })
  })
})
