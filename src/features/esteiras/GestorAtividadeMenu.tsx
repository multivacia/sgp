import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../lib/use-auth'
import { appendHistoricoRuntime } from '../../mocks/atividade-historico'
import { applyAtividadeOverride } from '../../mocks/esteira-gestao-runtime'
import type {
  AtividadePrioridade,
  AtividadeStatusDetalhe,
  EsteiraAtividadeMock,
} from '../../mocks/esteira-detalhe'
import {
  listColaboradoresParaReatribuicaoGestor,
  type ColaboradorOperacional,
} from '../../mocks/colaboradores-operacionais'

const MOTIVOS_BLOQUEIO = [
  'Veículo indisponível',
  'Aguardando material',
  'Aguardando validação',
  'Dependência anterior não concluída',
  'Ajuste de cliente pendente',
] as const

type AcaoGestor =
  | 'status'
  | 'responsavel'
  | 'prioridade'
  | 'bloqueio'
  | 'observacao'
  | null

type Props = {
  atividade: EsteiraAtividadeMock
  onToast: (msg: string) => void
}

function gestorNomeCurto(email: string | undefined): string {
  if (!email) return 'Gestor'
  const local = email.split('@')[0] ?? 'Gestor'
  return local.slice(0, 1).toUpperCase() + local.slice(1)
}

function statusLabel(s: AtividadeStatusDetalhe): string {
  const m: Record<AtividadeStatusDetalhe, string> = {
    pendente: 'Pendente',
    pronta: 'Pronta',
    em_execucao: 'Em execução',
    pausada: 'Pausada',
    concluida: 'Concluída',
    bloqueada: 'Bloqueada',
  }
  return m[s]
}

function prioridadeLabel(p: AtividadePrioridade): string {
  const m: Record<AtividadePrioridade, string> = {
    baixa: 'Baixa',
    media: 'Média',
    alta: 'Alta',
    critica: 'Crítica',
  }
  return m[p]
}

export function GestorAtividadeMenu({ atividade, onToast }: Props) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [acao, setAcao] = useState<AcaoGestor>(null)
  const [saving, setSaving] = useState(false)
  const [motivoLivre, setMotivoLivre] = useState('')
  const [obsTexto, setObsTexto] = useState(atividade.observacaoGestor ?? '')
  const ref = useRef<HTMLDivElement>(null)

  const bloqueada = atividade.status === 'bloqueada'
  const gestor = gestorNomeCurto(user?.email)

  useEffect(() => {
    if (acao === 'observacao') {
      setObsTexto(atividade.observacaoGestor ?? '')
    }
  }, [acao, atividade.observacaoGestor])

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function fecharPainel(msg?: string) {
    setAcao(null)
    setOpen(false)
    setSaving(false)
    setMotivoLivre('')
    if (msg) onToast(msg)
  }

  function patchAtividade(p: Partial<EsteiraAtividadeMock>) {
    applyAtividadeOverride(atividade.id, p)
  }

  function textoBloqueio(m: string) {
    const t = m.trim()
    if (!t) return 'Bloqueio · Aguardando definição.'
    if (t.startsWith('Bloqueio ·')) return t
    return `Bloqueio · ${t}`
  }

  function aplicarStatus(novo: AtividadeStatusDetalhe) {
    if (novo === atividade.status) {
      fecharPainel()
      return
    }
    const anterior = statusLabel(atividade.status)
    const proximo = statusLabel(novo)
    patchAtividade({
      status: novo,
      ...(novo === 'bloqueada'
        ? {
            bloqueioMotivo: textoBloqueio(
              atividade.bloqueioMotivo ?? 'Aguardando definição.',
            ),
          }
        : { bloqueioMotivo: undefined }),
    })
    appendHistoricoRuntime(atividade.id, {
      tipo: 'status_ajuste',
      label: `Status ajustado para ${proximo}`,
      usuario: gestor,
      categoria: 'gestao',
      impactoStatus: `${anterior} → ${proximo}`,
    })
    fecharPainel(`Status: ${proximo}.`)
  }

  function aplicarResponsavel(c: ColaboradorOperacional) {
    if (
      atividade.colaboradorId === c.colaboradorId &&
      atividade.responsavel === c.nome
    ) {
      fecharPainel()
      return
    }
    const de = atividade.responsavel
    patchAtividade({ responsavel: c.nome, colaboradorId: c.colaboradorId })
    appendHistoricoRuntime(atividade.id, {
      tipo: 'atribuicao',
      label: `Gestor reatribuiu a atividade de ${de} para ${c.nome}`,
      usuario: gestor,
      categoria: 'gestao',
    })
    fecharPainel(`Responsável: ${c.nome}.`)
  }

  function aplicarPrioridade(p: AtividadePrioridade) {
    if (atividade.prioridade === p) {
      fecharPainel()
      return
    }
    patchAtividade({ prioridade: p })
    appendHistoricoRuntime(atividade.id, {
      tipo: 'prioridade_ajuste',
      label: 'Prioridade da atividade ajustada',
      usuario: gestor,
      categoria: 'gestao',
      observacao: prioridadeLabel(p),
      impactoStatus: `Prioridade: ${prioridadeLabel(p).toLowerCase()}`,
    })
    fecharPainel(`Prioridade: ${prioridadeLabel(p).toLowerCase()}.`)
  }

  function registrarBloqueio(preset?: string) {
    const raw =
      (preset ?? motivoLivre.trim()) ||
      'Bloqueio operacional registrado pelo gestor.'
    const motivo = textoBloqueio(raw)
    patchAtividade({
      status: 'bloqueada',
      bloqueioMotivo: motivo,
    })
    appendHistoricoRuntime(atividade.id, {
      tipo: 'bloqueio',
      label: 'Bloqueio registrado',
      usuario: gestor,
      categoria: 'gestao',
      observacao: motivo,
      impactoStatus: 'Bloqueada',
    })
    fecharPainel('Atividade bloqueada.')
  }

  function desbloquear() {
    const alvo: AtividadeStatusDetalhe =
      atividade.realizadoMin > 0 ? 'em_execucao' : 'pendente'
    patchAtividade({ status: alvo, bloqueioMotivo: undefined })
    appendHistoricoRuntime(atividade.id, {
      tipo: 'desbloqueio',
      label: 'Bloqueio removido',
      usuario: gestor,
      categoria: 'gestao',
      impactoStatus: statusLabel(alvo),
    })
    fecharPainel('Bloqueio removido.')
  }

  function salvarObservacao() {
    const t = obsTexto.trim()
    patchAtividade({ observacaoGestor: t || undefined })
    if (t) {
      appendHistoricoRuntime(atividade.id, {
        tipo: 'observacao_gestor',
        label: 'Observação do gestor',
        usuario: gestor,
        categoria: 'gestao',
        observacao: t,
      })
    }
    fecharPainel(t ? 'Observação registrada.' : 'Observação removida.')
  }

  const statusOpcoes: AtividadeStatusDetalhe[] = [
    'pendente',
    'pronta',
    'em_execucao',
    'pausada',
    'concluida',
    'bloqueada',
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-white/12 bg-white/[0.05] px-2 py-1.5 text-[11px] font-bold text-slate-400 transition hover:border-sgp-gold/35 hover:text-slate-200"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Gestão
      </button>
      {open && !acao && (
        <div
          className="absolute right-0 top-full z-40 mt-1 min-w-[13.5rem] rounded-xl border border-white/[0.1] bg-sgp-navy-deep py-1 shadow-xl ring-1 ring-black/40"
          role="menu"
        >
          {(
            [
              ['status', 'Alterar status'],
              ['responsavel', 'Reatribuir responsável'],
              ['prioridade', 'Ajustar prioridade'],
              ...(bloqueada
                ? ([] as const)
                : ([['bloqueio', 'Registrar bloqueio']] as const)),
              ...(bloqueada
                ? ([['bloqueio', 'Desbloquear atividade']] as const)
                : ([] as const)),
              ['observacao', 'Observação do gestor'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={`${k}-${label}`}
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-300 transition hover:bg-white/[0.06]"
              onClick={() => {
                if (k === 'bloqueio' && bloqueada) {
                  desbloquear()
                  return
                }
                setAcao(k as AcaoGestor)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {acao && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[min(100vw-2rem,19rem)] rounded-xl border border-white/[0.1] bg-gradient-to-br from-sgp-navy via-sgp-navy-deep to-sgp-navy-deep p-4 shadow-2xl ring-1 ring-white/[0.06]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {acao === 'status' && 'Status'}
            {acao === 'responsavel' && 'Responsável'}
            {acao === 'prioridade' && 'Prioridade'}
            {acao === 'bloqueio' && 'Bloqueio'}
            {acao === 'observacao' && 'Observação'}
          </p>
          <p className="mt-1 line-clamp-2 text-xs text-slate-400">
            {atividade.nome}
          </p>

          {acao === 'status' && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {statusOpcoes.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={saving}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition disabled:opacity-45 ${
                    atividade.status === s
                      ? 'border-sgp-gold/45 bg-sgp-gold/12 text-sgp-gold-warm'
                      : 'border-white/10 bg-white/[0.05] text-slate-300 hover:border-white/18 hover:bg-white/[0.08]'
                  }`}
                  onClick={() => {
                    setSaving(true)
                    window.setTimeout(() => {
                      setSaving(false)
                      aplicarStatus(s)
                    }, 120)
                  }}
                >
                  {statusLabel(s)}
                </button>
              ))}
            </div>
          )}

          {acao === 'responsavel' && (
            <div className="mt-3 max-h-44 space-y-1 overflow-y-auto pr-0.5">
              {listColaboradoresParaReatribuicaoGestor({
                colaboradorIdAtividade: atividade.colaboradorId,
              }).map((c) => (
                <button
                  key={c.colaboradorId}
                  type="button"
                  disabled={saving}
                  className={`flex w-full items-center rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition disabled:opacity-45 ${
                    atividade.colaboradorId === c.colaboradorId ||
                    (!atividade.colaboradorId && atividade.responsavel === c.nome)
                      ? 'border-sgp-gold/40 bg-sgp-gold/10 text-sgp-gold-warm'
                      : 'border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/16'
                  }`}
                  onClick={() => {
                    setSaving(true)
                    window.setTimeout(() => {
                      setSaving(false)
                      aplicarResponsavel(c)
                    }, 120)
                  }}
                >
                  {c.nome}
                  {c.codigo ? (
                    <span className="ml-2 text-[10px] font-medium text-slate-500">
                      {c.codigo}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          )}

          {acao === 'prioridade' && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(
                ['baixa', 'media', 'alta', 'critica'] as AtividadePrioridade[]
              ).map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={saving}
                  className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-bold capitalize transition disabled:opacity-45 ${
                    (atividade.prioridade ?? 'media') === p
                      ? 'border-violet-400/40 bg-violet-500/15 text-violet-100'
                      : 'border-white/10 bg-white/[0.05] text-slate-300 hover:border-violet-400/25'
                  }`}
                  onClick={() => {
                    setSaving(true)
                    window.setTimeout(() => {
                      setSaving(false)
                      aplicarPrioridade(p)
                    }, 120)
                  }}
                >
                  {prioridadeLabel(p)}
                </button>
              ))}
            </div>
          )}

          {acao === 'bloqueio' && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-600">
                Motivo rápido
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MOTIVOS_BLOQUEIO.map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={saving}
                    className="rounded-lg border border-amber-500/25 bg-amber-500/8 px-2 py-1 text-[10px] font-semibold text-amber-100/95 transition hover:border-amber-400/40 disabled:opacity-45"
                    onClick={() => {
                      setSaving(true)
                      window.setTimeout(() => {
                        setSaving(false)
                        registrarBloqueio(m)
                      }, 120)
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={motivoLivre}
                onChange={(e) => setMotivoLivre(e.target.value)}
                placeholder="Outro motivo curto…"
                className="sgp-input-app w-full px-2 py-2 text-xs"
              />
              <button
                type="button"
                disabled={saving}
                className="w-full rounded-lg border border-amber-500/35 bg-amber-500/12 px-3 py-2 text-xs font-bold text-amber-50 transition hover:bg-amber-500/18 disabled:opacity-45"
                onClick={() => {
                  setSaving(true)
                  window.setTimeout(() => {
                    setSaving(false)
                    registrarBloqueio()
                  }, 120)
                }}
              >
                {saving ? 'Aplicando…' : 'Confirmar bloqueio'}
              </button>
            </div>
          )}

          {acao === 'observacao' && (
            <div className="mt-3 space-y-2">
              <textarea
                rows={3}
                value={obsTexto}
                onChange={(e) => setObsTexto(e.target.value)}
                className="sgp-input-app w-full resize-none px-2 py-2 text-xs"
                placeholder="Nota operacional curta…"
                maxLength={280}
              />
              <button
                type="button"
                disabled={saving}
                className="sgp-cta-primary w-full !py-2 text-xs disabled:opacity-45"
                onClick={() => {
                  setSaving(true)
                  window.setTimeout(() => {
                    setSaving(false)
                    salvarObservacao()
                  }, 200)
                }}
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          )}

          <button
            type="button"
            className="mt-3 w-full text-center text-[11px] text-slate-500 underline-offset-2 hover:text-slate-400"
            onClick={() => {
              setMotivoLivre('')
              setAcao(null)
            }}
          >
            Voltar
          </button>
        </div>
      )}
    </div>
  )
}
