import type { NovaEsteiraMontagem } from '../../../mocks/nova-esteira-bloco-contrato'
import type { NovaEsteiraBloqueiosJornada } from '../../../mocks/nova-esteira-jornada-draft'
import { getMotivoPrincipalDeBloqueio } from '../../../mocks/nova-esteira-estado-visual'
import type { NovaEsteiraEtapaPersistida } from '../../../mocks/nova-esteira-persistido'
type Props = {
  etapa: NovaEsteiraEtapaPersistida
  montagem: NovaEsteiraMontagem
  bloqueios: NovaEsteiraBloqueiosJornada
  submitting?: boolean
}

function Step({
  n,
  title,
  subtitle,
  state,
}: {
  n: number
  title: string
  subtitle: string
  state: 'ativo' | 'concluido' | 'bloqueado' | 'pendente'
}) {
  const ring =
    state === 'ativo'
      ? 'border-sgp-gold/40 bg-white/[0.06] ring-1 ring-sgp-gold/25'
      : state === 'concluido'
        ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
        : state === 'bloqueado'
          ? 'border-white/[0.05] bg-white/[0.01] opacity-55'
          : 'border-white/[0.08] bg-white/[0.02]'

  const badge =
    state === 'ativo'
      ? 'bg-sgp-gold/25 text-sgp-gold'
      : state === 'concluido'
        ? 'bg-emerald-500/20 text-emerald-200'
        : state === 'bloqueado'
          ? 'bg-white/[0.05] text-slate-600'
          : 'bg-white/[0.08] text-slate-500'

  const titleCls =
    state === 'ativo'
      ? 'text-slate-50'
      : state === 'concluido'
        ? 'text-slate-200'
        : 'text-slate-500'

  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-1 rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 ${ring}`}>
      <div className="flex items-center gap-2">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${badge}`}
          aria-hidden
        >
          {n}
        </span>
        <span className={`truncate font-heading text-sm font-bold ${titleCls}`}>{title}</span>
      </div>
      <p className="pl-8 text-[11px] leading-snug text-slate-500 sm:text-xs">{subtitle}</p>
    </div>
  )
}

export function NovaEsteiraJornadaEtapa({
  etapa,
  montagem,
  bloqueios,
  submitting,
}: Props) {
  const idx =
    etapa === 'dados_iniciais' ? 0 : etapa === 'estrutura_montagem' ? 1 : 2

  const impeditivoNome =
    !bloqueios.dadosIniciaisOk && idx === 0
      ? 'Informe o nome / identificação da esteira para avançar.'
      : ''

  const proximo =
    etapa === 'dados_iniciais'
      ? impeditivoNome ||
        (bloqueios.podeIrParaEstrutura
          ? 'Próximo: estrutura e montagem operacional.'
          : 'Complete o gate de identificação.')
      : etapa === 'estrutura_montagem'
        ? montagem.podeMaterializar
          ? 'Próximo passo: abrir a revisão operacional.'
          : `Ainda não dá para revisar — ${getMotivoPrincipalDeBloqueio(montagem)}`
        : montagem.podeMaterializar
          ? 'Próximo passo: criar no backlog ou liberar execução (rodapé).'
          : `Criação bloqueada — ${getMotivoPrincipalDeBloqueio(montagem)}`

  const s1: 'ativo' | 'concluido' | 'bloqueado' | 'pendente' =
    idx === 0 ? 'ativo' : 'concluido'
  const s2: 'ativo' | 'concluido' | 'bloqueado' | 'pendente' =
    idx === 0 ? 'bloqueado' : idx === 1 ? 'ativo' : 'concluido'
  const s3: 'ativo' | 'concluido' | 'bloqueado' | 'pendente' =
    idx < 2 ? 'bloqueado' : 'ativo'

  return (
    <section
      className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 ring-1 ring-white/[0.04] sm:p-5"
      aria-label="Etapas da Nova Esteira"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Jornada
          </p>
          <p className="mt-1 font-heading text-sm font-bold text-slate-100 sm:text-base">
            {etapa === 'dados_iniciais'
              ? 'Dados iniciais'
              : etapa === 'estrutura_montagem'
                ? 'Estrutura e montagem operacional'
                : 'Revisão'}
          </p>
        </div>
        <p
          className="max-w-full text-[11px] leading-relaxed text-slate-400 sm:max-w-md sm:text-right sm:text-xs"
          role="status"
          aria-live="polite"
        >
          {submitting ? 'Registrando…' : proximo}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <Step
          n={1}
          title="Dados iniciais"
          subtitle="Identificação, veículo e contexto"
          state={s1}
        />
        <div
          className="hidden h-px w-full shrink-0 self-center sm:block sm:h-auto sm:w-px sm:bg-white/[0.1]"
          aria-hidden
        />
        <Step
          n={2}
          title="Estrutura e montagem"
          subtitle="Base ou montagem operacional unificada"
          state={s2}
        />
        <div
          className="hidden h-px w-full shrink-0 self-center sm:block sm:h-auto sm:w-px sm:bg-white/[0.1]"
          aria-hidden
        />
        <Step
          n={3}
          title="Revisão"
          subtitle="Conferência pré-registro"
          state={s3}
        />
      </div>
    </section>
  )
}
