/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DashboardDateRangeFilter } from './DashboardDateRangeFilter'

const applied = { startDate: '2026-10-01', endDate: '2026-10-20' }

describe('DashboardDateRangeFilter', () => {
  afterEach(() => cleanup())

  it('renderiza Data inicial e Data final com rótulos e o período aplicado em pt-BR', () => {
    render(<DashboardDateRangeFilter value={applied} onApply={() => {}} />)
    expect((screen.getByLabelText('Data inicial') as HTMLInputElement).value).toBe('2026-10-01')
    expect((screen.getByLabelText('Data final') as HTMLInputElement).value).toBe('2026-10-20')
    expect(screen.getByTestId('dashboard-applied-period').textContent).toContain(
      'Período aplicado: 01/10/2026 a 20/10/2026',
    )
    // Sem alteração: nada a aplicar.
    expect((screen.getByRole('button', { name: 'Aplicar período' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('edição não aplica; só «Aplicar período» aplica (inclusive com Enter)', () => {
    const onApply = vi.fn()
    render(<DashboardDateRangeFilter value={applied} onApply={onApply} />)
    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-09-15' } })
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-09-30' } })
    expect(onApply).not.toHaveBeenCalled()
    // Rascunho em dd/mm/aaaa, independente do idioma do navegador no campo nativo.
    expect(screen.getByTestId('dashboard-draft-period').textContent).toContain(
      'Novo período: 15/09/2026 a 30/09/2026',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar período' }))
    expect(onApply).toHaveBeenCalledWith({ startDate: '2026-09-15', endDate: '2026-09-30' })

    onApply.mockClear()
    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '2026-09-29' } })
    fireEvent.submit(screen.getByTestId('dashboard-date-range-filter'))
    expect(onApply).toHaveBeenCalledWith({ startDate: '2026-09-15', endDate: '2026-09-29' })
  })

  it('erros claros e aplicação bloqueada enquanto o intervalo é inválido', () => {
    const onApply = vi.fn()
    render(<DashboardDateRangeFilter value={applied} onApply={onApply} />)
    const button = screen.getByRole('button', { name: 'Aplicar período' }) as HTMLButtonElement

    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '' } })
    expect(screen.getByText('Informe a data inicial.')).toBeTruthy()
    expect(screen.getByLabelText('Data inicial').getAttribute('aria-invalid')).toBe('true')
    expect(button.disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Data inicial'), { target: { value: '2026-10-25' } })
    expect(screen.getByText('A data inicial não pode ser posterior à data final.')).toBeTruthy()
    expect(button.disabled).toBe(true)
    fireEvent.submit(screen.getByTestId('dashboard-date-range-filter'))
    expect(onApply).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Data final'), { target: { value: '' } })
    expect(screen.getByText('Informe a data final.')).toBeTruthy()
  })

  it('acompanha o período aplicado quando ele muda por fora', () => {
    const { rerender } = render(<DashboardDateRangeFilter value={applied} onApply={() => {}} />)
    rerender(
      <DashboardDateRangeFilter value={{ startDate: '2026-08-01', endDate: '2026-08-31' }} onApply={() => {}} />,
    )
    expect((screen.getByLabelText('Data inicial') as HTMLInputElement).value).toBe('2026-08-01')
    expect(screen.getByTestId('dashboard-applied-period').textContent).toContain('01/08/2026 a 31/08/2026')
  })
})
