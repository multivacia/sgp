import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import type { NovaEsteiraDadosIniciais } from '../../../mocks/nova-esteira-submit'
import type { BacklogPriority } from '../../../mocks/backlog'
import {
  getColaboradoresVersion,
  subscribeColaboradores,
} from '../../../mocks/colaboradores-operacionais'
import { prazoEstimadoFormatoAceito } from '../../../mocks/nova-esteira-dados-validacao'
import { useNovaEsteiraResponsaveisOptions } from './useNovaEsteiraResponsaveisOptions'

type Props = {
  dados: NovaEsteiraDadosIniciais
  onChange: (patch: Partial<NovaEsteiraDadosIniciais>) => void
  disabled?: boolean
}

export function NovaEsteiraDadosIniciais({
  dados,
  onChange,
  disabled,
}: Props) {
  const mockStoreVersion = useSyncExternalStore(
    subscribeColaboradores,
    getColaboradoresVersion,
    getColaboradoresVersion,
  )

  const responsaveis = useNovaEsteiraResponsaveisOptions({
    mockStoreVersion,
    selectedCollaboratorId: dados.colaboradorId,
    fallbackNameForUnknownId: dados.responsavel,
  })

  const selectValue = useMemo(() => {
    if (responsaveis.status !== 'ready') return ''
    const options = responsaveis.options
    const id = dados.colaboradorId?.trim()
    if (id && options.some((o) => o.value === id)) return id
    const name = dados.responsavel?.trim()
    if (name) {
      const byLabel = options.find((o) => o.label === name)
      if (byLabel) return byLabel.value
    }
    return ''
  }, [responsaveis, dados.colaboradorId, dados.responsavel])

  const legacySynced = useRef(false)
  useEffect(() => {
    if (responsaveis.status !== 'ready' || legacySynced.current) return
    if (dados.colaboradorId?.trim()) {
      legacySynced.current = true
      return
    }
    const name = dados.responsavel?.trim()
    if (!name) {
      legacySynced.current = true
      return
    }
    const m = responsaveis.options.find((o) => o.label === name)
    legacySynced.current = true
    if (m) {
      onChange({ colaboradorId: m.value, responsavel: m.label })
    }
  }, [responsaveis, dados.colaboradorId, dados.responsavel, onChange])

  const selectDisabled =
    Boolean(disabled) ||
    responsaveis.status === 'loading' ||
    responsaveis.status === 'error'

  const prazoInvalido =
    dados.prazoEstimado.trim().length > 0 &&
    !prazoEstimadoFormatoAceito(dados.prazoEstimado)

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-bold text-slate-100">
          Dados iniciais
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Identifique a esteira e o contexto do veículo antes de montar a
          estrutura.
        </p>
      </div>
      <div className="sgp-panel sgp-panel-hover !p-6 md:!p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Nome / identificação da esteira
            </label>
            <input
              value={dados.nome}
              disabled={disabled}
              onChange={(e) => onChange({ nome: e.target.value })}
              className="sgp-input-app w-full px-3 py-2.5 text-sm"
              placeholder="Ex.: Reforma bancos — cliente Alfa"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cliente
            </label>
            <input
              value={dados.cliente}
              disabled={disabled}
              onChange={(e) => onChange({ cliente: e.target.value })}
              className="sgp-input-app w-full px-3 py-2.5 text-sm"
              placeholder="Nome ou razão social"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Veículo
            </label>
            <input
              value={dados.veiculo}
              disabled={disabled}
              onChange={(e) => onChange({ veiculo: e.target.value })}
              className="sgp-input-app w-full px-3 py-2.5 text-sm"
              placeholder="Ex.: Gol, Civic…"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Modelo / versão
            </label>
            <input
              value={dados.modeloVersao}
              disabled={disabled}
              onChange={(e) => onChange({ modeloVersao: e.target.value })}
              className="sgp-input-app w-full px-3 py-2.5 text-sm"
              placeholder="Ex.: 1.0 · 4 portas"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Placa
            </label>
            <input
              value={dados.placa}
              disabled={disabled}
              onChange={(e) => onChange({ placa: e.target.value })}
              className="sgp-input-app w-full px-3 py-2.5 text-sm font-mono uppercase"
              placeholder="ABC1D23"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Responsável / gestor
            </label>
            <select
              value={selectValue}
              disabled={selectDisabled}
              onChange={(e) => {
                const id = e.target.value
                if (!id) {
                  onChange({ responsavel: '', colaboradorId: undefined })
                  return
                }
                if (responsaveis.status !== 'ready') return
                const opt = responsaveis.options.find((o) => o.value === id)
                onChange({
                  colaboradorId: id,
                  responsavel: opt?.label ?? '',
                })
              }}
              className="sgp-input-app w-full px-3 py-2.5 text-sm"
              aria-busy={responsaveis.status === 'loading'}
            >
              <option value="">
                {responsaveis.status === 'loading'
                  ? 'Carregando responsáveis…'
                  : 'Selecione um responsável'}
              </option>
              {responsaveis.status === 'ready' &&
                responsaveis.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </select>
            {responsaveis.status === 'loading' ? (
              <p className="mt-1.5 text-xs text-slate-500">
                Carregando responsáveis…
              </p>
            ) : null}
            {responsaveis.status === 'ready' && responsaveis.empty ? (
              <p className="mt-1.5 text-xs text-slate-400">
                Nenhum colaborador disponível.
              </p>
            ) : null}
            {responsaveis.status === 'error' ? (
              <div className="mt-1.5 space-y-2">
                <p className="text-xs text-amber-200/95">{responsaveis.message}</p>
                <button
                  type="button"
                  className="text-xs font-semibold text-sgp-gold underline-offset-2 hover:underline"
                  onClick={() => void responsaveis.reload()}
                >
                  Tentar novamente
                </button>
              </div>
            ) : null}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Prazo estimado
            </label>
            <input
              value={dados.prazoEstimado}
              disabled={disabled}
              onChange={(e) => onChange({ prazoEstimado: e.target.value })}
              aria-invalid={prazoInvalido}
              className={`sgp-input-app w-full px-3 py-2.5 text-sm ${
                prazoInvalido ? 'ring-1 ring-amber-500/50' : ''
              }`}
              placeholder="Ex.: 10 (dias) — apenas número ou deixe em branco"
            />
            {prazoInvalido ? (
              <p className="mt-1.5 text-xs text-amber-200/95">
                Use apenas valor numérico (dias) ou deixe em branco.
              </p>
            ) : null}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Prioridade
            </label>
            <select
              value={dados.prioridade}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  prioridade: e.target.value as BacklogPriority | '',
                })
              }
              className="sgp-input-app w-full px-3 py-2.5 text-sm"
            >
              <option value="">Sem prioridade definida</option>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Observações iniciais
            </label>
            <textarea
              value={dados.observacoes}
              disabled={disabled}
              onChange={(e) => onChange({ observacoes: e.target.value })}
              rows={3}
              className="sgp-input-app w-full resize-y px-3 py-2.5 text-sm"
              placeholder="Instruções gerais para o chão de fábrica…"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
