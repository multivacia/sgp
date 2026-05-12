/**
 * Esqueleto visual da hierarquia tarefa → setor → atividade (Fase 1 — placeholders).
 */
export function NovaEsteiraMontagemZonas() {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading text-lg font-bold text-slate-100">
          Área de montagem operacional
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Estrutura para tarefas de serviço, setores e atividades — adicionar ou reaproveitar itens
          será refinado nas próximas fases.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-5 ring-1 ring-white/[0.04]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Tarefa / serviço
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Zona para agrupar o pedido ou linha de serviço.
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-5 ring-1 ring-white/[0.04]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Setor
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Subdivisão dentro da tarefa (ex.: tapeçaria, elétrica).
          </p>
        </div>
        <div className="rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] p-5 ring-1 ring-white/[0.04]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Atividade
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Passos com tempo estimado e origem (manual, reaproveitada, base).
          </p>
        </div>
      </div>
    </section>
  )
}
