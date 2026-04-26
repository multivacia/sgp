import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Collaborator } from '../../../domain/collaborators/collaborator.types'
import { reportClientError } from '../../../lib/errors'
import { getCollaboratorsService } from '../../../services/collaborators/collaboratorsServiceFactory'

export type NovaEsteiraResponsavelOption = {
  value: string
  label: string
}

type ReadyState = {
  status: 'ready'
  options: NovaEsteiraResponsavelOption[]
  empty: boolean
}

export type NovaEsteiraResponsaveisOptionsState = ReadyState | { status: 'loading' } | { status: 'error'; message: string }

function collaboratorToOption(c: Collaborator): NovaEsteiraResponsavelOption {
  return { value: c.id, label: c.fullName }
}

/**
 * Lista ativa de colaboradores para o select Responsável / Gestor (Nova Esteira),
 * via {@link getCollaboratorsService} — respeita mock / real / auto.
 * Inclui o selecionado atual se estiver inativo ou fora da lista (rascunho legado).
 */
export function useNovaEsteiraResponsaveisOptions(params: {
  /** Sincroniza quando o repositório mock muta (Colaboradores operacionais). */
  mockStoreVersion: number
  /** Inclui na lista se não vier em `list` ativo (ex.: inativado). */
  selectedCollaboratorId: string | undefined
  /** Se o id não existir mais na API, exibe este nome no combo. */
  fallbackNameForUnknownId: string | undefined
}): NovaEsteiraResponsaveisOptionsState & { reload: () => Promise<void> } {
  const { mockStoreVersion, selectedCollaboratorId, fallbackNameForUnknownId } =
    params

  const [state, setState] = useState<NovaEsteiraResponsaveisOptionsState>({
    status: 'loading',
  })

  const load = useCallback(async () => {
    setState({ status: 'loading' })
    const svc = getCollaboratorsService()
    try {
      const active = await svc.listCollaborators({ status: 'active' })
      const merged = new Map<string, Collaborator>()
      for (const c of active) merged.set(c.id, c)

      const sel = selectedCollaboratorId?.trim()
      if (sel && !merged.has(sel)) {
        const one = await svc.getCollaborator(sel)
        if (one) merged.set(one.id, one)
        else {
          const fallback = fallbackNameForUnknownId?.trim()
          merged.set(sel, {
            id: sel,
            fullName: fallback || 'Responsável (cadastro indisponível)',
            status: 'inactive',
          })
        }
      }

      const options = [...merged.values()]
        .sort((a, b) =>
          a.fullName.localeCompare(b.fullName, 'pt-BR', { sensitivity: 'base' }),
        )
        .map(collaboratorToOption)

      setState({
        status: 'ready',
        options,
        empty: options.length === 0,
      })
    } catch (e) {
      const n = reportClientError(e, {
        module: 'esteiras',
        action: 'nova_esteira_responsaveis_options',
        route:
          typeof window !== 'undefined' ? window.location.pathname : undefined,
      })
      setState({ status: 'error', message: n.userMessage })
    }
  }, [mockStoreVersion, selectedCollaboratorId, fallbackNameForUnknownId])

  useEffect(() => {
    void load()
  }, [load])

  return useMemo(
    () => ({
      ...state,
      reload: load,
    }),
    [state, load],
  )
}
