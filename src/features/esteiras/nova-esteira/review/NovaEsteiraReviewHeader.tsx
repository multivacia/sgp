import type { NovaEsteiraDadosIniciais } from '../../../../mocks/nova-esteira-submit'
import type { NovaEsteiraEstruturaOrigem } from '../../../../mocks/nova-esteira-domain'

export type NovaEsteiraReviewProntidaoLabel = 'pronta' | 'incompleta'

type Props = {
  dados: NovaEsteiraDadosIniciais
  estruturaOrigem: NovaEsteiraEstruturaOrigem | null
  veioDeBaseCatalogo: boolean
  prontidao: NovaEsteiraReviewProntidaoLabel
}

function labelOrigemEstrutura(
  estruturaOrigem: NovaEsteiraEstruturaOrigem | null,
  veioDeBase: boolean,
): string {
  if (veioDeBase) return 'Base de Esteira'
  if (estruturaOrigem === 'MONTAGEM_UNIFICADA') return 'Montagem operacional'
  return '—'
}

function badgeProntidao(p: NovaEsteiraReviewProntidaoLabel) {
  if (p === 'pronta') {
    return {
      text: 'Pronta para registrar',
      className:
        'bg-emerald-500/18 text-emerald-100 ring-1 ring-emerald-500/30',
    }
  }
  return {
    text: 'Incompleta',
    className: 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-500/25',
  }
}

export function NovaEsteiraReviewHeader({
  dados,
  estruturaOrigem,
  veioDeBaseCatalogo,
  prontidao,
}: Props) {
  const b = badgeProntidao(prontidao)
  const origem = labelOrigemEstrutura(estruturaOrigem, veioDeBaseCatalogo)

  return (
    <section
      className="rounded-2xl border border-sgp-gold/25 bg-gradient-to-br from-sgp-gold/[0.09] to-transparent p-5 ring-1 ring-sgp-gold/15 sm:p-6"
      aria-labelledby="nova-esteira-review-executivo"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p
            id="nova-esteira-review-executivo"
            className="text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold"
          >
            Conferência final
          </p>
          <h2 className="mt-2 font-heading text-xl font-bold text-slate-50">
            {dados.nome.trim() || '—'}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {[dados.cliente, dados.veiculo, dados.modeloVersao, dados.placa]
              .filter(Boolean)
              .join(' · ') || 'Preencha cliente e veículo na etapa anterior se necessário.'}
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-bold ${b.className}`}
        >
          {b.text}
        </span>
      </div>

      <dl className="mt-6 grid gap-4 border-t border-white/[0.08] pt-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Responsável
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-100">
            {dados.responsavel.trim() || '—'}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Prioridade
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-100">
            {dados.prioridade
              ? String(dados.prioridade).replace(/_/g, ' ')
              : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Prazo estimado
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-100">
            {dados.prazoEstimado.trim() || '—'}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Origem da estrutura
          </dt>
          <dd className="mt-1 text-sm font-medium text-slate-100">{origem}</dd>
        </div>
      </dl>
    </section>
  )
}
