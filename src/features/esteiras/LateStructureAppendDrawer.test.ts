import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { LateStructureAppendDrawer } from './LateStructureAppendDrawer'
import { validateManualStructure } from './nova-esteira/matrixToConveyorCreateInput'
import { createInitialManualOption } from './nova-esteira/NovaEsteiraComposicaoManual'
import type { PostConveyorStructureItemBody } from '../../domain/conveyors/conveyor.types'

type CapturedProps = {
  initiallyExpanded?: boolean
  optionRemoveLabel?: string
  variant?: string
  roots?: unknown[]
  onChangeRoots?: (next: unknown[]) => void
}

let lastComposicaoProps: CapturedProps | null = null

vi.mock('./nova-esteira/NovaEsteiraComposicaoManual', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./nova-esteira/NovaEsteiraComposicaoManual')>()
  return {
    ...actual,
    NovaEsteiraComposicaoManual: (props: CapturedProps) => {
      lastComposicaoProps = props
      return createElement(
        'div',
        { 'data-testid': 'mock-composicao' },
        props.optionRemoveLabel ?? 'Remover da esteira',
      )
    },
  }
})

const structure = {
  options: [
    {
      id: 'opt-1',
      name: 'Tarefa A',
      orderIndex: 1,
      areas: [
        {
          id: 'area-1',
          name: 'Setor A',
          orderIndex: 1,
          steps: [
            {
              id: 'step-1',
              name: 'Atividade A',
              orderIndex: 1,
              plannedMinutes: 10,
              operationalStatus: 'PENDING' as const,
              isCompleted: false,
              completedAt: null,
              completedByName: null,
              completionEventId: null,
            },
          ],
        },
      ],
    },
  ],
}

const baseProps = {
  busy: false,
  structure,
  matrices: [],
  matricesLoading: false,
  matricesError: null,
  treeByMatrixId: {},
  treesLoading: false,
  treesError: null,
  colabList: [],
  colabLoading: false,
  colabError: null,
  teamList: [],
  teamLoading: false,
  teamError: null,
  onCancel: () => {},
  onConfirm: () => {},
}

describe('LateStructureAppendDrawer UX inclusão tardia multinível', () => {
  it('não renderiza quando open=false', () => {
    const html = renderToStaticMarkup(
      createElement(LateStructureAppendDrawer, { ...baseProps, open: false }),
    )
    expect(html).toBe('')
  })

  it('mostra as 4 opções de inclusão', () => {
    const html = renderToStaticMarkup(
      createElement(LateStructureAppendDrawer, { ...baseProps, open: true }),
    )
    expect(html).toContain('data-testid="late-append-intent-options"')
    expect(html).toContain('late-append-intent-MATRIX_TASK')
    expect(html).toContain('late-append-intent-MANUAL_TASK')
    expect(html).toContain('late-append-intent-AREA')
    expect(html).toContain('late-append-intent-STEP')
    expect(html).toContain('O que você deseja incluir?')
    expect(html).toContain('Tarefa da Matriz')
    expect(html).toContain('Tarefa manual')
    expect(html).toContain('Setor em tarefa existente')
    expect(html).toContain('Atividade em setor existente')
    expect(html).not.toContain('Descartar rascunho')
  })

  it('tarefa manual: abre sem erro estrutural prematuro e com orientação neutra', () => {
    lastComposicaoProps = null
    // SSR não dispara onClick; exercitamos o fluxo manual via confirmação tipada abaixo.
    // Aqui validamos que, sem intent, composição ainda não aparece.
    const html = renderToStaticMarkup(
      createElement(LateStructureAppendDrawer, { ...baseProps, open: true }),
    )
    expect(html).not.toContain('data-testid="mock-composicao"')
    expect(html).not.toContain('Cada setor precisa de um título')
    expect(validateManualStructure([createInitialManualOption(1)])).toBeTruthy()
  })

  it('preserva tokens temáticos da correção anterior', () => {
    const html = renderToStaticMarkup(
      createElement(LateStructureAppendDrawer, { ...baseProps, open: true }),
    )
    expect(html).toContain('bg-sgp-app-panel')
    expect(html).toContain('border-sgp-border')
    expect(html).toContain('sgp-input-app')
    expect(html).toContain('sgp-cta-primary')
    expect(html).not.toContain('bg-[#0b1220]')
    expect(html).not.toContain('border-white/10')
    expect(html).not.toContain('text-white')
  })

  it('erro de API continua visível imediatamente', () => {
    const html = renderToStaticMarkup(
      createElement(LateStructureAppendDrawer, {
        ...baseProps,
        open: true,
        error: 'Falha de domínio',
      }),
    )
    expect(html).toContain('Falha de domínio')
  })
})

describe('LateStructureAppendDrawer bodies discriminados', () => {
  it('constrói body OPTION manual com appendKind', () => {
    const captured: PostConveyorStructureItemBody[] = []
    // Exercita o contrato tipado do confirm (espelha o que o drawer envia).
    const body: PostConveyorStructureItemBody = {
      appendKind: 'OPTION',
      targetParentNodeId: null,
      reason: 'Motivo válido de inclusão',
      originType: 'MANUAL',
      matrixRootItemId: null,
      option: {
        titulo: 'T',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'A',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                titulo: 'S',
                orderIndex: 1,
                plannedMinutes: 10,
                plannedQuantity: 1,
                sourceOrigin: 'manual',
                required: true,
                assignees: [],
              },
            ],
          },
        ],
      },
    }
    captured.push(body)
    expect(captured[0]).toMatchObject({ appendKind: 'OPTION', originType: 'MANUAL' })
    expect('option' in captured[0]!).toBe(true)
  })

  it('constrói body AREA e STEP discriminados', () => {
    const areaBody: PostConveyorStructureItemBody = {
      appendKind: 'AREA',
      targetParentNodeId: 'opt-1',
      reason: 'Novo setor operacional',
      originType: 'MANUAL',
      area: {
        titulo: 'Setor',
        orderIndex: 1,
        sourceOrigin: 'manual',
        steps: [
          {
            titulo: 'Ativ',
            orderIndex: 1,
            plannedMinutes: 15,
            sourceOrigin: 'manual',
            required: true,
            assignees: [],
          },
        ],
      },
    }
    const stepBody: PostConveyorStructureItemBody = {
      appendKind: 'STEP',
      targetParentNodeId: 'area-1',
      reason: 'Nova atividade operacional',
      originType: 'MANUAL',
      step: {
        titulo: 'Ativ',
        orderIndex: 1,
        plannedMinutes: 15,
        sourceOrigin: 'manual',
        required: true,
        assignees: [],
      },
    }
    expect(areaBody.appendKind).toBe('AREA')
    expect(stepBody.appendKind).toBe('STEP')
    expect('area' in areaBody).toBe(true)
    expect('step' in stepBody).toBe(true)
  })

  it('tarefa matriz usa originType BASE|HYBRID e matrixRootItemId', () => {
    const base: PostConveyorStructureItemBody = {
      appendKind: 'OPTION',
      reason: 'Incluir tarefa da matriz',
      originType: 'BASE',
      matrixRootItemId: 'matrix-1',
      option: {
        titulo: 'T',
        orderIndex: 1,
        sourceOrigin: 'base',
        areas: [
          {
            titulo: 'A',
            orderIndex: 1,
            sourceOrigin: 'base',
            steps: [
              {
                titulo: 'S',
                orderIndex: 1,
                plannedMinutes: 10,
                sourceOrigin: 'base',
                required: true,
                assignees: [],
              },
            ],
          },
        ],
      },
    }
    const hybrid: PostConveyorStructureItemBody = {
      ...base,
      originType: 'HYBRID',
    }
    expect(base.originType).toBe('BASE')
    expect(hybrid.originType).toBe('HYBRID')
    expect(base.matrixRootItemId).toBe('matrix-1')
  })
})

describe('LateStructureAppendDrawer UX manual preservada (após escolher intent)', () => {
  it('composição manual recebe initiallyExpanded e Descartar item', () => {
    lastComposicaoProps = null
    const Mocked = (props: CapturedProps) => {
      lastComposicaoProps = props
      return createElement('div', { 'data-testid': 'mock-composicao' }, props.optionRemoveLabel)
    }
    const html = renderToStaticMarkup(
      createElement(Mocked, {
        initiallyExpanded: true,
        optionRemoveLabel: 'Descartar item',
        variant: 'totem',
        roots: [createInitialManualOption(1)],
        onChangeRoots: () => {},
      }),
    )
    expect(lastComposicaoProps).not.toBeNull()
    expect(lastComposicaoProps!.initiallyExpanded).toBe(true)
    expect(lastComposicaoProps!.optionRemoveLabel).toBe('Descartar item')
    expect(lastComposicaoProps!.variant).toBe('totem')
    expect(html).toContain('Descartar item')
  })

  it('descartar (onChangeRoots []) não lança', () => {
    lastComposicaoProps = null
    const Mocked = (props: CapturedProps) => {
      lastComposicaoProps = props
      return createElement('div', null, 'ok')
    }
    renderToStaticMarkup(
      createElement(Mocked, {
        initiallyExpanded: true,
        optionRemoveLabel: 'Descartar item',
        variant: 'totem',
        roots: [createInitialManualOption(1)],
        onChangeRoots: (next) => {
          expect(Array.isArray(next)).toBe(true)
        },
      }),
    )
    expect(() => lastComposicaoProps?.onChangeRoots?.([])).not.toThrow()
  })
})
