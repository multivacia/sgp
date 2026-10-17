import { useEffect, useState } from 'react'
import { corrigirLancamento, listarLancamentos, removerLancamento } from '../api/timeEntries'
import { MOTIVOS_CORRECAO, corpoCorrecao, corpoRemocao, motivoCorrecao, totalMin, type Lancamento } from '../domain/apontamentos'
import { fmtMin } from '../domain/format'

type Props = { conveyorId: string; stepId: string; titulo: string; podeEditar: boolean; podeRemover: boolean; onFechar: () => void; onMudou: () => void }
type Modo = { l: Lancamento; acao: 'corrigir' | 'remover' } | null

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

/** Apontamentos de uma atividade, com correção e remoção pela gestora (sempre com motivo, auditado na V1). */
export function Apontamentos({ conveyorId, stepId, titulo, podeEditar, podeRemover, onFechar, onMudou }: Props) {
  const [lista, setLista] = useState<Lancamento[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [modo, setModo] = useState<Modo>(null)
  const [min, setMin] = useState(0)
  const [botao, setBotao] = useState<string | null>(null)
  const [detalhe, setDetalhe] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [versao, setVersao] = useState(0)

  useEffect(() => {
    let vivo = true
    listarLancamentos(conveyorId, stepId)
      .then((r) => vivo && setLista(r))
      .catch((e) => vivo && setErro(e instanceof Error ? e.message : 'Não foi possível ver os apontamentos.'))
    return () => {
      vivo = false
    }
  }, [conveyorId, stepId, versao])

  function abrir(l: Lancamento, acao: 'corrigir' | 'remover') {
    setModo({ l, acao })
    setMin(l.minutes)
    setBotao(null)
    setDetalhe('')
    setErro(null)
  }

  const motivo = motivoCorrecao(botao, detalhe)
  const corpo = modo ? (modo.acao === 'corrigir' ? corpoCorrecao(modo.l, min, motivo) : corpoRemocao(motivo)) : null

  async function confirmar() {
    if (!modo || !corpo) return
    setSalvando(true)
    setErro(null)
    try {
      if (modo.acao === 'corrigir') await corrigirLancamento(conveyorId, stepId, modo.l.id, corpo)
      else await removerLancamento(conveyorId, stepId, modo.l.id, corpo)
      setModo(null)
      setLista(null)
      setVersao((v) => v + 1)
      onMudou()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/40" onClick={onFechar}>
      <div role="dialog" aria-label={`Apontamentos de ${titulo}`} onClick={(e) => e.stopPropagation()} className="flex max-h-[88dvh] w-full flex-col gap-3 overflow-y-auto rounded-t-3xl bg-white p-4 pb-[max(env(safe-area-inset-bottom),16px)]">
        <p className="font-bold text-muted">Apontamentos</p>
        <h2 className="font-display text-2xl font-extrabold leading-tight">{titulo}</h2>
        {erro ? <p role="alert" className="font-bold text-danger">{erro}</p> : null}

        {!modo ? (
          <>
            {lista === null && !erro ? <p className="text-muted">Carregando…</p> : null}
            {lista?.length === 0 ? <p className="text-muted">Nenhum apontamento nesta atividade.</p> : null}
            {lista && lista.length > 0 ? <p className="text-muted">Total lançado: {fmtMin(totalMin(lista))}</p> : null}
            {lista?.map((l) => (
              <div key={l.id} className="flex flex-col gap-2 rounded-2xl border border-line p-3">
                <p className="flex justify-between gap-2">
                  <span className="font-bold">{l.collaboratorName ?? 'Colaborador'}</span>
                  <span className="font-display text-xl font-extrabold">{fmtMin(l.minutes)}</span>
                </p>
                <p className="text-sm text-muted">
                  {quando(l.entryAt)}
                  {l.notes ? ` · ${l.notes}` : ''}
                </p>
                {podeEditar || podeRemover ? (
                  <div className="grid grid-cols-2 gap-2">
                    {podeEditar ? (
                      <button type="button" onClick={() => abrir(l, 'corrigir')} className="min-h-12 rounded-xl border-2 border-ink font-bold">
                        Corrigir tempo
                      </button>
                    ) : null}
                    {podeRemover ? (
                      <button type="button" onClick={() => abrir(l, 'remover')} className="min-h-12 rounded-xl border-2 border-danger font-bold text-danger">
                        Remover
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </>
        ) : (
          <>
            <p className="rounded-2xl bg-ground p-3">
              <span className="font-bold">{modo.l.collaboratorName ?? 'Colaborador'}</span> · {quando(modo.l.entryAt)} · lançou {fmtMin(modo.l.minutes)}
            </p>
            {modo.acao === 'corrigir' ? (
              <>
                <span className="text-lg font-bold">Tempo certo</span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setMin((m) => Math.max(5, m - 15))} className="min-h-14 flex-1 rounded-2xl border-2 border-ink text-lg font-bold">
                    − 15 min
                  </button>
                  <span className="min-w-28 text-center font-display text-2xl font-extrabold">{fmtMin(min)}</span>
                  <button type="button" onClick={() => setMin((m) => m + 15)} className="min-h-14 flex-1 rounded-2xl border-2 border-ink text-lg font-bold">
                    + 15 min
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[-5, 5].map((x) => (
                    <button key={x} type="button" onClick={() => setMin((m) => Math.max(1, m + x))} className="min-h-12 rounded-xl border-2 border-line font-bold">
                      {x > 0 ? `+${x}` : x} min
                    </button>
                  ))}
                  {[30, 60].map((x) => (
                    <button key={x} type="button" onClick={() => setMin(x)} className="min-h-12 rounded-xl border-2 border-line font-bold">
                      {fmtMin(x)}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="font-bold text-danger">O apontamento sai das horas da atividade. Fica registrado quem removeu e o motivo.</p>
            )}
            <span className="text-lg font-bold">Motivo</span>
            <div className="grid grid-cols-2 gap-2">
              {MOTIVOS_CORRECAO.map((m) => (
                <button key={m} type="button" aria-pressed={botao === m} onClick={() => setBotao(botao === m ? null : m)} className={`min-h-14 rounded-xl px-2 text-left font-bold ${botao === m ? 'bg-ink text-white' : 'border-2 border-line'}`}>
                  {m}
                </button>
              ))}
            </div>
            <textarea value={detalhe} onChange={(e) => setDetalhe(e.target.value.slice(0, 450))} rows={2} placeholder={botao ? 'Detalhe (opcional)' : 'Ou escreva o motivo'} aria-label="Detalhe do motivo" className="rounded-2xl border-2 border-line p-3 text-lg" />
            <button type="button" disabled={!corpo || salvando} onClick={() => void confirmar()} className={`min-h-16 rounded-2xl text-lg font-bold ${corpo && !salvando ? (modo.acao === 'remover' ? 'bg-danger text-white' : 'bg-ok text-white') : 'bg-line text-muted'}`}>
              {salvando ? 'Salvando…' : modo.acao === 'remover' ? 'Remover apontamento' : `Corrigir para ${fmtMin(min)}`}
            </button>
            <button type="button" onClick={() => setModo(null)} className="min-h-12 rounded-2xl bg-line font-bold">
              Voltar
            </button>
          </>
        )}
        {!modo ? (
          <button type="button" onClick={onFechar} className="min-h-14 rounded-2xl bg-line font-bold">
            Fechar
          </button>
        ) : null}
      </div>
    </div>
  )
}
