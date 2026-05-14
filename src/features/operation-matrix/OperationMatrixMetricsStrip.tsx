import type { MatrixTreeAggregateMaps } from './matrixTreeAggregates'

type Props = {
  global: MatrixTreeAggregateMaps['global']
}

/** Faixa compacta com resumo global da matriz (item raiz). */
export function OperationMatrixMetricsStrip({ global }: Props) {
  const pill =
    'inline-flex items-center gap-1 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[10px] text-slate-400'
  const n = 'font-semibold tabular-nums text-slate-200'
  return (
    <div
      className="flex flex-wrap gap-x-2 gap-y-1.5 text-[10px] leading-snug"
      role="region"
      aria-label="Resumo da composição de serviço"
    >
      <span className={pill}>
        <span className={n}>{global.taskCount}</span> tarefas
      </span>
      <span className={pill}>
        <span className={n}>{global.sectorCount}</span> setores
      </span>
      <span className={pill}>
        <span className={n}>{global.activityCount}</span> atividades
      </span>
      <span className={pill}>
        <span className={n}>{global.plannedMinutesSum}</span> min
      </span>
      <span className={pill}>
        <span className={n}>{global.linkedDistinctDefaultTeams}</span> equipes
      </span>
      <span className={pill}>
        <span className={n}>{global.activitiesWithoutDefaultTeam}</span> sem
        equipe padrão
      </span>
      {global.activitiesWithOrphanDefaultTeam > 0 ? (
        <span
          className="inline-flex items-center gap-1 rounded-md border border-rose-500/25 bg-rose-500/[0.07] px-2 py-1 text-[10px] text-rose-100/90"
          title="Equipe padrão importada sem cadastro correspondente"
        >
          <span className="font-semibold tabular-nums text-rose-50/95">
            {global.activitiesWithOrphanDefaultTeam}
          </span>{' '}
          órfão
        </span>
      ) : null}
    </div>
  )
}
