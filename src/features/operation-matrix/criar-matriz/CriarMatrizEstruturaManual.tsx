import type { MatrixSuggestionCatalogData } from '../../../catalog/matrixSuggestion/types'
import type { Collaborator } from '../../../domain/collaborators/collaborator.types'
import type { Team } from '../../../domain/teams/team.types'
import { LabelSuggestField } from '../components/LabelSuggestField'
import {
  newManualArea,
  newManualEtapa,
  newManualOpcao,
  reconcileEtapaCollaborators,
  type CriarMatrizManualEtapa,
  type CriarMatrizManualOpcao,
} from './criarMatrizManualDraft'

type Props = {
  opcoes: CriarMatrizManualOpcao[]
  onChange: (next: CriarMatrizManualOpcao[]) => void
  collaborators: Collaborator[]
  teams: Team[]
  collaboratorsLoading: boolean
  collaboratorsError: string | null
  matrixSuggestionCatalog: MatrixSuggestionCatalogData
}

function nid(): string {
  return globalThis.crypto.randomUUID()
}

function collabOptionLabel(c: Collaborator): string {
  const base =
    c.fullName?.trim() ||
    c.nickname?.trim() ||
    c.email?.trim() ||
    c.code?.trim() ||
    'Colaborador'
  return c.code ? `${base} (${c.code})` : base
}

function updateEtapa(
  opcoes: CriarMatrizManualOpcao[],
  opId: string,
  arId: string,
  etId: string,
  mapEt: (e: CriarMatrizManualEtapa) => CriarMatrizManualEtapa,
): CriarMatrizManualOpcao[] {
  return opcoes.map((o) =>
    o.id !== opId
      ? o
      : {
          ...o,
          areas: o.areas.map((a) =>
            a.id !== arId
              ? a
              : {
                  ...a,
                  etapas: a.etapas.map((e) =>
                    e.id === etId ? mapEt(e) : e,
                  ),
                },
          ),
        },
  )
}

/** Opções de colaborador para a linha `idx`: mantém o atual ou ids ainda não usados noutras linhas. */
function selectOptionsForRow(
  collaborators: Collaborator[],
  ids: string[],
  rowIndex: number,
): Collaborator[] {
  const currentId = ids[rowIndex]
  return collaborators.filter(
    (c) => c.id === currentId || !ids.includes(c.id),
  )
}

export function CriarMatrizEstruturaManual({
  opcoes,
  onChange,
  collaborators,
  teams,
  collaboratorsLoading,
  collaboratorsError,
  matrixSuggestionCatalog,
}: Props) {
  function addFirstOption() {
    onChange([newManualOpcao(nid())])
  }

  function addAnotherOption() {
    onChange([...opcoes, newManualOpcao(nid())])
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3 text-sm text-amber-100/95">
        <span className="font-semibold">Nova estrutura na matriz.</span> Defina
        opções, áreas e etapas aqui; pode combinar com o catálogo acima.
      </div>

      {opcoes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.12] bg-black/20 px-6 py-10 text-center">
          <p className="text-sm text-slate-400">
            Comece adicionando a primeira opção da matriz (produto ou linha de
            serviço).
          </p>
          <button
            type="button"
            onClick={addFirstOption}
            className="sgp-cta-primary mt-4"
          >
            Adicionar primeira opção
          </button>
        </div>
      ) : (
        <ul className="space-y-8">
          {opcoes.map((op, oi) => (
            <li
              key={op.id}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <label className="block min-w-[200px] flex-1 text-sm">
                  <span className="text-slate-500">
                    Opção {oi + 1}{' '}
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      matriz
                    </span>
                  </span>
                  <div className="mt-1">
                    <LabelSuggestField
                      value={op.name}
                      onChange={(next) =>
                        onChange(
                          opcoes.map((o) =>
                            o.id === op.id ? { ...o, name: next } : o,
                          ),
                        )
                      }
                      catalogEntries={matrixSuggestionCatalog.options}
                      placeholder="Ex.: Revisão completa"
                      inputClassName="mt-0 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100"
                    />
                  </div>
                </label>
                {opcoes.length > 1 && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-rose-300/90"
                    onClick={() =>
                      onChange(opcoes.filter((o) => o.id !== op.id))
                    }
                  >
                    Remover opção
                  </button>
                )}
              </div>

              <label className="mt-4 block text-sm">
                <span className="text-slate-500">Descrição (opcional)</span>
                <textarea
                  className="mt-1 min-h-[52px] w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100"
                  value={op.description}
                  onChange={(ev) =>
                    onChange(
                      opcoes.map((o) =>
                        o.id === op.id
                          ? { ...o, description: ev.target.value }
                          : o,
                      ),
                    )
                  }
                />
              </label>

              <ul className="mt-6 space-y-6">
                {op.areas.map((ar, ai) => (
                  <li
                    key={ar.id}
                    className="rounded-xl border border-white/[0.06] bg-black/15 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <label className="block min-w-[180px] flex-1 text-sm">
                        <span className="text-slate-500">Área {ai + 1}</span>
                        <div className="mt-1">
                          <LabelSuggestField
                            value={ar.name}
                            onChange={(next) =>
                              onChange(
                                opcoes.map((o) =>
                                  o.id !== op.id
                                    ? o
                                    : {
                                        ...o,
                                        areas: o.areas.map((a) =>
                                          a.id === ar.id
                                            ? { ...a, name: next }
                                            : a,
                                        ),
                                      },
                                ),
                              )
                            }
                            catalogEntries={matrixSuggestionCatalog.areas}
                            placeholder="Ex.: Mecânica"
                            inputClassName="mt-0 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100"
                          />
                        </div>
                      </label>
                      <button
                        type="button"
                        className="text-xs text-rose-300/90"
                        onClick={() =>
                          onChange(
                            opcoes.map((o) =>
                              o.id !== op.id
                                ? o
                                : {
                                    ...o,
                                    areas: o.areas.filter((a) => a.id !== ar.id),
                                  },
                            ),
                          )
                        }
                      >
                        Remover área
                      </button>
                    </div>

                    <ul className="mt-4 space-y-4">
                      {ar.etapas.map((et, si) => {
                        const etRec = reconcileEtapaCollaborators(et)
                        const ids = etRec.collaboratorIds
                        const canAddCollab = collaborators.some(
                          (c) => !ids.includes(c.id),
                        )

                        return (
                          <li
                            key={et.id}
                            className="rounded-lg border border-white/[0.05] bg-black/25 p-3"
                          >
                            <div className="flex flex-wrap gap-3">
                              <label className="block min-w-[160px] flex-1 text-sm">
                                <span className="text-slate-500">
                                  Etapa {si + 1}
                                </span>
                                <div className="mt-1">
                                  <LabelSuggestField
                                    value={et.name}
                                    onChange={(next) =>
                                      onChange(
                                        updateEtapa(
                                          opcoes,
                                          op.id,
                                          ar.id,
                                          et.id,
                                          (e) => ({
                                            ...e,
                                            name: next,
                                          }),
                                        ),
                                      )
                                    }
                                    catalogEntries={matrixSuggestionCatalog.activities}
                                    placeholder="Nome da etapa"
                                    inputClassName="mt-0 w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 text-slate-100"
                                  />
                                </div>
                              </label>
                              <label className="block w-24 shrink-0 text-sm sm:w-28">
                                <span className="text-slate-500">Min</span>
                                <input
                                  type="number"
                                  min={0}
                                  className="mt-1 w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 tabular-nums text-slate-100"
                                  value={et.plannedMinutes ?? ''}
                                  placeholder="—"
                                  onChange={(ev) => {
                                    const raw = ev.target.value
                                    const pm =
                                      raw === ''
                                        ? null
                                        : Number.parseInt(raw, 10)
                                    onChange(
                                      updateEtapa(
                                        opcoes,
                                        op.id,
                                        ar.id,
                                        et.id,
                                        (e) => ({
                                          ...e,
                                          plannedMinutes:
                                            pm != null && !Number.isNaN(pm)
                                              ? pm
                                              : null,
                                        }),
                                      ),
                                    )
                                  }}
                                />
                              </label>
                              {ar.etapas.length > 1 && (
                                <button
                                  type="button"
                                  className="self-end text-xs text-rose-300/90"
                                  onClick={() =>
                                    onChange(
                                      opcoes.map((o) =>
                                        o.id !== op.id
                                          ? o
                                          : {
                                              ...o,
                                              areas: o.areas.map((a) =>
                                                a.id !== ar.id
                                                  ? a
                                                  : {
                                                      ...a,
                                                      etapas: a.etapas.filter(
                                                        (e) => e.id !== et.id,
                                                      ),
                                                    },
                                              ),
                                            },
                                      ),
                                    )
                                  }
                                >
                                  Remover etapa
                                </button>
                              )}
                            </div>

                            <div className="mt-3 border-t border-white/[0.05] pt-3">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Equipe de execução (opcional)
                              </p>
                              <div className="mt-2 space-y-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  Times
                                </p>
                                <div className="max-h-24 space-y-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
                                  {teams.map((team) => {
                                    const checked = etRec.teamIds.includes(team.id)
                                    return (
                                      <label
                                        key={`${et.id}-team-${team.id}`}
                                        className="flex items-center gap-2 text-[11px] text-slate-300"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(ev) =>
                                            onChange(
                                              updateEtapa(
                                                opcoes,
                                                op.id,
                                                ar.id,
                                                et.id,
                                                (e) => ({
                                                  ...e,
                                                  teamIds: ev.target.checked
                                                    ? [...new Set([...e.teamIds, team.id])]
                                                    : e.teamIds.filter((id) => id !== team.id),
                                                }),
                                              ),
                                            )
                                          }
                                          className="rounded border-white/20"
                                        />
                                        <span className="truncate">{team.name}</span>
                                      </label>
                                    )
                                  })}
                                  {teams.length === 0 ? (
                                    <p className="text-[11px] text-slate-500">
                                      Nenhum time disponível.
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                Colaboradores
                              </p>
                              {collaboratorsLoading && (
                                <p className="mt-2 text-xs text-slate-500">
                                  Carregando colaboradores…
                                </p>
                              )}
                              {collaboratorsError && (
                                <p className="mt-2 text-xs text-rose-300">
                                  {collaboratorsError}
                                </p>
                              )}
                              {!collaboratorsLoading &&
                                !collaboratorsError &&
                                collaborators.length === 0 && (
                                  <p className="mt-2 text-xs text-amber-200/90">
                                    Não há colaboradores ativos.
                                  </p>
                                )}
                              <div className="mt-2 space-y-2">
                                {ids.map((cid, idx) => {
                                  const rowOptions = selectOptionsForRow(
                                    collaborators,
                                    ids,
                                    idx,
                                  )
                                  return (
                                    <div
                                      key={`${et.id}-${cid}-${idx}`}
                                      className="flex flex-wrap items-center gap-2"
                                    >
                                      <select
                                        className="min-w-[min(100%,12rem)] flex-1 rounded border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-slate-100"
                                        value={cid}
                                        onChange={(ev) => {
                                          const newId = ev.target.value
                                          onChange(
                                            updateEtapa(
                                              opcoes,
                                              op.id,
                                              ar.id,
                                              et.id,
                                              (e) => {
                                                const cur =
                                                  reconcileEtapaCollaborators(e)
                                                const next = [
                                                  ...cur.collaboratorIds,
                                                ]
                                                if (next[idx] === newId)
                                                  return cur
                                                if (next.includes(newId))
                                                  return cur
                                                next[idx] = newId
                                                return reconcileEtapaCollaborators(
                                                  {
                                                    ...cur,
                                                    collaboratorIds: next,
                                                    primaryCollaboratorId:
                                                      cur.primaryCollaboratorId,
                                                  },
                                                )
                                              },
                                            ),
                                          )
                                        }}
                                      >
                                        {rowOptions.map((c) => (
                                          <option key={c.id} value={c.id}>
                                            {collabOptionLabel(c)}
                                          </option>
                                        ))}
                                      </select>
                                      <label className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <input
                                          type="radio"
                                          className="accent-sgp-gold"
                                          name={`principal-${et.id}`}
                                          checked={
                                            etRec.primaryCollaboratorId === cid
                                          }
                                          onChange={() =>
                                            onChange(
                                              updateEtapa(
                                                opcoes,
                                                op.id,
                                                ar.id,
                                                et.id,
                                                (e) =>
                                                  reconcileEtapaCollaborators({
                                                    ...e,
                                                    primaryCollaboratorId: cid,
                                                  }),
                                              ),
                                            )
                                          }
                                        />
                                        Principal
                                      </label>
                                      <button
                                        type="button"
                                        className="text-xs font-semibold text-rose-300/90"
                                        onClick={() =>
                                          onChange(
                                            updateEtapa(
                                              opcoes,
                                              op.id,
                                              ar.id,
                                              et.id,
                                              (e) => {
                                                const cur =
                                                  reconcileEtapaCollaborators(e)
                                                const next = cur.collaboratorIds.filter(
                                                  (_, i) => i !== idx,
                                                )
                                                let prim = cur.primaryCollaboratorId
                                                if (prim === cid) prim = null
                                                return reconcileEtapaCollaborators(
                                                  {
                                                    ...cur,
                                                    collaboratorIds: next,
                                                    primaryCollaboratorId: prim,
                                                  },
                                                )
                                              },
                                            ),
                                          )
                                        }
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                              <button
                                type="button"
                                disabled={!canAddCollab || collaborators.length === 0}
                                className="mt-2 text-xs font-bold text-sgp-gold disabled:opacity-40"
                                onClick={() =>
                                  onChange(
                                    updateEtapa(
                                      opcoes,
                                      op.id,
                                      ar.id,
                                      et.id,
                                      (e) => {
                                        const cur = reconcileEtapaCollaborators(e)
                                        const nextCollab = collaborators.find(
                                          (c) =>
                                            !cur.collaboratorIds.includes(c.id),
                                        )
                                        if (!nextCollab) return cur
                                        const nextIds = [
                                          ...cur.collaboratorIds,
                                          nextCollab.id,
                                        ]
                                        let prim = cur.primaryCollaboratorId
                                        if (nextIds.length === 1) {
                                          prim = nextIds[0]!
                                        }
                                        return reconcileEtapaCollaborators({
                                          ...cur,
                                          collaboratorIds: nextIds,
                                          primaryCollaboratorId: prim,
                                        })
                                      },
                                    ),
                                  )
                                }
                              >
                                + Colaborador
                              </button>
                              {ids.length > 1 && !etRec.primaryCollaboratorId && (
                                <p className="mt-2 text-xs text-amber-200/90">
                                  Indique quem é o principal.
                                </p>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          opcoes.map((o) =>
                            o.id !== op.id
                              ? o
                              : {
                                  ...o,
                                  areas: o.areas.map((a) =>
                                    a.id !== ar.id
                                      ? a
                                      : {
                                          ...a,
                                          etapas: [
                                            ...a.etapas,
                                            newManualEtapa(nid()),
                                          ],
                                        },
                                  ),
                                },
                          ),
                        )
                      }
                      className="mt-3 text-xs font-bold text-sgp-gold"
                    >
                      + Etapa nesta área
                    </button>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() =>
                  onChange(
                    opcoes.map((o) =>
                      o.id !== op.id
                        ? o
                        : { ...o, areas: [...o.areas, newManualArea(nid())] },
                    ),
                  )
                }
                className="mt-4 text-xs font-bold text-sgp-gold"
              >
                + Área nesta opção
              </button>
            </li>
          ))}
        </ul>
      )}

      {opcoes.length > 0 && (
        <button
          type="button"
          onClick={addAnotherOption}
          className="text-sm font-bold text-sgp-gold"
        >
          + Outra opção
        </button>
      )}
    </div>
  )
}
