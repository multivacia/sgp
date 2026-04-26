import { prazoEstimadoFormatoAceito } from '../../../../mocks/nova-esteira-dados-validacao'
import type { NovaEsteiraDadosIniciais } from '../../../../mocks/nova-esteira-submit'

type Props = {
  dados: NovaEsteiraDadosIniciais
  disabled?: boolean
  onAjustarDados: () => void
}

function Field({
  label,
  value,
  warnEmpty,
  invalid,
}: {
  label: string
  value: string
  warnEmpty?: boolean
  invalid?: boolean
}) {
  const empty = !value.trim()
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-1 text-sm ${
          invalid
            ? 'text-amber-200/95'
            : empty && warnEmpty
              ? 'text-amber-200/95'
              : 'text-slate-100'
        }`}
      >
        {empty ? 'Não informado' : value}
      </dd>
    </div>
  )
}

export function NovaEsteiraReviewDadosIniciais({
  dados,
  disabled,
  onAjustarDados,
}: Props) {
  const nomeOk = dados.nome.trim().length > 0
  const prazoOk =
    !dados.prazoEstimado.trim() || prazoEstimadoFormatoAceito(dados.prazoEstimado)

  return (
    <section
      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 ring-1 ring-white/[0.05]"
      aria-labelledby="review-dados-iniciais"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3
            id="review-dados-iniciais"
            className="font-heading text-base font-bold text-slate-100"
          >
            Dados iniciais
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Identificação e contexto do pedido. Ajuste na etapa anterior se algo estiver
            incorreto.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onAjustarDados}
          className="sgp-cta-secondary shrink-0 self-start text-sm"
        >
          Ajustar dados iniciais
        </button>
      </div>

      <dl className="mt-5 grid gap-4 border-t border-white/[0.06] pt-5 sm:grid-cols-2">
        <Field label="Nome / identificação da esteira" value={dados.nome} warnEmpty />
        <Field label="Cliente" value={dados.cliente} />
        <Field label="Veículo" value={dados.veiculo} />
        <Field label="Modelo / versão" value={dados.modeloVersao} />
        <Field label="Placa" value={dados.placa} />
        <Field
          label="Prazo estimado"
          value={dados.prazoEstimado}
          warnEmpty={false}
          invalid={!prazoOk}
        />
        <Field label="Observações" value={dados.observacoes} />
      </dl>
      {!nomeOk ? (
        <p className="mt-4 text-sm font-medium text-amber-200/95">
          O nome da esteira é obrigatório para registrar — volte aos dados iniciais.
        </p>
      ) : null}
      {nomeOk && !prazoOk ? (
        <p className="mt-4 text-sm font-medium text-amber-200/95">
          Prazo estimado deve ser numérico (ex.: dias) ou deixe em branco — ajuste nos
          dados iniciais.
        </p>
      ) : null}
    </section>
  )
}
