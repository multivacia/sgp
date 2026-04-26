import {
  type CatalogOpcaoDraftInstance,
  sortMatrixChildNodes,
} from './cloneCatalogTaskSubtreeForDraft'
import {
  reconcileEtapaCollaborators,
  type CriarMatrizManualOpcao,
} from './criarMatrizManualDraft'
import { parseMatrixActivitySupportIds } from './matrixActivityCollaboratorsMeta'

type Props = {
  name: string
  code: string
  description: string
  chosenCatalogDrafts: CatalogOpcaoDraftInstance[]
  manualOpcoes: CriarMatrizManualOpcao[]
  resolveCollaboratorLabel: (id: string) => string
  resolveTeamLabel: (id: string) => string
  saving: boolean
  onVoltar: () => void
  onCriar: () => void
}

export function CriarMatrizEtapaRevisao({
  name,
  code,
  description,
  chosenCatalogDrafts,
  manualOpcoes,
  resolveCollaboratorLabel,
  resolveTeamLabel,
  saving,
  onVoltar,
  onCriar,
}: Props) {
  const codeDisplay = code.trim() ? code : 'Não informado'

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
        <h2 className="font-heading text-lg text-slate-100">Revisão</h2>
        <p className="mt-1 text-sm text-slate-500">
          Confira os dados antes de criar a matriz. Depois você poderá ajustar
          detalhes no editor.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Nome</dt>
            <dd className="text-slate-200">{name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Código</dt>
            <dd className="text-slate-200">{codeDisplay}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Descrição</dt>
            <dd className="text-slate-200">
              {description.trim() ? description : '—'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Opções reaproveitadas do catálogo</dt>
            <dd className="text-slate-200">
              {chosenCatalogDrafts.length === 0 ? (
                <span className="text-slate-400">Nenhuma.</span>
              ) : (
                <ul className="mt-1 list-inside list-disc space-y-2 text-slate-200">
                  {chosenCatalogDrafts.map((inst, i) => {
                    const task = inst.draftRoot
                    const sectorCount = sortMatrixChildNodes(task).filter(
                      (c) => c.node_type === 'SECTOR',
                    ).length
                    let activityCount = 0
                    for (const sec of sortMatrixChildNodes(task)) {
                      if (sec.node_type !== 'SECTOR') continue
                      activityCount += sortMatrixChildNodes(sec).filter(
                        (c) => c.node_type === 'ACTIVITY',
                      ).length
                    }
                    return (
                      <li key={inst.instanceId}>
                        <span className="font-medium">
                          {i + 1}. {task.name.trim() || 'Opção'}
                        </span>
                        <span className="text-slate-500">
                          {' '}
                          (origem: {inst.sourceMatrixItemName} · {sectorCount}{' '}
                          área(s), {activityCount} etapa(s))
                        </span>
                        <div className="mt-1 ml-4 text-[12px] leading-relaxed text-slate-500">
                          <ul className="list-inside list-[circle] space-y-1">
                            {sortMatrixChildNodes(task)
                              .filter((c) => c.node_type === 'SECTOR')
                              .map((sector) => (
                                <li key={sector.id}>
                                  Área: {sector.name.trim() || '—'}
                                  <ul className="ml-4 mt-0.5 list-inside list-disc">
                                    {sortMatrixChildNodes(sector)
                                      .filter((c) => c.node_type === 'ACTIVITY')
                                      .map((act) => {
                                        const primary = act.default_responsible_id
                                        const supports =
                                          parseMatrixActivitySupportIds(act.metadata_json)
                                        const collabIds = [
                                          ...new Set([
                                            ...(primary ? [primary] : []),
                                            ...supports.filter((x) => x !== primary),
                                          ]),
                                        ]
                                        const r = reconcileEtapaCollaborators({
                                          id: act.id,
                                          name: act.name,
                                          plannedMinutes: act.planned_minutes,
                                          teamIds: [...(act.team_ids ?? [])],
                                          collaboratorIds: collabIds,
                                          primaryCollaboratorId: primary,
                                        })
                                        const apoios = r.collaboratorIds.filter(
                                          (id) => id !== r.primaryCollaboratorId,
                                        )
                                        return (
                                          <li key={act.id}>
                                            <span className="text-slate-300">
                                              {act.name.trim() || 'Etapa'}
                                            </span>
                                            <div>
                                              Principal:{' '}
                                              {r.primaryCollaboratorId
                                                ? resolveCollaboratorLabel(
                                                    r.primaryCollaboratorId,
                                                  )
                                                : 'Nenhum'}
                                            </div>
                                            <div>
                                              Apoios:{' '}
                                              {apoios.length === 0
                                                ? 'Nenhum'
                                                : apoios
                                                    .map((id) =>
                                                      resolveCollaboratorLabel(id),
                                                    )
                                                    .join(', ')}
                                            </div>
                                            <div>
                                              Times associados:{' '}
                                              {r.teamIds.length === 0
                                                ? 'Nenhum time associado'
                                                : r.teamIds
                                                    .map((id) => resolveTeamLabel(id))
                                                    .join(', ')}
                                            </div>
                                          </li>
                                        )
                                      })}
                                  </ul>
                                </li>
                              ))}
                          </ul>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Novas opções (estrutura manual)</dt>
            <dd className="text-slate-200">
              {manualOpcoes.length === 0 ? (
                <span className="text-slate-400">Nenhuma.</span>
              ) : (
                <ul className="mt-1 list-inside list-disc space-y-2 text-slate-200">
                  {manualOpcoes.map((op) => (
                    <li key={op.id}>
                      <span className="font-medium">
                        {op.name.trim() || 'Sem nome'}
                      </span>
                      {op.description.trim() ? (
                        <span className="text-slate-500">
                          {' '}
                          — {op.description.trim()}
                        </span>
                      ) : null}
                      <div className="mt-1 ml-4 text-[13px] leading-relaxed text-slate-400">
                        {op.areas.length === 0 ? (
                          <span>Sem áreas definidas.</span>
                        ) : (
                          <ul className="list-inside list-[circle] space-y-1">
                            {op.areas.map((ar) => (
                              <li key={ar.id}>
                                <span className="text-slate-300">
                                  Área: {ar.name.trim() || '—'}
                                </span>
                                {ar.etapas.length === 0 ? (
                                  <span className="text-slate-500">
                                    {' '}
                                    (sem etapas)
                                  </span>
                                ) : (
                                  <ul className="ml-4 mt-0.5 list-inside list-disc text-slate-400">
                                    {ar.etapas.map((et) => {
                                      const r = reconcileEtapaCollaborators(et)
                                      const primaryId = r.primaryCollaboratorId
                                      const apoios = r.collaboratorIds.filter(
                                        (id) => id !== primaryId,
                                      )
                                      const teams = [...new Set(r.teamIds)]
                                      return (
                                        <li key={et.id}>
                                          <span className="text-slate-200">
                                            {et.name.trim() || 'Etapa'}
                                          </span>
                                          {r.plannedMinutes != null &&
                                          !Number.isNaN(r.plannedMinutes)
                                            ? ` · ${r.plannedMinutes} min`
                                            : ''}
                                          <div className="mt-0.5 text-[12px] text-slate-500">
                                            {r.collaboratorIds.length === 0 ? (
                                              <span>
                                                Colaboradores: nenhum associado.
                                              </span>
                                            ) : (
                                              <>
                                                {primaryId ? (
                                                  <div>
                                                    Principal:{' '}
                                                    <span className="text-slate-300">
                                                      {resolveCollaboratorLabel(
                                                        primaryId,
                                                      )}
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <div className="text-amber-200/90">
                                                    Indique o principal na etapa
                                                    Estrutura (várias pessoas
                                                    selecionadas).
                                                  </div>
                                                )}
                                                {apoios.length > 0 ? (
                                                  <div className="mt-0.5">
                                                    Apoios:{' '}
                                                    {apoios
                                                      .map((id) =>
                                                        resolveCollaboratorLabel(
                                                          id,
                                                        ),
                                                      )
                                                      .join(', ')}
                                                  </div>
                                                ) : null}
                                                <div className="mt-0.5">
                                                  Times associados:{' '}
                                                  {teams.length === 0
                                                    ? 'Nenhum time associado'
                                                    : teams
                                                        .map((id) => resolveTeamLabel(id))
                                                        .join(', ')}
                                                </div>
                                              </>
                                            )}
                                          </div>
                                        </li>
                                      )
                                    })}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="sgp-cta-secondary"
          onClick={onVoltar}
          disabled={saving}
        >
          Voltar
        </button>
        <button
          type="button"
          className="sgp-cta-primary"
          onClick={onCriar}
          disabled={saving}
        >
          {saving ? 'A criar…' : 'Criar matriz'}
        </button>
      </div>
    </section>
  )
}
