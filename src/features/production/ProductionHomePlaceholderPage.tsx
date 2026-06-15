/**
 * Placeholder da home do Modo Fábrica.
 * Esta tela será substituída por ProductionWorkQueuePage na R2-S1,
 * quando a work queue real estiver disponível.
 *
 * TODO R2-S1: substituir por ProductionWorkQueuePage com GET /production/me/work-queue.
 * TODO R2-S2: adicionar card de apontamentos do dia.
 * TODO R2-S4: adicionar card de histórico e conclusão de STEP.
 */
export function ProductionHomePlaceholderPage() {
  return (
    <div className="flex flex-1 flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          Minhas atividades
        </h1>
        <p className="mt-2 text-base text-slate-400">
          As atividades planejadas aparecerão aqui na próxima etapa.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* TODO R2-S1: substituir por card com work queue real */}
        <PlaceholderCard
          title="Atividades de hoje"
          description="Em breve: lista de atividades planejadas."
        />
        {/* TODO R2-S2: substituir por card com apontamentos do dia */}
        <PlaceholderCard
          title="Apontamentos do dia"
          description="Em breve: registro de horas apontadas."
        />
      </div>
    </div>
  )
}

function PlaceholderCard({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div
      className="flex min-h-[7rem] flex-col justify-between rounded-2xl border border-white/10 bg-sgp-night/60 px-5 py-4 opacity-60"
      aria-disabled="true"
    >
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  )
}
