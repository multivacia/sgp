import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { PageCanvas } from '../../components/ui/PageCanvas'
import {
  SgpInlineBanner,
  SgpToast,
  type SgpToastVariant,
} from '../../components/ui/SgpToast'
import { formatHumanMinutes } from '../../lib/formatters'
import {
  isBlockingSeverity,
  presentationPlan,
  reportClientError,
} from '../../lib/errors'
import { useSgpErrorSurface } from '../../lib/errors/SgpErrorPresentation'
import { listMyActivities } from '../../services/my-activities/myActivitiesApiService'
import { postConveyorStepTimeEntry } from '../../services/conveyors/conveyorStepAssignmentsApiService'
import type { MyActivityItem } from '../../domain/my-activities/my-activities.types'
import { useAuth } from '../../lib/use-auth'
import {
  OPERATIONAL_BUCKET_LABELS,
  parseFlexibleDeadlineToDate,
} from '../../lib/backlog/operationalBuckets'
import { labelRoleInStep } from './minhasAtividadesLabels'
import { transversalUxCopy } from '../../lib/transversalUxCopy'

type ToastState = { message: string; variant: SgpToastVariant } | null

function bucketBadgeClass(bucket: MyActivityItem['operationalBucket']): string {
  if (bucket === 'em_atraso') {
    return 'border-rose-400/35 bg-rose-500/12 text-rose-100 ring-1 ring-rose-500/20'
  }
  if (bucket === 'concluidas') {
    return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100/95 ring-1 ring-emerald-500/15'
  }
  return 'border-white/12 bg-white/[0.05] text-slate-300 ring-1 ring-white/[0.06]'
}

export function ApontamentoPage() {
  const { taskId: stepNodeId } = useParams<{ taskId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { presentBlocking } = useSgpErrorSurface()
  const { user, ready: authReady } = useAuth()

  const conveyorId =
    searchParams.get('conveyorId') ?? searchParams.get('esteiraId') ?? undefined
  const from = searchParams.get('from')
  const fromEsteira = from === 'esteira'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activity, setActivity] = useState<MyActivityItem | null>(null)

  const [minutosStr, setMinutosStr] = useState('30')
  const [observacao, setObservacao] = useState('')
  const [toast, setToast] = useState<ToastState>(null)
  const [submitBanner, setSubmitBanner] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadContext = useCallback(async () => {
    if (!stepNodeId || !conveyorId) {
      setError('Parâmetros em falta: indique a esteira e o passo (URL incompleta).')
      setActivity(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const rows = await listMyActivities()
      const found = rows.find(
        (r) => r.stepNodeId === stepNodeId && r.conveyorId === conveyorId,
      )
      if (!found) {
        setError(
          'Esta atividade não consta nas suas alocações atuais. Volte a Minhas atividades ou abra a partir do painel.',
        )
        setActivity(null)
        return
      }
      setActivity(found)
    } catch (e) {
      setActivity(null)
      const n = reportClientError(e, {
        module: 'colaborador',
        action: 'apontamento_load_context',
        route: pathname,
        entityId: conveyorId,
      })
      if (isBlockingSeverity(n.severity)) {
        presentBlocking(n)
      } else {
        setError(n.userMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [stepNodeId, conveyorId])

  useEffect(() => {
    if (!authReady || !user) return
    void loadContext()
  }, [authReady, user, loadContext])

  const minutos = Number.parseInt(minutosStr, 10)
  const minutosValidos = Number.isInteger(minutos) && minutos >= 1

  const deadlineLine = useMemo(() => {
    if (!activity?.estimatedDeadline?.trim()) return null
    const d = parseFlexibleDeadlineToDate(activity.estimatedDeadline)
    if (d) {
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    }
    return activity.estimatedDeadline.trim()
  }, [activity])

  function pushToast(message: string, variant: SgpToastVariant = 'success') {
    setToast({ message, variant })
  }

  async function handleRegistrar() {
    if (
      !activity ||
      !stepNodeId ||
      !conveyorId ||
      !user ||
      submitting ||
      !minutosValidos
    ) {
      return
    }
    if (!user.collaboratorId) {
      pushToast(transversalUxCopy.collaboratorLinkMissingToast, 'error')
      return
    }
    setSubmitting(true)
    setToast(null)
    setSubmitBanner(null)
    try {
      await postConveyorStepTimeEntry(conveyorId, stepNodeId, {
        minutes: minutos,
        notes: observacao.trim() || null,
        entryMode: 'manual',
      })
      setObservacao('')
      navigate('/app/minhas-atividades', {
        replace: false,
        state: { refreshMyActivities: true },
      })
    } catch (e) {
      const n = reportClientError(e, {
        module: 'colaborador',
        action: 'apontamento_submit',
        route: pathname,
        entityId: conveyorId ?? undefined,
      })
      const plan = presentationPlan(n)
      if (plan.surface === 'modal') {
        presentBlocking(n)
      } else if (plan.surface === 'banner') {
        setSubmitBanner(n.userMessage)
      } else {
        pushToast(n.userMessage, 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!authReady) {
    return (
      <PageCanvas>
        <p className="text-sm text-slate-500">Carregando sessão…</p>
      </PageCanvas>
    )
  }

  if (!user) {
    return (
      <PageCanvas>
        <p className="text-sm text-slate-400">Inicie sessão para apontar.</p>
      </PageCanvas>
    )
  }

  if (!user.collaboratorId) {
    return (
      <PageCanvas>
        <div className="sgp-panel max-w-lg rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/90">
            {transversalUxCopy.collaboratorLinkMissingTitle}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            {transversalUxCopy.collaboratorLinkMissingBody}
          </p>
          <Link
            to="/app/minhas-atividades"
            className="sgp-cta-primary mt-6 inline-flex text-center"
          >
            Voltar a Minhas atividades
          </Link>
        </div>
      </PageCanvas>
    )
  }

  if (!stepNodeId || !conveyorId) {
    return (
      <PageCanvas>
        <div className="sgp-panel max-w-lg rounded-2xl border border-white/[0.08] p-8">
          <p className="font-heading text-lg text-slate-200">URL incompleta</p>
          <p className="mt-2 text-sm text-slate-500">
            Abra o apontamento a partir de Minhas atividades ou do detalhe da
            esteira (parâmetros conveyorId e passo).
          </p>
          <Link
            to="/app/minhas-atividades"
            className="sgp-cta-primary mt-6 inline-flex text-center"
          >
            Minhas atividades
          </Link>
        </div>
      </PageCanvas>
    )
  }

  if (loading) {
    return (
      <PageCanvas>
        <p className="text-sm text-slate-500">Carregando atividade…</p>
      </PageCanvas>
    )
  }

  if (error || !activity) {
    return (
      <PageCanvas>
        <div className="sgp-panel max-w-lg rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] p-8">
          <p className="font-heading text-lg text-slate-100">
            Não foi possível abrir o apontamento
          </p>
          <p className="mt-2 text-sm text-slate-400">{error}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              to="/app/minhas-atividades"
              className="sgp-cta-primary inline-flex text-center"
            >
              Minhas atividades
            </Link>
            <Link
              to="/app/backlog"
              className="sgp-cta-secondary inline-flex text-center"
            >
              Painel operacional
            </Link>
          </div>
        </div>
      </PageCanvas>
    )
  }

  const backTo = fromEsteira
    ? { to: `/app/esteiras/${conveyorId}`, label: 'Detalhe da esteira' }
    : { to: '/app/minhas-atividades', label: 'Minhas atividades' }

  return (
    <PageCanvas>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to={backTo.to}
          className="group inline-flex items-center gap-2 text-sm font-semibold text-sgp-blue-bright transition hover:text-sky-300"
        >
          <span className="transition-transform group-hover:-translate-x-0.5">
            ←
          </span>
          {backTo.label}
        </Link>
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
          Apontamento de horas
        </p>
      </div>

      {toast && (
        <SgpToast
          fixed
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}

      {submitBanner ? (
        <SgpInlineBanner
          variant="error"
          message={submitBanner}
          className="mt-4"
        />
      ) : null}

      <header className="relative mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-sgp-navy/90 via-sgp-app-panel-deep/95 to-sgp-app-panel/90 p-6 shadow-[var(--sgp-shadow-card-dark)] ring-1 ring-white/[0.06] md:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sgp-gold">
          {fromEsteira ? 'Origem · esteira' : 'Origem · minhas atividades'}
        </p>
        <p className="relative mt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Etapa (STEP)
        </p>
        <div className="relative mt-1 flex flex-wrap items-start gap-3">
          <h1 className="sgp-page-title min-w-0 flex-1 leading-tight">
            {activity.stepName}
          </h1>
          <span
            className={`rounded-lg px-2.5 py-1 text-[11px] font-bold ${bucketBadgeClass(activity.operationalBucket)}`}
          >
            {OPERATIONAL_BUCKET_LABELS[activity.operationalBucket]}
          </span>
        </div>
        <div className="relative mt-4 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
          <p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Opção
            </span>
            <span className="mt-0.5 block font-medium text-slate-200">
              {activity.optionName}
            </span>
          </p>
          <p>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Área
            </span>
            <span className="mt-0.5 block font-medium text-slate-200">
              {activity.areaName}
            </span>
          </p>
        </div>
        <div className="relative mt-3 text-sm text-slate-400">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Esteira
          </span>
          <span className="mt-0.5 block font-medium text-slate-200">
            {activity.conveyorName}
            {activity.conveyorCode ? (
              <span className="ml-2 text-slate-500">· {activity.conveyorCode}</span>
            ) : null}
          </span>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
          <span className="text-slate-500">
            Papel no passo:{' '}
            <span className="font-medium text-slate-300">
              {labelRoleInStep(activity.roleInStep)}
            </span>
          </span>
          {deadlineLine ? (
            <span className="text-slate-500">
              Prazo estimado:{' '}
              <span className="text-slate-300">{deadlineLine}</span>
            </span>
          ) : null}
        </div>
        <p className="relative mt-3 text-xs text-slate-500">
          Planejado · realizado (seus apontamentos):{' '}
          <span className="font-semibold text-slate-300">
            {activity.plannedMinutes != null
              ? `${formatHumanMinutes(activity.plannedMinutes)} planej. · `
              : '— planej. · '}
            {activity.realizedMinutes != null
              ? `${formatHumanMinutes(activity.realizedMinutes)} realizado`
              : '— realizado'}
          </span>
        </p>
      </header>

      <div className="mt-6 space-y-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 shadow-[var(--sgp-shadow-card-dark)] ring-1 ring-white/[0.05]">
        <div>
          <label
            htmlFor="apont-min"
            className="text-[10px] font-bold uppercase tracking-wider text-slate-500"
          >
            Minutos realizados
          </label>
          <input
            id="apont-min"
            type="number"
            inputMode="numeric"
            min={1}
            value={minutosStr}
            onChange={(e) => setMinutosStr(e.target.value)}
            disabled={submitting}
            className="sgp-input-app mt-2 max-w-[8rem] px-3 py-2.5 font-heading text-lg font-bold tabular-nums text-white"
          />
          <p className="mt-2 text-xs text-slate-600">
            Valor inteiro maior que zero. O registro é validado no servidor.
          </p>
        </div>

        <div>
          <label
            htmlFor="apont-obs"
            className="text-[10px] font-bold uppercase tracking-wider text-slate-500"
          >
            Observação · opcional
          </label>
          <textarea
            id="apont-obs"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            disabled={submitting}
            className="sgp-input-app mt-2 w-full resize-none px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600"
            placeholder="Nota curta sobre o trabalho realizado."
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={submitting || !minutosValidos}
            onClick={() => void handleRegistrar()}
            className="sgp-cta-primary !px-8 !py-3 text-sm disabled:opacity-45"
          >
            {submitting ? 'A registar…' : 'Registar apontamento'}
          </button>
          <Link
            to={`/app/esteiras/${conveyorId}`}
            className="sgp-cta-secondary !inline-flex !py-3 text-sm"
          >
            Ver esteira
          </Link>
        </div>
      </div>
    </PageCanvas>
  )
}
