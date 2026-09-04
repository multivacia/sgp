import { useState, useRef, useEffect } from 'react'
import type { Dispatch, DragEvent, SetStateAction } from 'react'
import { setDragPayload, type NovaEsteiraDraftDrag } from './novaEsteiraDnD'
import type { Collaborator } from '../../../domain/collaborators/collaborator.types'
import type { Team } from '../../../domain/teams/team.types'
import { resolveActivityPlannedTotalMinutes } from '../../../domain/operational/activityOperationalQuantity'
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
  return { key: newKey(), titulo: '', plannedMinutes: 60, plannedQuantity: 1 }
}

function emptyArea(): ManualAreaDraft {
  return { key: newKey(), titulo: '', steps: [emptyStep()] }
}

export function createInitialManualOption(order: number): ManualOptionDraft {
  return {
    key: newKey(),
    titulo: order === 1 ? 'Tarefa 1' : `Tarefa ${order}`,
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
  /**
   * Somente leitura: a navegação (expandir/recolher tarefa e setor) continua livre,
   * mas nenhum controlo de mutação de estrutura ou alocação fica disponível.
   * Usado em esteira já em produção, onde a estrutura não pode mais ser trocada.
   */
  readOnly?: boolean
  /**
   * Ação de domínio permitida mesmo em readOnly (Dispensar atividade).
   * Quando omitido, o botão não é exibido.
   */
  onRequestAbortStep?: (step: { stepNodeId: string; stepName: string }) => void
  canAbortStep?: (step: ManualStepDraft) => boolean
  abortingStepId?: string | null
  /**
   * Quando true (ex.: inclusão tardia), tarefas/setores iniciais abrem expandídos.
   * Default false preserva o totem notebook-first (cartões fechados).
   */
  initiallyExpanded?: boolean
  /**
   * Rótulo do botão de remoção da OPTION. Default: totem → "Remover da esteira";
   * demais → "Remover tarefa".
   */
  optionRemoveLabel?: string
}

function buildInitialOpenAreas(roots: ManualOptionDraft[]): Record<string, string[]> {
  const init: Record<string, string[]> = {}
  for (const op of roots) {
    const first = op.areas[0]
    if (first) init[op.key] = [first.key]
  }
  return init
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
  readOnly = false,
  onRequestAbortStep,
  canAbortStep,
  abortingStepId = null,
  initiallyExpanded = false,
  optionRemoveLabel,
}: Props) {
  const totem = variant === 'totem'
  const rascunho = variant === 'rascunho' || totem
  const areaLabel = 'Setor'
  const removeOptionLabel =
    optionRemoveLabel ?? (totem ? 'Remover da esteira' : 'Remover tarefa')
  const reorderBtnClass =
    'rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-slate-400 hover:border-white/20 disabled:pointer-events-none disabled:opacity-35'
  const lockedFieldClass = 'disabled:cursor-not-allowed disabled:opacity-60'
  const lockedActionClass = 'disabled:cursor-not-allowed disabled:opacity-45'
  const [openAreasByOption, setOpenAreasByOption] = useState<Record<string, string[]>>(
    () => (initiallyExpanded ? buildInitialOpenAreas(roots) : {}),
  )
  const [openOptionKeys, setOpenOptionKeys] = useState<string[]>(() =>
    initiallyExpanded ? roots.map((r) => r.key) : [],
  )

  function handleOptionToggle(opKey: string, open: boolean) {
    setOpenOptionKeys((prev) => {
      if (open) return prev.includes(opKey) ? prev : [...prev, opKey]
      return prev.filter((k) => k !== opKey)
    })
  }

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
    if (readOnly) return
    onChangeRoots(fn(roots))
  }

  function patchAlocacoes(fn: SetStateAction<Record<string, Linha[]>>) {
    if (readOnly) return
    onChangeAlocacoes(fn)
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
    patchAlocacoes((a) => {
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
      patchAlocacoes((a) => {
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
    patchAlocacoes((a) => {
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

  function assignCollaboratorToStep(stepKey: string, collaboratorId: string) {
    patchAlocacoes((prev) => {
      const cur = prev[stepKey] ?? []
      const hasCollaborator = cur.some((x) => linhaType(x) === 'COLLABORATOR')
      return {
        ...prev,
        [stepKey]: normalizePrimaryRows([
          ...cur,
          { type: 'COLLABORATOR', collaboratorId, isPrimary: !hasCollaborator },
        ]),
      }
    })
  }

  function assignTeamToStep(stepKey: string, teamId: string) {
    patchAlocacoes((prev) => {
      const cur = prev[stepKey] ?? []
      return {
        ...prev,
        [stepKey]: normalizePrimaryRows([
          ...cur,
          { type: 'TEAM', teamId, isPrimary: false },
        ]),
      }
    })
  }

  function removeLinha(stepKey: string, index: number) {
    patchAlocacoes((prev) => {
      const cur = [...(prev[stepKey] ?? [])]
      cur.splice(index, 1)
      return { ...prev, [stepKey]: normalizePrimaryRows(cur) }
    })
  }

  return (
    <div className="space-y-6">
      {!rascunho ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-100/95">
          <span className="font-semibold">Composição manual.</span> Tudo o que
          você definir aqui será enviado como atividades de origem manual (sem vínculo
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
                Comece adicionando a primeira tarefa da esteira (pedido / linha de
                serviço).
              </p>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => onChangeRoots([createInitialManualOption(1)])}
                className="sgp-cta-primary mt-4 disabled:pointer-events-none disabled:opacity-45"
              >
                Adicionar primeira tarefa
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
                    Tarefa {oi + 1}{' '}
                    <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {rascunho ? 'rascunho' : 'manual'}
                    </span>
                  </span>
                  <input
                    className={`mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100 ${lockedFieldClass}`}
                    value={op.titulo}
                    disabled={readOnly}
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
                        disabled={readOnly || oi === 0}
                        aria-disabled={readOnly || oi === 0}
                        onClick={() => moveOption(op.key, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Descer"
                        className={reorderBtnClass}
                        disabled={readOnly || oi === roots.length - 1}
                        aria-disabled={readOnly || oi === roots.length - 1}
                        onClick={() => moveOption(op.key, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  )}
                  {(rascunho || roots.length > 1) && (
                    <button
                      type="button"
                      className={`text-xs font-semibold text-rose-300/90 ${lockedActionClass}`}
                      disabled={readOnly}
                      aria-disabled={readOnly}
                      onClick={() => removeOption(op.key)}
                    >
                      {removeOptionLabel}
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
                      className={`mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100 ${lockedFieldClass}`}
                      value={op.titulo}
                      disabled={readOnly}
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
                  const areaMinutes = ar.steps.reduce(
                    (s, st) =>
                      s +
                      resolveActivityPlannedTotalMinutes(
                        st.plannedMinutes,
                        st.plannedQuantity,
                      ),
                    0,
                  )
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
                          className={`mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-slate-100 ${lockedFieldClass}`}
                          value={ar.titulo}
                          disabled={readOnly}
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
                            aria-expanded={areaOpen}
                            aria-label={
                              areaOpen ? 'Recolher setor' : 'Expandir setor'
                            }
                            onClick={() => toggleAreaOpen(op.key, ar.key, ai)}
                          >
                            {areaOpen ? 'Recolher' : 'Expandir'}
                          </button>
                        ) : null}
                        {op.areas.length > 1 && (
                          <div className="flex gap-0.5 pt-6 sm:pt-1">
                            <button
                              type="button"
                              aria-label="Subir"
                              className={reorderBtnClass}
                              disabled={readOnly || ai === 0}
                              aria-disabled={readOnly || ai === 0}
                              onClick={() => moveArea(op.key, ar.key, -1)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              aria-label="Descer"
                              className={reorderBtnClass}
                              disabled={readOnly || ai === op.areas.length - 1}
                              aria-disabled={readOnly || ai === op.areas.length - 1}
                              onClick={() => moveArea(op.key, ar.key, 1)}
                            >
                              ↓
                            </button>
                          </div>
                        )}
                        {op.areas.length > 1 && (
                          <button
                            type="button"
                            className={`pt-6 text-xs text-rose-300/90 sm:pt-1 ${lockedActionClass}`}
                            disabled={readOnly}
                            aria-disabled={readOnly}
                            onClick={() => removeArea(op.key, ar.key)}
                          >
                            Remover setor
                          </button>
                        )}
                      </div>
                    </div>

                    {totem ? (
                      <p className="mt-2 text-[11px] tabular-nums text-slate-500">
                        {ar.steps.length} atividade(s) · {areaMinutes} min · {participantCount} participante(s)
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
                                  Atividade {si + 1}
                                </span>
                                <input
                                  className={`mt-1 w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 text-slate-100 ${lockedFieldClass}`}
                                  value={st.titulo}
                                  disabled={readOnly}
                                  onChange={(ev) =>
                                    updateStep(op.key, ar.key, st.key, {
                                      titulo: ev.target.value,
                                    })
                                  }
                                  placeholder="Nome da atividade"
                                />
                              </label>
                              <label className="block w-28 text-sm">
                                <span className="text-slate-500">Qtd</span>
                                <input
                                  type="number"
                                  readOnly
                                  disabled
                                  aria-readonly="true"
                                  title="Quantidade inicial da esteira: 1. Ajuste após criar, conforme a demanda operacional."
                                  className="mt-1 w-full cursor-not-allowed rounded border border-white/10 bg-black/30 px-2 py-1.5 tabular-nums text-slate-400"
                                  value={1}
                                />
                                <span className="mt-0.5 block text-[10px] leading-tight text-slate-500">
                                  Quantidade inicial da esteira: 1. Ajuste após criar,
                                  conforme a demanda operacional.
                                </span>
                              </label>
                              <label className="block w-28 text-sm">
                                <span className="text-slate-500">Min/un.</span>
                                <input
                                  type="number"
                                  min={0}
                                  className={`mt-1 w-full rounded border border-white/10 bg-black/40 px-2 py-1.5 tabular-nums text-slate-100 ${lockedFieldClass}`}
                                  value={st.plannedMinutes}
                                  disabled={readOnly}
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
                                    disabled={readOnly || si === 0}
                                    aria-disabled={readOnly || si === 0}
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
                                    disabled={readOnly || si === ar.steps.length - 1}
                                    aria-disabled={readOnly || si === ar.steps.length - 1}
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
                                  className={`shrink-0 pb-0.5 text-xs text-rose-300/90 ${lockedActionClass}`}
                                  disabled={readOnly}
                                  aria-disabled={readOnly}
                                  onClick={() =>
                                    removeStep(op.key, ar.key, st.key)
                                  }
                                >
                                  Remover atividade
                                </button>
                              )}
                            </div>

                            {readOnly &&
                            onRequestAbortStep &&
                            canAbortStep?.(st) ? (
                              <div className="mt-3">
                                <button
                                  type="button"
                                  disabled={abortingStepId === st.key}
                                  className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-100 hover:bg-rose-500/15 disabled:opacity-50"
                                  onClick={() =>
                                    onRequestAbortStep({
                                      stepNodeId: st.key,
                                      stepName: st.titulo.trim() || `Atividade ${si + 1}`,
                                    })
                                  }
                                >
                                  {abortingStepId === st.key
                                    ? 'Dispensando…'
                                    : 'Dispensar atividade'}
                                </button>
                              </div>
                            ) : null}

                            <StepAssignmentStrip
                              stepKey={st.key}
                              readOnly={readOnly}
                              linhas={linhas}
                              colabList={colabList}
                              teamList={teamList}
                              colabLoading={colabLoading}
                              colabError={colabError}
                              teamLoading={teamLoading}
                              teamError={teamError}
                              onRemove={(idx) => removeLinha(st.key, idx)}
                              onAssignCollaborator={(id) => assignCollaboratorToStep(st.key, id)}
                              onAssignTeam={(id) => assignTeamToStep(st.key, id)}
                              linhaType={linhaType}
                            />
                          </li>
                        )
                      })}
                    </ul>
                    ) : null}
                    {areaOpen ? (
                    <button
                      type="button"
                      disabled={readOnly}
                      aria-disabled={readOnly}
                      onClick={() => addStep(op.key, ar.key)}
                      className={`mt-3 text-xs font-bold text-sgp-gold ${lockedActionClass}`}
                    >
                      + Atividade neste setor
                    </button>
                    ) : null}
                  </li>
                )})}
              </ul>

              <button
                type="button"
                disabled={readOnly}
                aria-disabled={readOnly}
                onClick={() => addArea(op.key)}
                className={`mt-4 text-xs font-bold text-sgp-gold ${lockedActionClass}`}
              >
                + Setor nesta tarefa
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
                (s, ar) =>
                  s +
                  ar.steps.reduce(
                    (t, st) =>
                      t +
                      resolveActivityPlannedTotalMinutes(
                        st.plannedMinutes,
                        st.plannedQuantity,
                      ),
                    0,
                  ),
                0,
              )
              const stOk = validateManualStructure([op]) === null
              const asOk = validateManualStepAssignees([op], alocacoes) === null
              const org = labelOrigemTarefa(op)
              const orgBadge = org === 'base' ? 'Da base' : org === 'extra' ? 'Extra' : 'Manual'
              const status = !stOk ? 'Incompleto' : !asOk ? 'Equipe a rever' : 'Completo'
              return (
                <li key={op.key} className="list-none">
                  <details
                    open={openOptionKeys.includes(op.key)}
                    className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] open:pb-5"
                    onToggle={(e) => handleOptionToggle(op.key, e.currentTarget.open)}
                  >
                    <summary
                      draggable={!readOnly}
                      onDragStart={readOnly ? undefined : onDragStartDraft}
                      className={`list-none px-4 py-3 sm:px-5 sm:py-3.5 [&::-webkit-details-marker]:hidden ${
                        readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                      }`}
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
                            {nSec} setor(es) · {nSteps} atividade(s) · {mins} min
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
                                disabled={readOnly || oi === 0}
                                aria-disabled={readOnly || oi === 0}
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
                                disabled={readOnly || oi === roots.length - 1}
                                aria-disabled={readOnly || oi === roots.length - 1}
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
                            disabled={readOnly}
                            aria-disabled={readOnly}
                            className={`text-[11px] font-semibold text-rose-300/90 ${lockedActionClass}`}
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              removeOption(op.key)
                            }}
                          >
                            {removeOptionLabel}
                          </button>
                          <span className="text-[11px] font-semibold text-sgp-gold/90">
                            {openOptionKeys.includes(op.key) ? 'Recolher' : 'Expandir'}
                          </span>
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
                      draggable={!readOnly}
                      onDragStart={readOnly ? undefined : onDragStartDraft}
                      className={`list-none px-5 py-4 [&::-webkit-details-marker]:hidden ${
                        readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                      }`}
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
                                disabled={readOnly || oi === 0}
                                aria-disabled={readOnly || oi === 0}
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
                                disabled={readOnly || oi === roots.length - 1}
                                aria-disabled={readOnly || oi === roots.length - 1}
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
        <button
          type="button"
          disabled={readOnly}
          aria-disabled={readOnly}
          onClick={addOption}
          className={`text-sm font-bold text-sgp-gold ${lockedActionClass}`}
        >
          {rascunho ? '+ Tarefa em branco' : '+ Outra tarefa'}
        </button>
      ) : null}
    </div>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

type StepAssignmentStripProps = {
  stepKey: string
  readOnly: boolean
  linhas: Linha[]
  colabList: Collaborator[]
  teamList: Team[]
  colabLoading: boolean
  colabError: string | null
  teamLoading: boolean
  teamError: string | null
  onRemove: (index: number) => void
  onAssignCollaborator: (id: string) => void
  onAssignTeam: (id: string) => void
  linhaType: (l: Linha) => 'COLLABORATOR' | 'TEAM'
}

function StepAssignmentStrip({
  stepKey,
  readOnly,
  linhas,
  colabList,
  teamList,
  colabLoading,
  colabError,
  teamLoading,
  teamError,
  onRemove,
  onAssignCollaborator,
  onAssignTeam,
  linhaType,
}: StepAssignmentStripProps) {
  const [showPopover, setShowPopover] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!showPopover) return
    function onOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPopover(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [showPopover])

  useEffect(() => {
    if (showPopover) {
      const t = setTimeout(() => searchRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [showPopover])

  const assignedCollabIds = new Set(
    linhas.filter((l) => linhaType(l) === 'COLLABORATOR').map((l) => l.collaboratorId),
  )
  const assignedTeamIds = new Set(
    linhas.filter((l) => linhaType(l) === 'TEAM').map((l) => l.teamId),
  )
  const allAvailable = colabList.filter((c) => !assignedCollabIds.has(c.id))
  const allAvailableTeams = teamList.filter((t) => !assignedTeamIds.has(t.id))
  const canAdd = allAvailable.length > 0 || allAvailableTeams.length > 0
  const q = search.trim().toLowerCase()
  const available = q ? allAvailable.filter((c) => c.fullName.toLowerCase().includes(q)) : allAvailable
  const availableTeams = q
    ? allAvailableTeams.filter((t) => t.name.toLowerCase().includes(q))
    : allAvailableTeams

  return (
    <div className="mt-3 border-t border-white/[0.05] pt-2.5">
      {colabError && <p className="mb-1 text-xs text-rose-300">{colabError}</p>}
      {teamError && <p className="mb-1 text-xs text-rose-300">{teamError}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        {(colabLoading || teamLoading) ? (
          <span className="text-[11px] text-slate-500">Carregando…</span>
        ) : null}

        {linhas.map((ln, idx) => {
          if (linhaType(ln) === 'COLLABORATOR') {
            const colab = colabList.find((c) => c.id === ln.collaboratorId)
            const label = colab ? getInitials(colab.fullName) : '?'
            const fullName = colab?.fullName ?? 'Colaborador'
            return (
              <button
                key={`${stepKey}-colab-${idx}`}
                type="button"
                title={
                  readOnly
                    ? `${fullName}${ln.isPrimary ? ' · Principal' : ''}`
                    : `${fullName}${ln.isPrimary ? ' · Principal' : ''} — clique para remover`
                }
                disabled={readOnly}
                aria-disabled={readOnly}
                onClick={() => onRemove(idx)}
                className={[
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  'bg-[var(--void,#050a12)] text-[11px] font-bold text-sgp-gold',
                  'transition-opacity hover:opacity-60',
                  'disabled:cursor-not-allowed disabled:hover:opacity-100',
                  ln.isPrimary
                    ? 'ring-2 ring-[var(--gold,#c9a227)]'
                    : 'ring-1 ring-white/20',
                ].join(' ')}
              >
                {label}
              </button>
            )
          }
          const team = teamList.find((t) => t.id === ln.teamId)
          return (
            <span
              key={`${stepKey}-team-${idx}`}
              className="flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-semibold text-blue-300 ring-1 ring-blue-500/25"
            >
              {team?.name ?? 'Time'}
              <button
                type="button"
                title={
                  readOnly
                    ? `${team?.name ?? 'Time'}`
                    : `Remover ${team?.name ?? 'time'}`
                }
                disabled={readOnly}
                aria-disabled={readOnly}
                onClick={() => onRemove(idx)}
                className="ml-0.5 leading-none text-blue-300/50 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:text-blue-300/50"
              >
                ×
              </button>
            </span>
          )
        })}

        <div ref={containerRef} className="relative">
          <button
            type="button"
            title="Adicionar colaborador ou time"
            disabled={readOnly || colabLoading || teamLoading || !canAdd}
            aria-disabled={readOnly || colabLoading || teamLoading || !canAdd}
            onClick={() => {
              if (readOnly) return
              const next = !showPopover
              if (next) setSearch('')
              setShowPopover(next)
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-white/20 text-sm text-slate-400 hover:border-[var(--gold,#c9a227)]/60 hover:text-sgp-gold disabled:pointer-events-none disabled:opacity-30"
          >
            +
          </button>

          {showPopover && !readOnly ? (
            <div className="absolute left-0 top-9 z-50 w-80 rounded-xl border border-white/10 bg-[var(--navy,#101824)] shadow-2xl">
              <div className="px-2 pt-2 pb-1">
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar colaborador ou time…"
                  className="w-full rounded-lg bg-white/[0.06] px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none focus:ring-1 focus:ring-[var(--gold,#c9a227)]/40"
                />
              </div>
              <div className="max-h-[384px] overflow-y-auto py-1">
                {available.length === 0 && availableTeams.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-slate-500">
                    {q ? 'Nenhum resultado' : 'Todos já adicionados'}
                  </p>
                ) : null}
                {available.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onAssignCollaborator(c.id)
                      setShowPopover(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-slate-100 hover:bg-white/[0.07]"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sgp-gold/20 text-[10px] font-bold text-sgp-gold">
                      {getInitials(c.fullName)}
                    </span>
                    <span className="truncate">{c.fullName}</span>
                  </button>
                ))}
                {availableTeams.length > 0 && (
                  <>
                    {available.length > 0 && (
                      <div className="mx-2 my-1 border-t border-white/[0.06]" />
                    )}
                    {availableTeams.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          onAssignTeam(t.id)
                          setShowPopover(false)
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm text-slate-100 hover:bg-white/[0.07]"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-300">
                          T
                        </span>
                        <span className="truncate">{t.name}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
