import { useState } from 'react'
import type { Dispatch, DragEvent, SetStateAction } from 'react'
import { setDragPayload, type NovaEsteiraDraftDrag } from './novaEsteiraDnD'
import type { Collaborator } from '../../../domain/collaborators/collaborator.types'
import type { Team } from '../../../domain/teams/team.types'
import type {
  ManualAreaDraft,
  ManualOptionDraft,
  ManualStepDraft,
  NovaEsteiraAlocacaoLinha,
} from './matrixToConveyorCreateInput'
import {
  validateManualStepAssignees,
  validateManualStructure,
} from './matrixToConveyorCreateInput'
import { labelOrigemTarefa } from './novaEsteiraTotemUi'

type Linha = NovaEsteiraAlocacaoLinha

function newKey() {
  return crypto.randomUUID()
}

function emptyStep(): ManualStepDraft {
  return { key: newKey(), titulo: '', plannedMinutes: 60 }
}

function emptyArea(): ManualAreaDraft {
  return { key: newKey(), titulo: '', steps: [emptyStep()] }
}

export function createInitialManualOption(order: number): ManualOptionDraft {
  return {
    key: newKey(),
    titulo: order === 1 ? 'Opção 1' : `Opção ${order}`,
    areas: [emptyArea()],
  }
}

type Props = {
  roots: ManualOptionDraft[]
  onChangeRoots: (next: ManualOptionDraft[]) => void
  alocacoes: Record<string, Linha[]>
  onChangeAlocacoes: Dispatch<SetStateAction<Record<string, Linha[]>>>
  colabList: Collaborator[]
  colabLoading: boolean
  colabError: string | null
  teamList: Team[]
  teamLoading: boolean
  teamError: string | null
  /** `rascunho`: fluxo clássico (ex.: edição). `totem`: criação notebook-first — cartões fechados por defeito. */
  variant?: 'default' | 'rascunho' | 'totem'
}

export function NovaEsteiraComposicaoManual({
  roots,
  onChangeRoots,
  alocacoes,
  onChangeAlocacoes,
  colabList,
  colabLoading,
  colabError,
  teamList,
  teamLoading,
  teamError,
  variant = 'default',
}: Props) {
  const totem = variant === 'totem'
  const rascunho = variant === 'rascunho' || totem
  const areaLabel = rascunho ? 'Setor' : 'Área'
  const reorderBtnClass =
    'rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-400 hover:border-white/20 disabled:pointer-events-none disabled:opacity-35'
  const [openAreasByOption, setOpenAreasByOption] = useState<Record<string, string[]>>({})

  function linhaType(l: Linha): 'COLLABORATOR' | 'TEAM' {
    return l.type === 'TEAM' ? 'TEAM' : 'COLLABORATOR'
  }

  function isAreaOpen(opKey: string, areaKey: string, indexInOption: number): boolean {
    if (!totem) return true
    const openKeys = openAreasByOption[opKey]
    if (!openKeys) return indexInOption === 0
    return openKeys.includes(areaKey)
  }

  function toggleAreaOpen(opKey: string, areaKey: string, indexInOption: number) {
    if (!totem) return
    setOpenAreasByOption((prev) => {
      const current = prev[opKey]
      const openKeys = current ? [...current] : indexInOption === 0 ? [areaKey] : []
      const alreadyOpen = openKeys.includes(areaKey)
      const nextKeys = alreadyOpen ? openKeys.filter((k) => k !== areaKey) : [...openKeys, areaKey]
      return { ...prev, [opKey]: nextKeys }
    })
  }

  function patchRoots(fn: (prev: ManualOptionDraft[]) => ManualOptionDraft[]) {
    onChangeRoots(fn(roots))
  }

  function addOption() {
    patchRoots((prev) => [...prev, createInitialManualOption(prev.length + 1)])
  }

  function moveOption(opKey: string, dir: -1 | 1) {
    patchRoots((prev) => {
      const i = prev.findIndex((o) => o.key === opKey)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      const a = next[i]!
      const b = next[j]!
      next[i] = b
      next[j] = a
      return next
    })
  }

  function moveArea(opKey: string, areaKey: string, dir: -1 | 1) {
    patchRoots((prev) =>
      prev.map((o) => {
        if (o.key !== opKey) return o
        const ai = o.areas.findIndex((a) => a.key === areaKey)
        if (ai < 0) return o
        const aj = ai + dir
        if (aj < 0 || aj >= o.areas.length) return o
        const areas = [...o.areas]
        const a = areas[ai]!
        const b = areas[aj]!
        areas[ai] = b
        areas[aj] = a
        return { ...o, areas }
      }),
    )
  }

  function moveStep(
    opKey: string,
    areaKey: string,
    stepKey: string,
    dir: -1 | 1,
  ) {
    patchRoots((prev) =>
      prev.map((o) => {
        if (o.key !== opKey) return o
        return {
          ...o,
          areas: o.areas.map((a) => {
            if (a.key !== areaKey) return a
            const si = a.steps.findIndex((s) => s.key === stepKey)
            if (si < 0) return a
            const sj = si + dir
            if (sj < 0 || sj >= a.steps.length) return a
            const steps = [...a.steps]
            const x = steps[si]!
            const y = steps[sj]!
            steps[si] = y
            steps[sj] = x
            return { ...a, steps }
          }),
        }
      }),
    )
  }

  function removeOption(opKey: string) {
    patchRoots((prev) => prev.filter((o) => o.key !== opKey))
    onChangeAlocacoes((a) => {
      const next = { ...a }
      const removed = roots.find((o) => o.key === opKey)
      if (!removed) return next
      for (const ar of removed.areas) {
        for (const st of ar.steps) delete next[st.key]
      }
      return next
    })
  }

  function updateOptionTitulo(opKey: string, titulo: string) {
    patchRoots((prev) =>
      prev.map((o) => (o.key === opKey ? { ...o, titulo } : o)),
    )
  }

  function addArea(opKey: string) {
    patchRoots((prev) =>
      prev.map((o) =>
        o.key === opKey ? { ...o, areas: [...o.areas, emptyArea()] } : o,
      ),
    )
  }

  function removeArea(opKey: string, areaKey: string) {
    patchRoots((prev) =>
      prev.map((o) => {
        if (o.key !== opKey) return o
        const areas = o.areas.filter((a) => a.key !== areaKey)
        return { ...o, areas: areas.length > 0 ? areas : [emptyArea()] }
      }),
    )
    const op = roots.find((o) => o.key === opKey)
    const ar = op?.areas.find((a) => a.key === areaKey)
    if (ar) {
      onChangeAlocacoes((a) => {
        const next = { ...a }
        for (const st of ar.steps) delete next[st.key]
        return next
      })
    }
  }

  function updateAreaTitulo(opKey: string, areaKey: string, titulo: string) {
    patchRoots((prev) =>
      prev.map((o) => {
        if (o.key !== opKey) return o
        return {
          ...o,
          areas: o.areas.map((a) =>
            a.key === areaKey ? { ...a, titulo } : a,
          ),
        }
      }),
    )
  }

  function addStep(opKey: string, areaKey: string) {
    patchRoots((prev) =>
      prev.map((o) => {
        if (o.key !== opKey) return o
        return {
          ...o,
          areas: o.areas.map((a) =>
            a.key === areaKey
              ? { ...a, steps: [...a.steps, emptyStep()] }
              : a,
          ),
        }
      }),
    )
  }

  function removeStep(opKey: string, areaKey: string, stepKey: string) {
    patchRoots((prev) =>
      prev.map((o) => {
        if (o.key !== opKey) return o
        return {
          ...o,
          areas: o.areas.map((a) => {
            if (a.key !== areaKey) return a
            const steps = a.steps.filter((s) => s.key !== stepKey)
            return {
              ...a,
              steps: steps.length > 0 ? steps : [emptyStep()],
            }
          }),
        }
      }),
    )
    onChangeAlocacoes((a) => {
      const next = { ...a }
      delete next[stepKey]
      return next
    })
  }

  function updateStep(
    opKey: string,
    areaKey: string,
    stepKey: string,
    patch: Partial<ManualStepDraft>,
  ) {
    patchRoots((prev) =>
      prev.map((o) => {
        if (o.key !== opKey) return o
        return {
          ...o,
          areas: o.areas.map((a) => {
            if (a.key !== areaKey) return a
            return {
              ...a,
              steps: a.steps.map((s) =>
                s.key === stepKey ? { ...s, ...patch } : s,
              ),
            }
          }),
        }
      }),
    )
  }

  function normalizePrimaryRows(rows: Linha[]): Linha[] {
    const collaborators = rows
      .map((r, idx) => ({ r, idx }))
      .filter((x) => linhaType(x.r) === 'COLLABORATOR')
    if (collaborators.length === 0) {
      return rows.map((r) => ({ ...r, isPrimary: false }))
    }
    const primaryIdx = collaborators.find((x) => x.r.isPrimary)?.idx
    const keepIdx = primaryIdx ?? collaborators[0]!.idx
    return rows.map((r, i) => ({ ...r, isPrimary: i === keepIdx }))
  }

  function addLinhaCollaborator(stepKey: string) {
    const first = colabList[0]?.id
    if (!first) return
    onChangeAlocacoes((prev) => {
      const cur = prev[stepKey] ?? []
      const hasCollaborator = cur.some((x) => linhaType(x) === 'COLLABORATOR')
      return {
        ...prev,
        [stepKey]: normalizePrimaryRows([
          ...cur,
          {
            type: 'COLLABORATOR',
            collaboratorId: first,
            isPrimary: !hasCollaborator,
          },
        ]),
      }
    })
  }

  function addLinhaTeam(stepKey: string) {
    const first = teamList[0]?.id
    if (!first) return
    onChangeAlocacoes((prev) => {
      const cur = prev[stepKey] ?? []
      return {
        ...prev,
        [stepKey]: normalizePrimaryRows([
          ...cur,
          { type: 'TEAM', teamId: first, isPrimary: false },
        ]),
      }
    })
  }

  function removeLinha(stepKey: string, index: number) {
    onChangeAlocacoes((prev) => {
      const cur = [...(prev[stepKey] ?? [])]
      cur.splice(index, 1)
      return { ...prev, [stepKey]: normalizePrimaryRows(cur) }
    })
  }

  function updateLinha(
    stepKey: string,
    index: number,
    patch: Partial<Linha>,
  ) {
    onChangeAlocacoes((prev) => {
      const cur = [...(prev[stepKey] ?? [])].map((r, i) =>
        i === index ? { ...r, ...patch } : r,
      )
      if (patch.isPrimary === true && cur[index] && linhaType(cur[index]!) === 'COLLABORATOR') {
        for (let i = 0; i < cur.length; i++) {
          cur[i] = { ...cur[i]!, isPrimary: linhaType(cur[i]!) === 'COLLABORATOR' && i === index }
        }
      }
      return { ...prev, [stepKey]: normalizePrimaryRows(cur) }
    })
  }

  return (
    <div className="space-y-6">
      {!rascunho ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-100/95">
          <span className="font-semibold">Composição manual.</span> Tudo o que
          você definir aqui será enviado como etapas de origem manual (sem vínculo
          com matriz).
        </div>
      ) : null}

      {roots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.12] bg-black/20 px-6 py-10 text-center">
          {totem ? (
            <>
              <p className="text-sm font-medium text-slate-200">Sua esteira em montagem está vazia</p>
              <p className="mt-2 text-sm text-slate-500">
                Escolha <span className="text-sgp-gold">Usar esta base</span> à esquerda ou arraste uma tarefa para{' '}
                <span className="text-sgp-gold">adicionar à esteira</span>.
              </p>
            </>
          ) : rascunho ? (
            <>
              <p className="text-sm font-medium text-slate-200">
                Rascunho vazio
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Arraste <span className="text-sgp-gold">matrizes</span> ou{' '}
                <span className="text-sgp-gold">tarefas</span> do catálogo à
                esquerda para montar a esteira. O catálogo é somente consulta —
                tudo editável fica aqui.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-400">
                Comece adicionando a primeira opção da esteira (pedido / linha de
                serviço).
              </p>
              <button
                type="button"
                onClick={() => onChangeRoots([createInitialManualOption(1)])}
                className="sgp-cta-primary mt-4"
              >
                Adicionar primeira opção
              </button>
            </>
          )}
        </div>
      ) : (
        <ul className="space-y-8">
          {roots.map((op, oi) => {
            const headerRow = (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <label className="block min-w-[200px] flex-1 text-sm">
                  <span className="text-slate-500">
                    {rascunho ? 'Tarefa' : 'Opção'} {oi + 1}{' '}
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {rascunho ? 'rascunho' : 'manual'}
                    </span>
                  </span>
                  <input
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100"
                    value={op.titulo}
                    onChange={(ev) => updateOptionTitulo(op.key, ev.target.value)}
                    placeholder="Ex.: Revisão completa"
                  />
                </label>
                <div className="flex shrink-0 flex-wrap items-start gap-2">
                  {roots.length > 1 && (
                    <div className="flex gap-0.5 pt-1">
                      <button
                        type="button"
                        aria-label="Subir"
                        className={reorderBtnClass}
                        disabled={oi === 0}
                        onClick={() => moveOption(op.key, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Descer"
                        className={reorderBtnClass}
                        disabled={oi === roots.length - 1}
                        onClick={() => moveOption(op.key, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  )}
                  {(rascunho || roots.length > 1) && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-rose-300/90"
                      onClick={() => removeOption(op.key)}
                    >
                      {totem ? 'Remover da esteira' : rascunho ? 'Remover tarefa' : 'Remover opção'}
                    </button>
                  )}
                </div>
              </div>
            )

            const body = (
              <>
              {!rascunho ? (
                headerRow
              ) : (
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <label className="block min-w-[200px] flex-1 text-sm">
                    <span className="text-slate-500">Nome da tarefa</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100"
                      value={op.titulo}
                      onChange={(ev) =>
                        updateOptionTitulo(op.key, ev.target.value)
                      }
                      placeholder="Ex.: Revisão completa"
                    />
                  </label>
                </div>
              )}

              <ul className={rascunho ? 'mt-2 space-y-6' : 'mt-6 space-y-6'}>
                {op.areas.map((ar, ai) => {
                  const areaOpen = isAreaOpen(op.key, ar.key, ai)
                  const areaMinutes = ar.steps.reduce((s, st) => s + st.plannedMinutes, 0)
                  const participantCount = new Set(
                    ar.steps.flatMap((st) =>
                      (alocacoes[st.key] ?? []).map((ln) =>
                        linhaType(ln) === 'TEAM' ? `team:${ln.teamId ?? ''}` : `collab:${ln.collaboratorId ?? ''}`,
                      ),
                    ),
                  ).size
                  return (
                  <li key={ar.key} className="rounded-xl border border-white/[0.06] bg-black/15 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <label className="block min-w-[180px] flex-1 text-sm">
                        <span className="text-slate-500">
                          {areaLabel} {ai + 1}
                        </span>
                        <input
                          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100"
                          value={ar.titulo}
                          onChange={(ev) =>
                            updateAreaTitulo(op.key, ar.key, ev.target.value)
                          }
                          placeholder="Ex.: Mecânica"
                        />
                      </label>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {totem ? (
                          <button
                            type="button"
                            className="text-[11px] font-semibold text-sgp-gold/90"
                            onClick={() => toggleAreaOpen(op.key, ar.key, ai)}
                          >
                            {areaOpen ? 'Recolher setor' : 'Expandir setor'}
                          </button>
                        ) : null}
                        {op.areas.length > 1 && (
                          <div className="flex gap-0.5 pt-6 sm:pt-1">
                            <button
                              type="button"
                              aria-label="Subir"
                              className={reorderBtnClass}
                              disabled={ai === 0}
                              onClick={() => moveArea(op.key, ar.key, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              aria-label="Descer"
                              className={reorderBtnClass}
                              disabled={ai === op.areas.length - 1}
                              onClick={() => moveArea(op.key, ar.key, 1)}
                            >
                              ↓
                            </button>
                          </div>
                        )}
                        {op.areas.length > 1 && (
                          <button
                            type="button"
                            className="pt-6 text-xs text-rose-300/90 sm:pt-1"
                            onClick={() => removeArea(op.key, ar.key)}
                          >
                            Remover {rascunho ? 'setor' : 'área'}
                          </button>
                        )}
                      </div>
                    </div>

                    {totem ? (
                      <p className="mt-2 text-[11px] tabular-nums text-slate-500">
                        {ar.steps.length} etapa(s) · {areaMinutes} min · {participantCount} participante(s)
                      </p>
                    ) : null}

                    {areaOpen ? (
                    <ul className="mt-4 space-y-4">
                      {ar.steps.map((st, si) => {
                        const linhas = alocacoes[st.key] ?? []
                        return (
                          <li
                            key={st.key}
                            className="rounded-lg border border-white/[0.05] bg-black/25 p-3"
                          >
                            <div className="flex flex-wrap items-end gap-3">
                              <label className="block min-w-[160px] flex-1 text-sm">
                                <span className="text-slate-500">
                                  Etapa {si + 1}
                                </span>
                                <input
                                  className="mt-1 w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 text-slate-100"
                                  value={st.titulo}
                                  onChange={(ev) =>
                                    updateStep(op.key, ar.key, st.key, {
                                      titulo: ev.target.value,
                                    })
                                  }
                                  placeholder="Nome da etapa"
                                />
                              </label>
                              <label className="block w-28 text-sm">
                                <span className="text-slate-500">Min</span>
                                <input
                                  type="number"
                                  min={0}
                                  className="mt-1 w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 tabular-nums text-slate-100"
                                  value={st.plannedMinutes}
                                  onChange={(ev) =>
                                    updateStep(op.key, ar.key, st.key, {
                                      plannedMinutes: Number(ev.target.value) || 0,
                                    })
                                  }
                                />
                              </label>
                              {ar.steps.length > 1 && (
                                <div className="flex shrink-0 gap-0.5 pb-0.5">
                                  <button
                                    type="button"
                                    aria-label="Subir"
                                    className={reorderBtnClass}
                                    disabled={si === 0}
                                    onClick={() =>
                                      moveStep(op.key, ar.key, st.key, -1)
                                    }
                                  >
                                    ↑
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="Descer"
                                    className={reorderBtnClass}
                                    disabled={si === ar.steps.length - 1}
                                    onClick={() =>
                                      moveStep(op.key, ar.key, st.key, 1)
                                    }
                                  >
                                    ↓
                                  </button>
                                </div>
                              )}
                              {ar.steps.length > 1 && (
                                <button
                                  type="button"
                                  className="shrink-0 pb-0.5 text-xs text-rose-300/90"
                                  onClick={() =>
                                    removeStep(op.key, ar.key, st.key)
                                  }
                                >
                                  Remover etapa
                                </button>
                              )}
                            </div>

                            {totem ? (
                              <details className="mt-3 border-t border-white/[0.05] pt-3">
                                <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  Equipe (opcional) · {linhas.length} participante(s)
                                </summary>
                                <div className="mt-2">
                                  {colabLoading && (
                                    <p className="text-xs text-slate-500">Carregando colaboradores…</p>
                                  )}
                                  {colabError && <p className="text-xs text-rose-300">{colabError}</p>}
                                  {teamLoading && (
                                    <p className="text-xs text-slate-500">Carregando times…</p>
                                  )}
                                  {teamError && <p className="text-xs text-rose-300">{teamError}</p>}
                                  {!colabLoading && colabList.length === 0 && (
                                    <p className="text-xs text-amber-200/90">Não há colaboradores ativos.</p>
                                  )}
                                  {!teamLoading && teamList.length === 0 && (
                                    <p className="text-xs text-amber-200/90">Não há times ativos.</p>
                                  )}
                                  <div className="mt-2 space-y-2">
                                    {linhas.map((ln, idx) => (
                                      <div key={`${st.key}-${idx}`} className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                                          {linhaType(ln) === 'TEAM' ? 'Time' : 'Colaborador'}
                                        </span>
                                        {linhaType(ln) === 'TEAM' ? (
                                          <select
                                            className="min-w-[180px] flex-1 rounded border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-slate-100"
                                            value={ln.teamId ?? ''}
                                            onChange={(ev) =>
                                              updateLinha(st.key, idx, {
                                                teamId: ev.target.value,
                                              })
                                            }
                                          >
                                            {teamList.map((t) => (
                                              <option key={t.id} value={t.id}>
                                                {t.name}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <>
                                            <select
                                              className="min-w-[180px] flex-1 rounded border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-slate-100"
                                              value={ln.collaboratorId ?? ''}
                                              onChange={(ev) =>
                                                updateLinha(st.key, idx, {
                                                  collaboratorId: ev.target.value,
                                                })
                                              }
                                            >
                                              {colabList.map((c) => (
                                                <option key={c.id} value={c.id}>
                                                  {c.fullName}
                                                  {c.code ? ` (${c.code})` : ''}
                                                </option>
                                              ))}
                                            </select>
                                            <label className="flex items-center gap-1.5 text-xs text-slate-400">
                                              <input
                                                type="radio"
                                                name={`primary-${st.key}`}
                                                checked={ln.isPrimary}
                                                onChange={() =>
                                                  updateLinha(st.key, idx, {
                                                    isPrimary: true,
                                                  })
                                                }
                                              />
                                              Principal
                                            </label>
                                          </>
                                        )}
                                        <button
                                          type="button"
                                          className="text-xs font-semibold text-rose-300/90"
                                          onClick={() => removeLinha(st.key, idx)}
                                        >
                                          Remover
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                  <button
                                    type="button"
                                    disabled={colabList.length === 0}
                                    className="mt-2 text-xs font-bold text-sgp-gold disabled:opacity-40"
                                    onClick={() => addLinhaCollaborator(st.key)}
                                  >
                                    + Colaborador
                                  </button>
                                  <button
                                    type="button"
                                    disabled={teamList.length === 0}
                                    className="ml-3 mt-2 text-xs font-bold text-sgp-gold disabled:opacity-40"
                                    onClick={() => addLinhaTeam(st.key)}
                                  >
                                    + Time
                                  </button>
                                </div>
                              </details>
                            ) : (
                              <div className="mt-3 border-t border-white/[0.05] pt-3">
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                  Equipe (opcional) · {linhas.length} participante(s)
                                </p>
                                {colabLoading && (
                                  <p className="mt-2 text-xs text-slate-500">
                                    Carregando colaboradores…
                                  </p>
                                )}
                                {colabError && (
                                  <p className="mt-2 text-xs text-rose-300">
                                    {colabError}
                                  </p>
                                )}
                                {teamLoading && (
                                  <p className="mt-2 text-xs text-slate-500">Carregando times…</p>
                                )}
                                {teamError && (
                                  <p className="mt-2 text-xs text-rose-300">{teamError}</p>
                                )}
                                {!colabLoading && colabList.length === 0 && (
                                  <p className="mt-2 text-xs text-amber-200/90">
                                    Não há colaboradores ativos.
                                  </p>
                                )}
                                {!teamLoading && teamList.length === 0 && (
                                  <p className="mt-2 text-xs text-amber-200/90">Não há times ativos.</p>
                                )}
                                <div className="mt-2 space-y-2">
                                  {linhas.map((ln, idx) => (
                                    <div
                                      key={`${st.key}-${idx}`}
                                      className="flex flex-wrap items-center gap-2"
                                    >
                                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                                        {linhaType(ln) === 'TEAM' ? 'Time' : 'Colaborador'}
                                      </span>
                                      {linhaType(ln) === 'TEAM' ? (
                                        <select
                                          className="min-w-[180px] flex-1 rounded border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-slate-100"
                                          value={ln.teamId ?? ''}
                                          onChange={(ev) =>
                                            updateLinha(st.key, idx, {
                                              teamId: ev.target.value,
                                            })
                                          }
                                        >
                                          {teamList.map((t) => (
                                            <option key={t.id} value={t.id}>
                                              {t.name}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <>
                                          <select
                                            className="min-w-[180px] flex-1 rounded border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-slate-100"
                                            value={ln.collaboratorId ?? ''}
                                            onChange={(ev) =>
                                              updateLinha(st.key, idx, {
                                                collaboratorId: ev.target.value,
                                              })
                                            }
                                          >
                                            {colabList.map((c) => (
                                              <option key={c.id} value={c.id}>
                                                {c.fullName}
                                                {c.code ? ` (${c.code})` : ''}
                                              </option>
                                            ))}
                                          </select>
                                          <label className="flex items-center gap-1.5 text-xs text-slate-400">
                                            <input
                                              type="radio"
                                              name={`primary-${st.key}`}
                                              checked={ln.isPrimary}
                                              onChange={() =>
                                                updateLinha(st.key, idx, {
                                                  isPrimary: true,
                                                })
                                              }
                                            />
                                            Principal
                                          </label>
                                        </>
                                      )}
                                      <button
                                        type="button"
                                        className="text-xs font-semibold text-rose-300/90"
                                        onClick={() => removeLinha(st.key, idx)}
                                      >
                                        Remover
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  type="button"
                                  disabled={colabList.length === 0}
                                  className="mt-2 text-xs font-bold text-sgp-gold disabled:opacity-40"
                                  onClick={() => addLinhaCollaborator(st.key)}
                                >
                                  + Colaborador
                                </button>
                                <button
                                  type="button"
                                  disabled={teamList.length === 0}
                                  className="ml-3 mt-2 text-xs font-bold text-sgp-gold disabled:opacity-40"
                                  onClick={() => addLinhaTeam(st.key)}
                                >
                                  + Time
                                </button>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                    ) : null}
                    {areaOpen ? (
                    <button
                      type="button"
                      onClick={() => addStep(op.key, ar.key)}
                      className="mt-3 text-xs font-bold text-sgp-gold"
                    >
                      + Etapa neste {rascunho ? 'setor' : 'área'}
                    </button>
                    ) : null}
                  </li>
                )})}
              </ul>

              <button
                type="button"
                onClick={() => addArea(op.key)}
                className="mt-4 text-xs font-bold text-sgp-gold"
              >
                + {rascunho ? 'Setor nesta tarefa' : 'Área nesta opção'}
              </button>
              </>
            )

            if (totem) {
              const onDragStartDraft = (e: DragEvent) => {
                const p: NovaEsteiraDraftDrag = {
                  t: 'draft-option',
                  optionKey: op.key,
                }
                setDragPayload(e, p)
              }
              const nSec = op.areas.length
              const nSteps = op.areas.reduce((n, ar) => n + ar.steps.length, 0)
              const mins = op.areas.reduce(
                (s, ar) => s + ar.steps.reduce((t, st) => t + st.plannedMinutes, 0),
                0,
              )
              const stOk = validateManualStructure([op]) === null
              const asOk = validateManualStepAssignees([op], alocacoes) === null
              const org = labelOrigemTarefa(op)
              const orgBadge = org === 'base' ? 'Da base' : org === 'extra' ? 'Extra' : 'Manual'
              const status = !stOk ? 'Incompleto' : !asOk ? 'Equipe a rever' : 'Completo'
              return (
                <li key={op.key} className="list-none">
                  <details className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] open:pb-5">
                    <summary
                      draggable
                      onDragStart={onDragStartDraft}
                      className="cursor-grab list-none px-4 py-3 active:cursor-grabbing sm:px-5 sm:py-3.5 [&::-webkit-details-marker]:hidden"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-heading text-sm font-semibold text-slate-50 sm:text-base">
                              {op.titulo.trim() || `Tarefa ${oi + 1}`}
                            </span>
                            <span className="shrink-0 rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              {orgBadge}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] tabular-nums text-slate-500">
                            {nSec} setor(es) · {nSteps} etapa(s) · {mins} min
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                              !stOk
                                ? 'bg-rose-500/20 text-rose-200'
                                : !asOk
                                  ? 'bg-amber-500/20 text-amber-200'
                                  : 'bg-emerald-500/15 text-emerald-200'
                            }`}
                          >
                            {status}
                          </span>
                          {roots.length > 1 ? (
                            <div
                              className="flex gap-0.5"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                              role="presentation"
                            >
                              <button
                                type="button"
                                draggable={false}
                                aria-label="Subir"
                                className={reorderBtnClass}
                                disabled={oi === 0}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  moveOption(op.key, -1)
                                }}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                draggable={false}
                                aria-label="Descer"
                                className={reorderBtnClass}
                                disabled={oi === roots.length - 1}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  moveOption(op.key, 1)
                                }}
                              >
                                ↓
                              </button>
                            </div>
                          ) : null}
                          <button
                            type="button"
                            draggable={false}
                            className="text-[11px] font-semibold text-rose-300/90"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              removeOption(op.key)
                            }}
                          >
                            Remover da esteira
                          </button>
                          <span className="text-[11px] font-semibold text-sgp-gold/90">Expandir</span>
                        </div>
                      </div>
                    </summary>
                    <div className="border-t border-white/[0.06] px-4 pb-4 pt-4 sm:px-5">{body}</div>
                  </details>
                </li>
              )
            }

            if (rascunho) {
              const onDragStartDraft = (e: DragEvent) => {
                const p: NovaEsteiraDraftDrag = {
                  t: 'draft-option',
                  optionKey: op.key,
                }
                setDragPayload(e, p)
              }
              return (
                <li key={op.key} className="list-none">
                  <details
                    open
                    className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] open:pb-5"
                  >
                    <summary
                      draggable
                      onDragStart={onDragStartDraft}
                      className="cursor-grab active:cursor-grabbing list-none px-5 py-4 [&::-webkit-details-marker]:hidden"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="min-w-0 flex-1 truncate font-heading text-base text-slate-100">
                          {op.titulo.trim() || `Tarefa ${oi + 1}`}
                        </span>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          {roots.length > 1 && (
                            <div
                              className="flex gap-0.5"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                              role="presentation"
                            >
                              <button
                                type="button"
                                draggable={false}
                                aria-label="Subir"
                                className={reorderBtnClass}
                                disabled={oi === 0}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  moveOption(op.key, -1)
                                }}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                draggable={false}
                                aria-label="Descer"
                                className={reorderBtnClass}
                                disabled={oi === roots.length - 1}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  moveOption(op.key, 1)
                                }}
                              >
                                ↓
                              </button>
                            </div>
                          )}
                          <span className="text-xs font-semibold text-sgp-gold/90">
                            Expandir ou recolher
                          </span>
                        </div>
                      </div>
                    </summary>
                    <div className="border-t border-white/[0.06] px-5 pt-4">
                      {body}
                    </div>
                  </details>
                </li>
              )
            }

            return (
              <li
                key={op.key}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
              >
                {body}
              </li>
            )
          })}
        </ul>
      )}

      {roots.length > 0 && !totem ? (
        <button type="button" onClick={addOption} className="text-sm font-bold text-sgp-gold">
          {rascunho ? '+ Tarefa em branco' : '+ Outra opção'}
        </button>
      ) : null}
    </div>
  )
}
