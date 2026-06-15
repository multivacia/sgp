import { useCallback, useEffect, useState } from 'react'
import type { ConveyorProgressItem } from '../../domain/conveyor-progress/conveyorProgress.types'
import type { ConveyorProgressFiltersState } from './ConveyorProgressFilters'

export type ConveyorProgressPrintState =
  | { status: 'idle' }
  | {
      status: 'printing'
      items: ConveyorProgressItem[]
      generatedAt: string
      appliedFilters?: ConveyorProgressFiltersState
    }
  | { status: 'done' }
  | { status: 'error'; message: string }

export function useConveyorProgressPrint() {
  const [state, setState] = useState<ConveyorProgressPrintState>({ status: 'idle' })

  const requestPrint = useCallback(
    (items: readonly ConveyorProgressItem[], appliedFilters?: ConveyorProgressFiltersState) => {
      if (items.length === 0) return
      const generatedAt = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'medium',
      }).format(new Date())
      setState({
        status: 'printing',
        items: [...items],
        generatedAt,
        appliedFilters,
      })
    },
    [],
  )

  useEffect(() => {
    if (state.status !== 'printing') return

    const frameId = requestAnimationFrame(() => {
      try {
        window.print()
        setState({ status: 'done' })
      } catch {
        setState({
          status: 'error',
          message: 'Não foi possível abrir a impressão. Tente novamente.',
        })
      }
    })

    return () => cancelAnimationFrame(frameId)
  }, [state])

  useEffect(() => {
    const onAfterPrint = () => {
      setState((prev) =>
        prev.status === 'printing' || prev.status === 'done' ? { status: 'idle' } : prev,
      )
    }
    window.addEventListener('afterprint', onAfterPrint)
    return () => window.removeEventListener('afterprint', onAfterPrint)
  }, [])

  const printPayload =
    state.status === 'printing'
      ? {
          items: state.items,
          generatedAt: state.generatedAt,
          appliedFilters: state.appliedFilters,
        }
      : null

  const isPrinting = state.status === 'printing'

  return {
    printPayload,
    isPrinting,
    printError: state.status === 'error' ? state.message : null,
    requestPrint,
  }
}
