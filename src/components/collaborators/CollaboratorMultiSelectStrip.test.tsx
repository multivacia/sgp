/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { CollaboratorMultiSelectStrip } from './CollaboratorMultiSelectStrip'
import { collaboratorInitials } from './collaboratorInitials'

const options = [
  { id: 'a', label: 'Maria Souza' },
  { id: 'b', label: 'João Lima' },
  { id: 'c', label: 'Ana' },
]

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('collaboratorInitials', () => {
  it('usa primeiro e último nome', () => {
    expect(collaboratorInitials('Maria Souza')).toBe('MS')
    expect(collaboratorInitials('  maria de souza lima ')).toBe('ML')
  })

  it('nome único vira duas letras', () => {
    expect(collaboratorInitials('Ana')).toBe('AN')
  })
})

describe('CollaboratorMultiSelectStrip', () => {
  it('adiciona pelo popover com busca, preservando a ordem de seleção', () => {
    const onChange = vi.fn()
    render(
      <CollaboratorMultiSelectStrip options={options} selectedIds={['a']} onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar colaborador' }))
    fireEvent.change(screen.getByPlaceholderText('Buscar colaborador…'), {
      target: { value: 'joão' },
    })
    expect(screen.queryByText('Ana')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /João Lima/ }))
    expect(onChange).toHaveBeenCalledWith(['a', 'b'])
  })

  it('clique no avatar remove o colaborador', () => {
    const onChange = vi.fn()
    render(
      <CollaboratorMultiSelectStrip
        options={options}
        selectedIds={['a', 'b']}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Remover Maria Souza' }))
    expect(onChange).toHaveBeenCalledWith(['b'])
  })

  it('limpar seleção devolve lista vazia', () => {
    const onChange = vi.fn()
    render(
      <CollaboratorMultiSelectStrip
        options={options}
        selectedIds={['a', 'b']}
        onChange={onChange}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Limpar seleção' }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('sem seleção mostra a dica e nenhuma ação de limpar', () => {
    render(<CollaboratorMultiSelectStrip options={options} selectedIds={[]} onChange={vi.fn()} />)
    expect(screen.getByText('Nenhum colaborador selecionado.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Limpar seleção' })).toBeNull()
  })

  it('no teto de seleção o botão de adicionar fica indisponível', () => {
    render(
      <CollaboratorMultiSelectStrip
        options={options}
        selectedIds={['a', 'b']}
        maxSelected={2}
        onChange={vi.fn()}
      />,
    )
    const add = screen.getByRole('button', { name: 'Adicionar colaborador' })
    expect(add.hasAttribute('disabled')).toBe(true)
    fireEvent.click(add)
    expect(screen.queryByPlaceholderText('Buscar colaborador…')).toBeNull()
  })
})
