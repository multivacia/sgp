import { useCallback, useEffect, useState } from 'react'
import { getConveyors, listConveyors } from '../api/conveyors'
import type { ConveyorDetail, ConveyorListItem, ConveyorStatus } from '../domain/conveyors'

type State = {
  list: ConveyorListItem[] | null
  details: Map<string, ConveyorDetail>
  error: string | null
}

/** Lista de esteiras + detalhe de cada uma (chega aos poucos) para os status pedidos. */
export function useConveyors(statuses: ConveyorStatus[]) {
  const [state, setState] = useState<State>({ list: null, details: new Map(), error: null })
  const key = statuses.join(',')

  const load = useCallback(
    async (fresh: boolean) => {
      try {
        const all = await listConveyors()
        const wanted = key.split(',')
        const list = all.filter((c) => wanted.includes(c.operationalStatus))
        setState((s) => ({ list, details: fresh ? new Map() : s.details, error: null }))
        await getConveyors(
          list.map((c) => c.id),
          (d) => setState((s) => ({ ...s, details: new Map(s.details).set(d.id, d) })),
          4,
          fresh,
        )
      } catch (e) {
        setState((s) => ({ ...s, error: e instanceof Error ? e.message : 'Erro ao carregar.' }))
      }
    },
    [key],
  )

  useEffect(() => {
    void load(false)
  }, [load])

  return { ...state, reload: () => load(true) }
}
