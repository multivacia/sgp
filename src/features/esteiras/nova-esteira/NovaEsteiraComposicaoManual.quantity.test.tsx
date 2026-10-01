/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { NovaEsteiraComposicaoManual } from './NovaEsteiraComposicaoManual'
import {
  buildManualConveyorInput,
  PLANNED_QUANTITY_INVALID_MESSAGE,
  validateManualStructure,
  type ManualOptionDraft,
} from './matrixToConveyorCreateInput'

afterEach(() => cleanup())

const initialRoots: ManualOptionDraft[] = [
  {
    key: 'op-1',
    titulo: 'Tarefa 1',
    areas: [
      {
        key: 'ar-1',
        titulo: 'Setor',
        steps: [{ key: 'st-1', titulo: 'Costurar banco', plannedMinutes: 40, plannedQuantity: 1 }],
      },
    ],
  },
]

function Harness({ onRoots }: { onRoots: (r: ManualOptionDraft[]) => void }) {
  const [roots, setRoots] = useState(initialRoots)
  return (
    <NovaEsteiraComposicaoManual
      roots={roots}
      onChangeRoots={(next) => {
        setRoots(next)
        onRoots(next)
      }}
      alocacoes={{}}
      onChangeAlocacoes={() => {}}
      colabList={[]}
      colabLoading={false}
      colabError={null}
      teamList={[]}
      teamLoading={false}
      teamError={null}
      initiallyExpanded
    />
  )
}

function qtdInput(): HTMLInputElement {
  return screen.getByText('Qtd').parentElement!.querySelector('input') as HTMLInputElement
}

describe('NovaEsteiraComposicaoManual — quantidade prevista na criação', () => {
  it('campo Qtd é editável em atividade nova e o POST leva unitário × quantidade', () => {
    const onRoots = vi.fn()
    render(<Harness onRoots={onRoots} />)
    const input = qtdInput()
    expect(input.disabled).toBe(false)
    expect(input.readOnly).toBe(false)

    fireEvent.change(input, { target: { value: '3' } })
    const roots = onRoots.mock.calls.at(-1)![0] as ManualOptionDraft[]
    expect(roots[0]!.areas[0]!.steps[0]!.plannedQuantity).toBe(3)
    expect(validateManualStructure(roots)).toBeNull()

    const body = buildManualConveyorInput({ nome: 'X' } as never, roots, {})
    const step = body.options[0]!.areas[0]!.steps[0]!
    expect(step.plannedQuantity).toBe(3)
    expect(step.plannedMinutes).toBe(40)
    expect(step.id).toBeUndefined()
  })

  it('quantidade inválida bloqueia a estrutura com a mensagem padrão', () => {
    const onRoots = vi.fn()
    render(<Harness onRoots={onRoots} />)
    fireEvent.change(qtdInput(), { target: { value: '0' } })
    expect(screen.getByText(PLANNED_QUANTITY_INVALID_MESSAGE)).toBeTruthy()
    const roots = onRoots.mock.calls.at(-1)![0] as ManualOptionDraft[]
    expect(validateManualStructure(roots)).toBe(PLANNED_QUANTITY_INVALID_MESSAGE)
  })
})
