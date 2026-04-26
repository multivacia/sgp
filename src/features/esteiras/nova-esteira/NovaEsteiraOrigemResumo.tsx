import {
  labelEstruturaOrigem,
  type NovaEsteiraEstruturaOrigem,
} from '../../../mocks/nova-esteira-domain'

type Props = {
  origem: NovaEsteiraEstruturaOrigem | null
}

export function NovaEsteiraOrigemResumo({ origem }: Props) {
  if (!origem) return null
  return (
    <p className="text-xs text-slate-500">
      <span className="text-slate-600">Origem:</span>{' '}
      <span className="font-medium text-slate-300">
        {labelEstruturaOrigem(origem)}
      </span>
    </p>
  )
}
