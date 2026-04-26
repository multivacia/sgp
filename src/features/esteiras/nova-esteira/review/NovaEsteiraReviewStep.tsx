import { getBaseEsteira } from '../../../../mocks/bases-esteira-catalog'
import type { NovaEsteiraResumoLeitura } from '../../../../mocks/nova-esteira-jornada-draft'
import type { NovaEsteiraOpcaoDraft } from '../../../../mocks/nova-esteira-jornada-draft'
import type { NovaEsteiraDadosIniciais } from '../../../../mocks/nova-esteira-submit'
import type { NovaEsteiraEstruturaOrigem } from '../../../../mocks/nova-esteira-domain'
import { NovaEsteiraReviewDadosIniciais } from './NovaEsteiraReviewDadosIniciais'
import { NovaEsteiraReviewEstrutura } from './NovaEsteiraReviewEstrutura'
import { NovaEsteiraReviewHeader } from './NovaEsteiraReviewHeader'
import { NovaEsteiraReviewOrigem } from './NovaEsteiraReviewOrigem'
import { NovaEsteiraReviewPendencias } from './NovaEsteiraReviewPendencias'
import { NovaEsteiraReviewRegisterActions } from './NovaEsteiraReviewRegisterActions'

type Props = {
  dados: NovaEsteiraDadosIniciais
  estruturaOrigem: NovaEsteiraEstruturaOrigem | null
  baseEsteiraAplicadaId: string | null
  opcoes: NovaEsteiraOpcaoDraft[]
  resumoLeitura: NovaEsteiraResumoLeitura
  bloqueios: { podeRegistrar: boolean }
  disabled?: boolean
  submitting?: boolean
  motivoBloqueioCurto: string
  onAjustarDados: () => void
  onAjustarMontagem: () => void
  onCriarBacklog: () => void
  onCriarExecucao: () => void
}

export function NovaEsteiraReviewStep({
  dados,
  estruturaOrigem,
  baseEsteiraAplicadaId,
  opcoes,
  resumoLeitura,
  bloqueios,
  disabled,
  submitting,
  motivoBloqueioCurto,
  onAjustarDados,
  onAjustarMontagem,
  onCriarBacklog,
  onCriarExecucao,
}: Props) {
  const veioDeBase =
    estruturaOrigem === 'BASE_ESTEIRA' && Boolean(baseEsteiraAplicadaId)
  const baseCatalog =
    veioDeBase && baseEsteiraAplicadaId
      ? getBaseEsteira(baseEsteiraAplicadaId) ?? null
      : null

  return (
    <div className="space-y-8">
      <NovaEsteiraReviewHeader
        dados={dados}
        estruturaOrigem={estruturaOrigem}
        veioDeBaseCatalogo={veioDeBase}
        prontidao={bloqueios.podeRegistrar ? 'pronta' : 'incompleta'}
      />

      <NovaEsteiraReviewDadosIniciais
        dados={dados}
        disabled={disabled}
        onAjustarDados={onAjustarDados}
      />

      <NovaEsteiraReviewEstrutura
        opcoes={opcoes}
        disabled={disabled}
        onAjustarMontagem={onAjustarMontagem}
      />

      <NovaEsteiraReviewOrigem
        estruturaOrigem={estruturaOrigem}
        baseCatalog={baseCatalog}
        veioDeBase={veioDeBase}
      />

      <NovaEsteiraReviewPendencias
        resumo={resumoLeitura}
        podeRegistrar={bloqueios.podeRegistrar}
      />

      <NovaEsteiraReviewRegisterActions
        disabled={disabled}
        submitting={submitting}
        podeRegistrar={bloqueios.podeRegistrar}
        motivoBloqueioCurto={motivoBloqueioCurto}
        onCriarBacklog={onCriarBacklog}
        onCriarExecucao={onCriarExecucao}
      />
    </div>
  )
}
