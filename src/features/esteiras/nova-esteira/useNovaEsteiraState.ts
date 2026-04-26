import { useCallback, useMemo, useState } from 'react'
import type { BacklogPriority } from '../../../mocks/backlog'
import {
  getBaseEsteira,
  type BaseEsteiraCatalogItem,
} from '../../../mocks/bases-esteira-catalog'
import {
  cloneBaseTarefaParaDraft,
  getBaseTarefa,
  type BaseTarefaCatalogItem,
} from '../../../mocks/bases-tarefa-catalog'
import { getBlocoOperacionalDef } from '../../../mocks/blocos-operacionais-catalog'
import { materializarBlocosOperacionaisParaDrafts } from '../../../mocks/nova-esteira-materialize'
import {
  computeResumoDrafts,
  type LinhaBlocoOperacionalDraft,
  type NovaEsteiraEstruturaOrigem,
  novoInstanceLinhaBloco,
  type TarefaBlocoDraft,
} from '../../../mocks/nova-esteira-domain'
import {
  montagemProntaParaMaterializar,
  snapshotComposicaoMontagem,
  type NovaEsteiraDraft,
} from '../../../mocks/nova-esteira-composicao'
import { mapBaseEsteiraParaOpcoes } from '../../../mocks/nova-esteira-base-para-opcoes'
import { buildNovaEsteiraDraftCanonico } from '../../../mocks/nova-esteira-draft-factory'
import { flattenOpcoesParaTarefasDrafts } from '../../../mocks/nova-esteira-opcoes-flatten'
import {
  areaVazia,
  criarOpcaoManualComEstruturaMinima,
  duplicarOpcaoComNovosIds,
  etapaVazia,
  ordenarAreas,
  ordenarEtapas,
  ordenarOpcoes,
} from '../../../mocks/nova-esteira-opcoes-helpers'
import type {
  NovaEsteiraAreaDraft,
  NovaEsteiraEtapaDraft,
  NovaEsteiraOpcaoDraft,
  NovaEsteiraUiState,
} from '../../../mocks/nova-esteira-jornada-draft'
import { normalizeNovaEsteiraDraft } from '../../../mocks/nova-esteira-jornada-migration'
import type { NovaEsteiraDadosIniciais } from '../../../mocks/nova-esteira-submit'
import {
  clonarAreaReferenciaParaDraft,
  clonarEtapaReferenciaParaDraft,
  clonarOpcaoReferenciaParaDraft,
  type OpcaoReferenciaCatalogo,
} from '../../../mocks/nova-esteira-reaproveitamento-catalog'

const initialDados = (): NovaEsteiraDadosIniciais => ({
  nome: '',
  cliente: '',
  veiculo: '',
  modeloVersao: '',
  placa: '',
  observacoes: '',
  responsavel: '',
  colaboradorId: undefined,
  prazoEstimado: '',
  prioridade: '' as BacklogPriority | '',
})

function reordenarOrdem(list: TarefaBlocoDraft[]): TarefaBlocoDraft[] {
  return list.map((t, i) => ({ ...t, ordem: i + 1 }))
}

function reordenarLinhasManuais(
  list: LinhaBlocoOperacionalDraft[],
): LinhaBlocoOperacionalDraft[] {
  return [...list]
}

const initialUi = (): NovaEsteiraUiState => ({
  opcaoSelecionadaId: null,
  areaDestaqueId: null,
})

export function useNovaEsteiraState() {
  const [dados, setDados] = useState<NovaEsteiraDadosIniciais>(initialDados)
  const [estruturaOrigem, setEstruturaOrigem] =
    useState<NovaEsteiraEstruturaOrigem | null>(null)
  const [tarefas, setTarefas] = useState<TarefaBlocoDraft[]>([])
  const [linhasManual, setLinhasManual] = useState<LinhaBlocoOperacionalDraft[]>(
    [],
  )
  const [baseEsteiraSelecionadaId, setBaseEsteiraSelecionadaId] = useState<
    string | null
  >(null)
  const [baseEsteiraAplicadaId, setBaseEsteiraAplicadaId] = useState<
    string | null
  >(null)
  const [catalogTarefaFocoId, setCatalogTarefaFocoId] = useState<string | null>(
    null,
  )
  const [opcoes, setOpcoes] = useState<NovaEsteiraOpcaoDraft[]>([])
  const [uiMontagem, setUiMontagem] = useState<NovaEsteiraUiState>(initialUi)

  const entradaComposicao: NovaEsteiraDraft = useMemo(
    () =>
      buildNovaEsteiraDraftCanonico({
        dados,
        estruturaOrigem,
        linhasManual,
        tarefas,
        baseEsteiraAplicadaId,
        opcoes,
      }),
    [
      dados,
      estruturaOrigem,
      linhasManual,
      tarefas,
      baseEsteiraAplicadaId,
      opcoes,
    ],
  )

  const composicaoSnapshot = useMemo(
    () => snapshotComposicaoMontagem(entradaComposicao),
    [entradaComposicao],
  )

  const tarefasEfetivas = useMemo(() => {
    if (opcoes.length > 0) {
      return flattenOpcoesParaTarefasDrafts(opcoes)
    }
    if (estruturaOrigem === 'MANUAL') {
      return materializarBlocosOperacionaisParaDrafts(
        linhasManual,
        'preview-ui-nova-esteira',
      )
    }
    if (estruturaOrigem === 'MONTAGEM_UNIFICADA') {
      const manual = materializarBlocosOperacionaisParaDrafts(
        linhasManual,
        'preview-ui-nova-esteira',
      )
      const merged = [...manual, ...tarefas]
      return reordenarOrdem(merged.map((t, i) => ({ ...t, ordem: i + 1 })))
    }
    return tarefas
  }, [opcoes, estruturaOrigem, linhasManual, tarefas])

  const resumo = useMemo(
    () => computeResumoDrafts(tarefasEfetivas),
    [tarefasEfetivas],
  )

  const setOrigem = useCallback((o: NovaEsteiraEstruturaOrigem) => {
    setEstruturaOrigem(o)
    setCatalogTarefaFocoId(null)
    setOpcoes([])
    setUiMontagem(initialUi())
    if (o === 'BASE_ESTEIRA') {
      setLinhasManual([])
      setTarefas([])
      setBaseEsteiraSelecionadaId(null)
      setBaseEsteiraAplicadaId(null)
    } else {
      setBaseEsteiraSelecionadaId(null)
      setBaseEsteiraAplicadaId(null)
      setTarefas([])
      setLinhasManual([])
    }
  }, [])

  const aplicarBaseEsteira = useCallback((be: BaseEsteiraCatalogItem) => {
    setBaseEsteiraSelecionadaId(be.id)
    setBaseEsteiraAplicadaId(be.id)
    const mapped = mapBaseEsteiraParaOpcoes(be)
    setOpcoes(mapped)
    setTarefas([])
    setLinhasManual([])
    const firstId = mapped[0]?.id ?? null
    setUiMontagem({ opcaoSelecionadaId: firstId, areaDestaqueId: null })
  }, [])

  const selecionarPreviewBaseEsteira = useCallback((id: string | null) => {
    setBaseEsteiraSelecionadaId(id)
  }, [])

  const toggleBlocoOperacional = useCallback((catalogoId: string) => {
    setLinhasManual((prev) => {
      const idx = prev.findIndex((l) => l.catalogoId === catalogoId)
      if (idx >= 0) {
        return prev.filter((_, i) => i !== idx)
      }
      const def = getBlocoOperacionalDef(catalogoId)
      if (!def) return prev
      const sub =
        def.subopcoes && def.subopcoes.length > 0
          ? def.subopcoes[0].id
          : undefined
      const nova: LinhaBlocoOperacionalDraft = {
        instanceId: novoInstanceLinhaBloco(),
        catalogoId,
        subopcaoId: sub,
        modo: null,
      }
      return [...prev, nova]
    })
  }, [])

  const setLinhaSubopcao = useCallback(
    (instanceId: string, subopcaoId: string) => {
      setLinhasManual((prev) =>
        prev.map((l) =>
          l.instanceId === instanceId ? { ...l, subopcaoId } : l,
        ),
      )
    },
    [],
  )

  const setLinhaModo = useCallback(
    (instanceId: string, modo: LinhaBlocoOperacionalDraft['modo']) => {
      setLinhasManual((prev) =>
        prev.map((l) => {
          if (l.instanceId !== instanceId) return l
          return {
            ...l,
            modo,
            referenciaId:
              modo === 'REFERENCIA' && l.modo === 'REFERENCIA'
                ? l.referenciaId
                : modo === 'REFERENCIA'
                  ? undefined
                  : undefined,
            observacaoManual:
              modo === 'MANUAL' && l.modo === 'MANUAL'
                ? l.observacaoManual
                : modo === 'MANUAL'
                  ? ''
                  : undefined,
          }
        }),
      )
    },
    [],
  )

  const setLinhaReferencia = useCallback(
    (instanceId: string, referenciaId: string) => {
      setLinhasManual((prev) =>
        prev.map((l) =>
          l.instanceId === instanceId ? { ...l, referenciaId } : l,
        ),
      )
    },
    [],
  )

  const setLinhaObservacaoManual = useCallback(
    (instanceId: string, observacaoManual: string) => {
      setLinhasManual((prev) =>
        prev.map((l) =>
          l.instanceId === instanceId ? { ...l, observacaoManual } : l,
        ),
      )
    },
    [],
  )

  const moveLinhaManual = useCallback((instanceId: string, dir: -1 | 1) => {
    setLinhasManual((prev) => {
      const i = prev.findIndex((l) => l.instanceId === instanceId)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const copy = [...prev]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return reordenarLinhasManuais(copy)
    })
  }, [])

  const removeTarefa = useCallback((id: string) => {
    setTarefas((prev) => reordenarOrdem(prev.filter((t) => t.id !== id)))
  }, [])

  const moveTarefa = useCallback((id: string, dir: -1 | 1) => {
    setTarefas((prev) => {
      const i = prev.findIndex((t) => t.id === id)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const copy = [...prev]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return reordenarOrdem(copy)
    })
  }, [])

  const addBaseTarefaDoCatalogo = useCallback((bt: BaseTarefaCatalogItem) => {
    setTarefas((prev) => {
      const draft = cloneBaseTarefaParaDraft(bt)
      draft.ordem = prev.length + 1
      return reordenarOrdem([...prev, draft])
    })
  }, [])

  const setOpcaoSelecionadaId = useCallback((id: string | null) => {
    setUiMontagem((u) => ({ ...u, opcaoSelecionadaId: id, areaDestaqueId: null }))
  }, [])

  const setAreaDestaqueId = useCallback((id: string | null) => {
    setUiMontagem((u) => ({ ...u, areaDestaqueId: id }))
  }, [])

  const addOpcaoManual = useCallback(() => {
    setOpcoes((prev) => {
      if (prev.length === 0) {
        setLinhasManual([])
        setTarefas([])
      }
      const n = criarOpcaoManualComEstruturaMinima(prev.length + 1)
      const next = ordenarOpcoes([...prev, n])
      queueMicrotask(() =>
        setUiMontagem({ opcaoSelecionadaId: n.id, areaDestaqueId: null }),
      )
      return next
    })
  }, [])

  const addOpcaoDeCatalogo = useCallback((ref: OpcaoReferenciaCatalogo) => {
    setOpcoes((prev) => {
      if (prev.length === 0) {
        setLinhasManual([])
        setTarefas([])
      }
      const cl = clonarOpcaoReferenciaParaDraft(ref)
      cl.ordem = prev.length + 1
      const next = ordenarOpcoes([...prev, cl])
      queueMicrotask(() =>
        setUiMontagem({ opcaoSelecionadaId: cl.id, areaDestaqueId: null }),
      )
      return next
    })
  }, [])

  const removeOpcao = useCallback((opcaoId: string) => {
    setOpcoes((prev) => {
      const next = ordenarOpcoes(prev.filter((o) => o.id !== opcaoId))
      setUiMontagem((u) => {
        if (u.opcaoSelecionadaId !== opcaoId) return u
        return {
          opcaoSelecionadaId: next[0]?.id ?? null,
          areaDestaqueId: null,
        }
      })
      return next
    })
  }, [])

  const moveOpcao = useCallback((opcaoId: string, dir: -1 | 1) => {
    setOpcoes((prev) => {
      const ord = ordenarOpcoes(prev)
      const i = ord.findIndex((o) => o.id === opcaoId)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= ord.length) return prev
      const copy = [...ord]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return ordenarOpcoes(copy.map((o, idx) => ({ ...o, ordem: idx + 1 })))
    })
  }, [])

  const duplicateOpcao = useCallback((opcaoId: string) => {
    setOpcoes((prev) => {
      const ord = ordenarOpcoes(prev)
      const op = ord.find((o) => o.id === opcaoId)
      if (!op) return prev
      const dup = duplicarOpcaoComNovosIds(op, ord.length + 1)
      const next = ordenarOpcoes([...ord, dup])
      queueMicrotask(() =>
        setUiMontagem({ opcaoSelecionadaId: dup.id, areaDestaqueId: null }),
      )
      return next
    })
  }, [])

  const updateOpcaoTitulo = useCallback((opcaoId: string, titulo: string) => {
    setOpcoes((prev) =>
      ordenarOpcoes(
        prev.map((o) => (o.id === opcaoId ? { ...o, titulo } : o)),
      ),
    )
  }, [])

  const addAreaManual = useCallback((opcaoId: string) => {
    setOpcoes((prev) =>
      ordenarOpcoes(
        prev.map((o) => {
          if (o.id !== opcaoId) return o
          const et = etapaVazia('Nova etapa', 60, 'manual', 1)
          const ar: NovaEsteiraAreaDraft = {
            ...areaVazia('Nova área', 'manual', o.areas.length + 1),
            etapas: [et],
          }
          return { ...o, areas: ordenarAreas([...o.areas, ar]) }
        }),
      ),
    )
  }, [])

  const addAreaDeCatalogo = useCallback(
    (opcaoId: string, ref: NovaEsteiraAreaDraft & { catalogoId?: string }) => {
      setOpcoes((prev) =>
        ordenarOpcoes(
          prev.map((o) => {
            if (o.id !== opcaoId) return o
            const cl = clonarAreaReferenciaParaDraft(ref)
            cl.ordem = o.areas.length + 1
            return { ...o, areas: ordenarAreas([...o.areas, cl]) }
          }),
        ),
      )
    },
    [],
  )

  const removeArea = useCallback((opcaoId: string, areaId: string) => {
    setOpcoes((prev) =>
      ordenarOpcoes(
        prev.map((o) => {
          if (o.id !== opcaoId) return o
          return {
            ...o,
            areas: ordenarAreas(o.areas.filter((a) => a.id !== areaId)),
          }
        }),
      ),
    )
  }, [])

  const moveArea = useCallback((opcaoId: string, areaId: string, dir: -1 | 1) => {
    setOpcoes((prev) =>
      ordenarOpcoes(
        prev.map((o) => {
          if (o.id !== opcaoId) return o
          const areas = [...o.areas].sort((a, b) => a.ordem - b.ordem)
          const i = areas.findIndex((a) => a.id === areaId)
          if (i < 0) return o
          const j = i + dir
          if (j < 0 || j >= areas.length) return o
          const copy = [...areas]
          ;[copy[i], copy[j]] = [copy[j], copy[i]]
          return { ...o, areas: ordenarAreas(copy) }
        }),
      ),
    )
  }, [])

  const updateAreaTitulo = useCallback(
    (opcaoId: string, areaId: string, titulo: string) => {
      setOpcoes((prev) =>
        ordenarOpcoes(
          prev.map((o) => {
            if (o.id !== opcaoId) return o
            return {
              ...o,
              areas: ordenarAreas(
                o.areas.map((a) =>
                  a.id === areaId ? { ...a, titulo } : a,
                ),
              ),
            }
          }),
        ),
      )
    },
    [],
  )

  const addEtapaManual = useCallback((opcaoId: string, areaId: string) => {
    setOpcoes((prev) =>
      ordenarOpcoes(
        prev.map((o) => {
          if (o.id !== opcaoId) return o
          return {
            ...o,
            areas: ordenarAreas(
              o.areas.map((a) => {
                if (a.id !== areaId) return a
                const et = etapaVazia(
                  'Nova etapa',
                  60,
                  'manual',
                  a.etapas.length + 1,
                )
                return { ...a, etapas: ordenarEtapas([...a.etapas, et]) }
              }),
            ),
          }
        }),
      ),
    )
  }, [])

  const addEtapaDeCatalogo = useCallback(
    (opcaoId: string, areaId: string, ref: NovaEsteiraEtapaDraft) => {
      setOpcoes((prev) =>
        ordenarOpcoes(
          prev.map((o) => {
            if (o.id !== opcaoId) return o
            return {
              ...o,
              areas: ordenarAreas(
                o.areas.map((a) => {
                  if (a.id !== areaId) return a
                  const cl = clonarEtapaReferenciaParaDraft(ref)
                  cl.ordem = a.etapas.length + 1
                  return { ...a, etapas: ordenarEtapas([...a.etapas, cl]) }
                }),
              ),
            }
          }),
        ),
      )
    },
    [],
  )

  const removeEtapa = useCallback(
    (opcaoId: string, areaId: string, etapaId: string) => {
      setOpcoes((prev) =>
        ordenarOpcoes(
          prev.map((o) => {
            if (o.id !== opcaoId) return o
            return {
              ...o,
              areas: ordenarAreas(
                o.areas.map((a) => {
                  if (a.id !== areaId) return a
                  return {
                    ...a,
                    etapas: ordenarEtapas(
                      a.etapas.filter((e) => e.id !== etapaId),
                    ),
                  }
                }),
              ),
            }
          }),
        ),
      )
    },
    [],
  )

  const moveEtapa = useCallback(
    (opcaoId: string, areaId: string, etapaId: string, dir: -1 | 1) => {
      setOpcoes((prev) =>
        ordenarOpcoes(
          prev.map((o) => {
            if (o.id !== opcaoId) return o
            return {
              ...o,
              areas: ordenarAreas(
                o.areas.map((a) => {
                  if (a.id !== areaId) return a
                  const etapas = [...a.etapas].sort((x, y) => x.ordem - y.ordem)
                  const i = etapas.findIndex((e) => e.id === etapaId)
                  if (i < 0) return a
                  const j = i + dir
                  if (j < 0 || j >= etapas.length) return a
                  const copy = [...etapas]
                  ;[copy[i], copy[j]] = [copy[j], copy[i]]
                  return { ...a, etapas: ordenarEtapas(copy) }
                }),
              ),
            }
          }),
        ),
      )
    },
    [],
  )

  const updateEtapaTitulo = useCallback(
    (opcaoId: string, areaId: string, etapaId: string, titulo: string) => {
      setOpcoes((prev) =>
        ordenarOpcoes(
          prev.map((o) => {
            if (o.id !== opcaoId) return o
            return {
              ...o,
              areas: ordenarAreas(
                o.areas.map((a) => {
                  if (a.id !== areaId) return a
                  return {
                    ...a,
                    etapas: ordenarEtapas(
                      a.etapas.map((e) =>
                        e.id === etapaId ? { ...e, titulo } : e,
                      ),
                    ),
                  }
                }),
              ),
            }
          }),
        ),
      )
    },
    [],
  )

  const updateEtapaTempoMin = useCallback(
    (opcaoId: string, areaId: string, etapaId: string, tempoEstimadoMin: number) => {
      setOpcoes((prev) =>
        ordenarOpcoes(
          prev.map((o) => {
            if (o.id !== opcaoId) return o
            return {
              ...o,
              areas: ordenarAreas(
                o.areas.map((a) => {
                  if (a.id !== areaId) return a
                  return {
                    ...a,
                    etapas: ordenarEtapas(
                      a.etapas.map((e) =>
                        e.id === etapaId ? { ...e, tempoEstimadoMin } : e,
                      ),
                    ),
                  }
                }),
              ),
            }
          }),
        ),
      )
    },
    [],
  )

  const resetAll = useCallback(() => {
    setDados(initialDados())
    setEstruturaOrigem(null)
    setTarefas([])
    setLinhasManual([])
    setOpcoes([])
    setBaseEsteiraSelecionadaId(null)
    setBaseEsteiraAplicadaId(null)
    setCatalogTarefaFocoId(null)
    setUiMontagem(initialUi())
  }, [])

  const hydrateFromDraft = useCallback((draft: NovaEsteiraDraft) => {
    const d = normalizeNovaEsteiraDraft(draft)
    setDados(d.dados)
    setEstruturaOrigem(d.estruturaOrigem)
    const op = d.opcoes ?? []
    setOpcoes(op)
    if (op.length > 0) {
      setLinhasManual([])
      setTarefas([])
      setUiMontagem({
        opcaoSelecionadaId: op[0]?.id ?? null,
        areaDestaqueId: null,
      })
    } else if (d.estruturaOrigem === 'MONTAGEM_UNIFICADA') {
      setLinhasManual(d.linhasManual)
      setTarefas(d.tarefas)
      setUiMontagem(initialUi())
    } else if (
      d.estruturaOrigem === 'BASE_ESTEIRA' ||
      d.estruturaOrigem === 'BASE_TAREFA'
    ) {
      setLinhasManual([])
      setTarefas(d.tarefas)
      setUiMontagem(initialUi())
    } else {
      setLinhasManual([])
      setTarefas([])
      setUiMontagem(initialUi())
    }
    setBaseEsteiraSelecionadaId(d.baseEsteiraAplicadaId)
    setBaseEsteiraAplicadaId(d.baseEsteiraAplicadaId)
    setCatalogTarefaFocoId(null)
  }, [])

  const podeCriar = useMemo(
    () => montagemProntaParaMaterializar(composicaoSnapshot),
    [composicaoSnapshot],
  )

  const previewBaseEsteira: BaseEsteiraCatalogItem | null = useMemo(() => {
    if (!baseEsteiraSelecionadaId) return null
    return getBaseEsteira(baseEsteiraSelecionadaId) ?? null
  }, [baseEsteiraSelecionadaId])

  const previewBaseTarefaCatalogo: BaseTarefaCatalogItem | null = useMemo(() => {
    if (!catalogTarefaFocoId) return null
    return getBaseTarefa(catalogTarefaFocoId) ?? null
  }, [catalogTarefaFocoId])

  return {
    dados,
    setDados,
    estruturaOrigem,
    setOrigem,
    opcoes,
    setOpcoes,
    tarefas,
    setTarefas,
    linhasManual,
    tarefasEfetivas,
    resumo,
    composicaoSnapshot,
    baseEsteiraSelecionadaId,
    baseEsteiraAplicadaId,
    catalogTarefaFocoId,
    setCatalogTarefaFocoId,
    previewBaseEsteira,
    previewBaseTarefaCatalogo,
    aplicarBaseEsteira,
    selecionarPreviewBaseEsteira,
    toggleBlocoOperacional,
    setLinhaSubopcao,
    setLinhaModo,
    setLinhaReferencia,
    setLinhaObservacaoManual,
    moveLinhaManual,
    removeTarefa,
    moveTarefa,
    addBaseTarefaDoCatalogo,
    resetAll,
    hydrateFromDraft,
    podeCriar,
    uiMontagem,
    setOpcaoSelecionadaId,
    setAreaDestaqueId,
    addOpcaoManual,
    addOpcaoDeCatalogo,
    removeOpcao,
    moveOpcao,
    duplicateOpcao,
    updateOpcaoTitulo,
    addAreaManual,
    addAreaDeCatalogo,
    removeArea,
    moveArea,
    updateAreaTitulo,
    addEtapaManual,
    addEtapaDeCatalogo,
    removeEtapa,
    moveEtapa,
    updateEtapaTitulo,
    updateEtapaTempoMin,
  }
}
