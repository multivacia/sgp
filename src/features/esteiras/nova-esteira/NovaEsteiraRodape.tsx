import { MSG_RODAPE } from '../../../mocks/nova-esteira-mensagens'
import type { NovaEsteiraEtapaPersistida } from '../../../mocks/nova-esteira-persistido'

type Props = {
  etapa: NovaEsteiraEtapaPersistida
  onCancel: () => void
  onSalvarRascunho: () => void
  onAvancarDadosParaEstrutura: () => void
  onAvancarEstruturaParaRevisao: () => void
  onVoltarParaDados: () => void
  onVoltarParaEstrutura: () => void
  onCriarBacklog: () => void
  onCriarExecucao: () => void
  disabled?: boolean
  submitting?: boolean
  podeSeguirParaCriacao: boolean
  podeAvancarDadosParaEstrutura: boolean
  podeAvancarEstruturaParaRevisao: boolean
  hintDados: string
  hintMontagem: string
  hintRevisao: string
  motivoBloqueioCurto: string
  motivoBloqueioAvancoDados: string
}

export function NovaEsteiraRodape({
  etapa,
  onCancel,
  onSalvarRascunho,
  onAvancarDadosParaEstrutura,
  onAvancarEstruturaParaRevisao,
  onVoltarParaDados,
  onVoltarParaEstrutura,
  onCriarBacklog,
  onCriarExecucao,
  disabled,
  submitting,
  podeSeguirParaCriacao,
  podeAvancarDadosParaEstrutura,
  podeAvancarEstruturaParaRevisao,
  hintDados,
  hintMontagem,
  hintRevisao,
  motivoBloqueioCurto,
  motivoBloqueioAvancoDados,
}: Props) {
  const block = disabled || submitting
  const hintId = 'nova-esteira-hint-rodape'

  if (etapa === 'revisao') {
    const criarBloqueado = block || !podeSeguirParaCriacao
    const ariaCriar =
      !criarBloqueado
        ? 'Confirmar criação da esteira no mock'
        : submitting
          ? 'Aguarde o registro terminar'
          : !podeSeguirParaCriacao
            ? `Criação indisponível: ${motivoBloqueioCurto}`
            : 'Ação indisponível'

    return (
      <footer className="sticky bottom-0 z-10 mt-8 border-t border-white/[0.08] bg-sgp-app-bg/92 py-4 backdrop-blur-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <button
            type="button"
            disabled={block}
            onClick={onVoltarParaEstrutura}
            className="sgp-cta-secondary w-full sm:w-auto sm:max-w-[16rem]"
            aria-label="Voltar à etapa de estrutura e montagem"
          >
            Voltar à montagem
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-xl sm:items-end">
            <p
              id={hintId}
              className="w-full text-left text-[11px] leading-snug text-slate-400 sm:text-right"
            >
              {hintRevisao}
            </p>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={criarBloqueado}
                onClick={onCriarBacklog}
                className="sgp-cta-secondary w-full disabled:pointer-events-none disabled:opacity-45 sm:w-auto"
                aria-disabled={criarBloqueado}
                aria-label={`${MSG_RODAPE.ctaCriarBacklog}. ${ariaCriar}`}
              >
                {submitting ? 'Registrando…' : MSG_RODAPE.ctaCriarBacklog}
              </button>
              <button
                type="button"
                disabled={criarBloqueado}
                onClick={onCriarExecucao}
                className="sgp-cta-primary w-full disabled:pointer-events-none disabled:opacity-45 sm:w-auto"
                aria-disabled={criarBloqueado}
                aria-label={`${MSG_RODAPE.ctaCriarExecucao}. ${ariaCriar}`}
              >
                {submitting ? 'Registrando…' : MSG_RODAPE.ctaCriarExecucao}
              </button>
            </div>
          </div>
        </div>
      </footer>
    )
  }

  if (etapa === 'estrutura_montagem') {
    const avancoBloqueado = block || !podeAvancarEstruturaParaRevisao
    const ariaAvanco = avancoBloqueado
      ? `Continuar para revisão — indisponível: ${motivoBloqueioCurto}`
      : `Continuar para revisão. ${hintMontagem}`

    return (
      <footer className="sticky bottom-0 z-10 mt-8 border-t border-white/[0.08] bg-sgp-app-bg/92 py-4 backdrop-blur-md">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={block}
              onClick={onCancel}
              className="sgp-cta-secondary"
              aria-label="Cancelar e voltar ao backlog"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={block}
              onClick={onSalvarRascunho}
              className="rounded-xl border border-white/14 bg-white/[0.05] px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-sgp-gold/35 hover:text-white"
              aria-label="Salvar rascunho em memória"
            >
              Salvar rascunho
            </button>
            <button
              type="button"
              disabled={block}
              onClick={onVoltarParaDados}
              className="rounded-xl border border-white/14 bg-white/[0.04] px-4 py-2.5 text-sm font-bold text-slate-300 transition hover:border-white/25 hover:text-white"
              aria-label="Voltar aos dados iniciais"
            >
              Voltar aos dados
            </button>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md sm:items-end">
            <p
              id={hintId}
              className="w-full text-[11px] leading-snug text-slate-400 sm:text-right"
            >
              {hintMontagem}
            </p>
            <button
              type="button"
              disabled={avancoBloqueado}
              onClick={onAvancarEstruturaParaRevisao}
              className="sgp-cta-primary w-full disabled:pointer-events-none disabled:opacity-45 sm:w-auto"
              aria-disabled={avancoBloqueado}
              aria-describedby={avancoBloqueado ? hintId : undefined}
              aria-label={ariaAvanco}
            >
              Continuar para revisão
            </button>
          </div>
        </div>
      </footer>
    )
  }

  const avancoDadosBloqueado = block || !podeAvancarDadosParaEstrutura
  const ariaDados = avancoDadosBloqueado
    ? `Avançar para montagem — indisponível: ${motivoBloqueioAvancoDados}`
    : `Avançar para estrutura e montagem. ${hintDados}`

  return (
    <footer className="sticky bottom-0 z-10 mt-8 border-t border-white/[0.08] bg-sgp-app-bg/92 py-4 backdrop-blur-md">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={block}
            onClick={onCancel}
            className="sgp-cta-secondary"
            aria-label="Cancelar e voltar ao backlog"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={block}
            onClick={onSalvarRascunho}
            className="rounded-xl border border-white/14 bg-white/[0.05] px-4 py-2.5 text-sm font-bold text-slate-200 transition hover:border-sgp-gold/35 hover:text-white"
            aria-label="Salvar rascunho em memória"
          >
            Salvar rascunho
          </button>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:max-w-md sm:items-end">
          <p
            id={hintId}
            className="w-full text-[11px] leading-snug text-slate-400 sm:text-right"
          >
            {hintDados}
          </p>
          <button
            type="button"
            disabled={avancoDadosBloqueado}
            onClick={onAvancarDadosParaEstrutura}
            className="sgp-cta-primary w-full disabled:pointer-events-none disabled:opacity-45 sm:w-auto"
            aria-disabled={avancoDadosBloqueado}
            aria-describedby={avancoDadosBloqueado ? hintId : undefined}
            aria-label={ariaDados}
          >
            Avançar para estrutura e montagem
          </button>
        </div>
      </div>
    </footer>
  )
}
