import { formatMinutosHumanos } from '../../../lib/formatters'
import { listBasesTarefa } from '../../../mocks/bases-tarefa-catalog'
import { humanizarResumoLinhaBloco } from '../../../mocks/nova-esteira-materialize'
import {
  computeResumoDrafts,
  labelEstruturaOrigem,
  type LinhaBlocoOperacionalDraft,
  type NovaEsteiraEstruturaOrigem,
} from '../../../mocks/nova-esteira-domain'
import {
  classesBadgeEstadoVisual,
  getEstadoVisualDaMontagem,
  getMotivoPrincipalDeBloqueio,
  LABEL_ESTADO_VISUAL,
} from '../../../mocks/nova-esteira-estado-visual'
import { humanizarResumoComposicao } from '../../../mocks/nova-esteira-humanizacao'
import type { SnapshotComposicaoMontagem } from '../../../mocks/nova-esteira-composicao'
import type { NovaEsteiraDadosIniciais } from '../../../mocks/nova-esteira-submit'

type Resumo = ReturnType<typeof computeResumoDrafts>

type Props = {
  dados: NovaEsteiraDadosIniciais
  estruturaOrigem: NovaEsteiraEstruturaOrigem | null
  resumo: Resumo
  composicaoSnapshot?: SnapshotComposicaoMontagem
  linhasManual?: LinhaBlocoOperacionalDraft[]
}

function BlocoLinha({
  nome,
  detalhe,
  tone,
}: {
  nome: string
  detalhe: string
  tone: 'ok' | 'aviso' | 'erro'
}) {
  const ring =
    tone === 'ok'
      ? 'border-white/[0.06] bg-white/[0.03]'
      : tone === 'erro'
        ? 'border-rose-500/25 bg-rose-500/[0.05]'
        : 'border-amber-500/22 bg-amber-500/[0.05]'
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm leading-snug ${ring}`}
    >
      <span className="font-medium text-slate-100">{nome}</span>
      {detalhe ? (
        <span className="mt-0.5 block text-xs text-slate-400">{detalhe}</span>
      ) : null}
    </div>
  )
}

export function NovaEsteiraPreviewFinal({
  dados,
  estruturaOrigem,
  resumo,
  composicaoSnapshot,
  linhasManual,
}: Props) {
  const refs = listBasesTarefa()
  const nomeOk = dados.nome.trim().length > 0
  const montagem = composicaoSnapshot?.resultado.montagem
  const estadoVisual = montagem
    ? getEstadoVisualDaMontagem(montagem, 'estrutura_montagem')
    : null
  const showBlocosManual =
    (estruturaOrigem === 'MANUAL' || estruturaOrigem === 'MONTAGEM_UNIFICADA') &&
    linhasManual &&
    linhasManual.length > 0
  const motivoPrincipal =
    montagem && !montagem.podeMaterializar
      ? getMotivoPrincipalDeBloqueio(montagem)
      : null

  return (
    <section className="space-y-4" aria-labelledby="preview-montagem-heading">
      <div>
        <h2
          id="preview-montagem-heading"
          className="font-heading text-base font-bold text-slate-100"
        >
          Leitura da montagem
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          O que já está definido e o que ainda trava o avanço — a revisão formal vem no
          passo seguinte.
        </p>
      </div>

      {montagem && estadoVisual && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-500">Situação:</span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${classesBadgeEstadoVisual(estadoVisual)}`}
          >
            {LABEL_ESTADO_VISUAL[estadoVisual]}
          </span>
          {!motivoPrincipal ? (
            <span className="min-w-0 flex-1 text-[11px] leading-snug text-slate-400 sm:text-xs">
              {humanizarResumoComposicao(composicaoSnapshot!.resultado)}
            </span>
          ) : null}
        </div>
      )}

      {motivoPrincipal ? (
        <div
          className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-4 py-3 text-sm text-amber-50 ring-1 ring-amber-500/15"
          role="status"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/90">
            Principal impeditivo
          </p>
          <p className="mt-1 leading-snug">{motivoPrincipal}</p>
        </div>
      ) : null}

      {montagem &&
        (montagem.blocosIncompletos.length > 0 ||
          montagem.blocosDependentes.length > 0 ||
          montagem.blocosInvalidos.length > 0) && (
          <div className="grid gap-3 sm:grid-cols-3">
            {montagem.blocosInvalidos.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300/90">
                  Inválidos
                </p>
                <div className="mt-2 space-y-1.5">
                  {montagem.blocosInvalidos.map((b) => (
                    <BlocoLinha
                      key={b.id}
                      nome={b.nome}
                      detalhe={b.pendencias?.[0] ?? b.status}
                      tone="erro"
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {montagem.blocosIncompletos.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/85">
                  Incompletos
                </p>
                <div className="mt-2 space-y-1.5">
                  {montagem.blocosIncompletos.map((b) => (
                    <BlocoLinha
                      key={b.id}
                      nome={b.nome}
                      detalhe={b.pendencias?.[0] ?? b.status}
                      tone="aviso"
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {montagem.blocosDependentes.length > 0 ? (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/85">
                  Dependentes
                </p>
                <div className="mt-2 space-y-1.5">
                  {montagem.blocosDependentes.map((b) => (
                    <BlocoLinha
                      key={b.id}
                      nome={b.nome}
                      detalhe={b.pendencias?.[0] ?? b.status}
                      tone="aviso"
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

      <div className="rounded-2xl border border-sgp-gold/18 bg-gradient-to-b from-white/[0.035] to-transparent p-5 ring-1 ring-white/[0.05]">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Esteira
            </dt>
            <dd
              className={`mt-1 font-heading text-lg font-bold ${
                nomeOk ? 'text-slate-50' : 'text-slate-500'
              }`}
            >
              {nomeOk ? dados.nome.trim() : 'Nome ainda não definido'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Origem
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-200">
              {estruturaOrigem
                ? labelEstruturaOrigem(estruturaOrigem)
                : 'Ainda não escolhida'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Atividades (total)
            </dt>
            <dd className="mt-1 tabular-nums text-base font-semibold text-slate-100">
              {resumo.totalAtividades}
            </dd>
          </div>

          {showBlocosManual && (
            <div className="sm:col-span-2">
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Blocos no pedido
              </dt>
              <dd className="mt-2 space-y-1.5">
                {linhasManual!.map((l) => (
                  <div
                    key={l.instanceId}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm leading-snug text-slate-200"
                  >
                    {humanizarResumoLinhaBloco(l, refs)}
                  </div>
                ))}
              </dd>
            </div>
          )}

          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Blocos (estrutura)
            </dt>
            <dd className="mt-1 tabular-nums text-slate-200">{resumo.totalTarefas}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Setores envolvidos
            </dt>
            <dd className="mt-1 break-words text-sm leading-relaxed text-slate-300">
              {resumo.setores.length > 0 ? resumo.setores.join(' · ') : '—'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Tempo estimado (total)
            </dt>
            <dd className="mt-1 font-heading text-xl font-bold text-sgp-gold">
              {formatMinutosHumanos(resumo.estimativaTotalMin)}
            </dd>
          </div>
          <div className="sm:col-span-2 border-t border-white/[0.06] pt-4">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Observações para a operação
            </dt>
            <dd className="mt-1 text-sm leading-relaxed text-slate-400">
              {dados.observacoes.trim() ? (
                dados.observacoes.trim()
              ) : (
                <span className="text-slate-600">Nenhuma observação extra.</span>
              )}
            </dd>
            {(dados.cliente || dados.veiculo || dados.prazoEstimado) && (
              <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-relaxed text-slate-500">
                {dados.cliente && (
                  <span>
                    <span className="text-slate-600">Cliente:</span> {dados.cliente}
                  </span>
                )}
                {dados.veiculo && (
                  <span>
                    <span className="text-slate-600">Veículo:</span> {dados.veiculo}
                    {dados.modeloVersao ? ` (${dados.modeloVersao})` : ''}
                  </span>
                )}
                {dados.prazoEstimado && (
                  <span>
                    <span className="text-slate-600">Prazo:</span> {dados.prazoEstimado}
                  </span>
                )}
              </p>
            )}
          </div>
        </dl>
      </div>

      {montagem && montagem.blocosValidos.length > 0 && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/85">
            Blocos válidos na ordem
          </p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
            {montagem.blocosValidos.map((b) => (
              <li key={b.id} className="flex flex-col gap-0.5">
                <span className="font-medium">{b.nome}</span>
                {b.resumoOperacional ? (
                  <span className="text-xs text-slate-500">{b.resumoOperacional}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
