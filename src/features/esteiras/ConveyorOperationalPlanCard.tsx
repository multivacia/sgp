import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ConveyorOperationalStatus, ConveyorStructure } from '../../domain/conveyors/conveyor.types'
import type {
  ConveyorOperationalPlanGenerationPreview,
  ConveyorOperationalPlanPayload,
} from '../../domain/conveyor-operational-plan/conveyor-operational-plan.types'
import {
  collectConveyorPlanStepOptions,
} from '../../domain/conveyor-operational-plan/collectConveyorPlanStepOptions'
import { isConveyorPlanRegeneration } from '../../domain/conveyor-operational-plan/conveyorPlanGenerationPreviewDisplay'
import { reportClientError } from '../../lib/errors'
import { ApiError } from '../../lib/api/apiErrors'
import {
  approveConveyorOperationalPlan,
  createConveyorOperationalPlan,
  createConveyorOperationalPlanItem,
  generateConveyorOperationalPlanItems,
  previewConveyorOperationalPlanGeneratedItems,
  getConveyorOperationalPlan,
  sendConveyorOperationalPlanToFactory,
  updateConveyorOperationalPlanItem,
} from '../../services/conveyor-operational-plan/conveyorOperationalPlanApiService'
import { ConveyorOperationalPlanBody } from './conveyor-operational-plan/ConveyorOperationalPlanBody'
import { ConveyorOperationalPlanEmptyState } from './conveyor-operational-plan/ConveyorOperationalPlanEmptyState'

type Props = {
  conveyorId: string
  operationalStatus: ConveyorOperationalStatus
  structure: ConveyorStructure
  canEdit: boolean
}

export function ConveyorOperationalPlanCard({
  conveyorId,
  operationalStatus,
  structure,
  canEdit,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<ConveyorOperationalPlanPayload | null>(null)
  const [hasPlan, setHasPlan] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [activityNodeId, setActivityNodeId] = useState('')
  const [plannedDate, setPlannedDate] = useState('')
  const [plannedOrder, setPlannedOrder] = useState(0)
  const [plannedMinutes, setPlannedMinutes] = useState<number | ''>('')
  const [generateStartDate, setGenerateStartDate] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [generationPreview, setGenerationPreview] =
    useState<ConveyorOperationalPlanGenerationPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const stepOptions = useMemo(() => collectConveyorPlanStepOptions(structure), [structure])
  const plannedActivityIds = useMemo(
    () => new Set((payload?.items ?? []).map((i) => i.activityNodeId)),
    [payload?.items],
  )
  const availableSteps = useMemo(
    () => stepOptions.filter((s) => !plannedActivityIds.has(s.id)),
    [stepOptions, plannedActivityIds],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getConveyorOperationalPlan(conveyorId)
      setPayload(res.data)
      setHasPlan(res.hasPlan)
    } catch (e) {
      reportClientError(e, { module: 'conveyor-operational-plan', action: 'load' })
      setError('Não foi possível carregar o plano operacional da esteira.')
    } finally {
      setLoading(false)
    }
  }, [conveyorId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (payload?.plan.plannedStartDate) {
      setGenerateStartDate(payload.plan.plannedStartDate)
    }
  }, [payload?.plan.plannedStartDate])

  async function runAction(
    action: () => Promise<ConveyorOperationalPlanPayload>,
  ): Promise<ConveyorOperationalPlanPayload | undefined> {
    setBusy(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const data = await action()
      setPayload(data)
      setHasPlan(true)
      return data
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : 'Não foi possível concluir a operação no plano operacional.'
      setError(msg)
      reportClientError(e, { module: 'conveyor-operational-plan', action: 'mutate' })
      return undefined
    } finally {
      setBusy(false)
    }
  }

  const plan = payload?.plan
  const items = payload?.items ?? []
  const activeItems = items.filter((i) => i.status !== 'CANCELLED')

  async function executeGeneration(plannedStartDate: string, overwrite: boolean) {
    if (!plan) return
    const data = await runAction(() =>
      generateConveyorOperationalPlanItems(conveyorId, plan.id, {
        plannedStartDate,
        overwrite,
      }),
    )
    if (!data) return
    setGenerationPreview(null)
    const reviewCount = data.items.filter(
      (i) => i.reviewRequired && i.status !== 'CANCELLED',
    ).length
    setSuccessMessage(
      overwrite
        ? reviewCount > 0
          ? `Plano regenerado. ${reviewCount} atividade(s) precisam de revisão.`
          : 'Plano regenerado a partir da estrutura atual da esteira.'
        : reviewCount > 0
          ? `Itens gerados. ${reviewCount} atividade(s) precisam de revisão.`
          : 'Itens gerados a partir da estrutura da esteira.',
    )
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-6">
      {loading ? <p className="text-sm text-slate-400">Carregando plano…</p> : null}

      {error ? (
        <p className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-100">
          {error}
        </p>
      ) : null}

      {!loading && !hasPlan ? (
        <ConveyorOperationalPlanEmptyState
          canEdit={canEdit}
          operationalStatus={operationalStatus}
          busy={busy}
          onCreate={() => void runAction(() => createConveyorOperationalPlan(conveyorId, {}))}
        />
      ) : null}

      {!loading && payload && plan ? (
        <ConveyorOperationalPlanBody
          payload={payload}
          structure={structure}
          canEdit={canEdit}
          busy={busy}
          addOpen={addOpen}
          setAddOpen={setAddOpen}
          activityNodeId={activityNodeId}
          setActivityNodeId={setActivityNodeId}
          plannedDate={plannedDate}
          setPlannedDate={setPlannedDate}
          plannedOrder={plannedOrder}
          setPlannedOrder={setPlannedOrder}
          plannedMinutes={plannedMinutes}
          setPlannedMinutes={setPlannedMinutes}
          availableSteps={availableSteps}
          setSuccessMessage={setSuccessMessage}
          onApprove={() =>
            void runAction(() => approveConveyorOperationalPlan(conveyorId, plan.id)).then(
              (data) => {
                if (data) {
                  setSuccessMessage(
                    'Plano aprovado. A execução não foi iniciada — envie para o Planejamento da Fábrica quando estiver pronto.',
                  )
                }
                return data
              },
            )
          }
          onSendToFactory={() =>
            void runAction(() => sendConveyorOperationalPlanToFactory(conveyorId, plan.id)).then(
              (data) => {
                if (data) {
                  setSuccessMessage(
                    'Plano enviado. Aguardando encaixe no Planejamento da Fábrica — responsabilidade do gestor da fábrica.',
                  )
                }
                return data
              },
            )
          }
          onSaveItem={(itemId, input) =>
            runAction(() => updateConveyorOperationalPlanItem(conveyorId, plan.id, itemId, input))
          }
          generateStartDate={generateStartDate}
          setGenerateStartDate={setGenerateStartDate}
          successMessage={successMessage}
          activeItemsCount={activeItems.length}
          generationPreview={generationPreview}
          previewLoading={previewLoading}
          onDismissGenerationPreview={() => setGenerationPreview(null)}
          onRequestGenerate={async () => {
            const date = generateStartDate.trim()
            if (!date) {
              setError('Informe a data de início planejada para gerar os itens.')
              return
            }
            if (isConveyorPlanRegeneration(activeItems.length)) {
              setPreviewLoading(true)
              setError(null)
              try {
                const preview = await previewConveyorOperationalPlanGeneratedItems(
                  conveyorId,
                  plan.id,
                  { plannedStartDate: date },
                )
                setGenerationPreview(preview)
              } catch (e) {
                const msg =
                  e instanceof ApiError
                    ? e.message
                    : 'Não foi possível carregar a prévia da regeneração.'
                setError(msg)
                reportClientError(e, {
                  module: 'conveyor-operational-plan',
                  action: 'preview-generation',
                })
              } finally {
                setPreviewLoading(false)
              }
              return
            }
            void executeGeneration(date, false)
          }}
          onConfirmRegeneration={() => {
            const date = generateStartDate.trim()
            if (!date) return
            void executeGeneration(date, true)
          }}
          onAddItem={() => {
            if (!activityNodeId) return
            const step = stepOptions.find((s) => s.id === activityNodeId)
            void runAction(() =>
              createConveyorOperationalPlanItem(conveyorId, plan.id, {
                activityNodeId,
                plannedDate: plannedDate.trim() || null,
                plannedOrder,
                plannedMinutes:
                  plannedMinutes === '' ? (step?.plannedMinutes ?? null) : Number(plannedMinutes),
              }),
            ).then(() => {
              setAddOpen(false)
              setActivityNodeId('')
              setPlannedDate('')
              setPlannedOrder(0)
              setPlannedMinutes('')
            })
          }}
        />
      ) : null}
    </section>
  )
}
