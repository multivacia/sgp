import { useMemo, useState } from 'react'
import type { NovaEsteiraCenarioId } from '../../../mocks/nova-esteira-cenarios-mock'
import { listCenariosNovaEsteiraMock } from '../../../mocks/nova-esteira-cenarios-mock'
import type { NovaEsteiraRascunhoPersistido } from '../../../mocks/nova-esteira-persistido'

type Props = {
  persistedId: string | null
  registroAtual: NovaEsteiraRascunhoPersistido | null
  rascunhosRecentes: NovaEsteiraRascunhoPersistido[]
  disabled: boolean
  onSalvar: () => void
  onNovoEmBranco: () => void
  onIniciarCenario: (id: NovaEsteiraCenarioId) => void
  onRetomar: (id: string) => void
  onDuplicarAtual: () => void
  onArquivarAtual: () => void
}

export function NovaEsteiraPersistenciaBar({
  persistedId,
  registroAtual,
  rascunhosRecentes,
  disabled,
  onSalvar,
  onNovoEmBranco,
  onIniciarCenario,
  onRetomar,
  onDuplicarAtual,
  onArquivarAtual,
}: Props) {
  const [aberto, setAberto] = useState(false)
  const cenarios = useMemo(() => listCenariosNovaEsteiraMock(), [])

  const titulo =
    registroAtual?.nomeRascunho?.trim() ||
    registroAtual?.lastSnapshot.nomeExibicao ||
    'Montagem sem rascunho salvo'

  return (
    <div className="max-w-5xl rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 ring-1 ring-white/[0.05]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Rascunho local
          </p>
          <p className="truncate text-sm font-medium text-slate-200" title={titulo}>
            {persistedId
              ? titulo
              : 'Sem rascunho salvo — use “Salvar rascunho” para retomar depois.'}
          </p>
          {registroAtual && (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {registroAtual.lastSnapshot.resumoComposicaoCurto}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={onSalvar}
            className="sgp-cta-secondary px-3 py-1.5 text-xs"
          >
            Salvar rascunho
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onNovoEmBranco}
            className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.07]"
          >
            Novo em branco
          </button>
          {persistedId && (
            <>
              <button
                type="button"
                disabled={disabled}
                onClick={onDuplicarAtual}
                className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.07]"
              >
                Duplicar
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={onArquivarAtual}
                className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200/90 hover:bg-rose-500/15"
              >
                Arquivar
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="rounded-lg border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/[0.07]"
          >
            {aberto ? 'Fechar' : 'Cenário / retomar'}
          </button>
        </div>
      </div>
      {aberto && (
        <div className="mt-4 space-y-4 border-t border-white/[0.06] pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Cenários de exemplo (mock)
            </p>
            <div className="mt-2 flex max-h-32 flex-wrap gap-2 overflow-y-auto">
              {cenarios.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onIniciarCenario(c.id)
                    setAberto(false)
                  }}
                  className="max-w-[200px] truncate rounded-lg border border-white/[0.1] bg-white/[0.03] px-2.5 py-1 text-left text-[11px] text-slate-300 hover:bg-white/[0.06]"
                  title={c.descricao}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Retomar
            </p>
            {rascunhosRecentes.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">
                Nenhum rascunho neste navegador ainda.
              </p>
            ) : (
              <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto">
                {rascunhosRecentes.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      disabled={disabled || r.id === persistedId}
                      onClick={() => {
                        onRetomar(r.id)
                        setAberto(false)
                      }}
                      className="w-full truncate rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-white/[0.05] disabled:opacity-40"
                    >
                      <span className="font-medium">{r.nomeRascunho}</span>
                      <span className="ml-2 text-slate-500">
                        {r.lastSnapshot.statusGeralComposicao} ·{' '}
                        {new Date(r.updatedAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
