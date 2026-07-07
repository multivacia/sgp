import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TimeEntryJustificationOption } from '../../domain/operational-settings/timeEntryJustifications.types'
import {
  buildJustificationFieldFromOption,
  OPERATIONAL_JUSTIFICATION_MESSAGES,
  pickPreferredJustificationId,
} from '../../domain/operational/timeEntryJustificationField'
import {
  listMyTimeEntryJustifications,
  listProductionTimeEntryJustifications,
} from '../../services/time-entry-justifications/timeEntryJustificationsSelectionApiService'

export const JUSTIFICATION_SELECT_MESSAGES = OPERATIONAL_JUSTIFICATION_MESSAGES

export type JustificationSelectChannel = 'app' | 'production'

export type JustificationSelectProps = {
  channel: JustificationSelectChannel
  value: string
  complement: string
  legacyText: string
  onChange: (next: {
    justificationId: string | null
    justificationComplement: string
    legacyText: string
  }) => void
  disabled?: boolean
  idPrefix?: string
  /** Categoria sugerida para pré-seleção (ex.: SEQUENCE, SUBSTITUTION). */
  preferredCategory?: string | null
  /** Dica de label para refinar pré-seleção dentro da categoria. */
  preferredLabelHint?: string | null
  /** Quando true, exibe indicador de obrigatoriedade (exceção/OOS). */
  required?: boolean
  /** Estado do catálogo para validação externa. */
  onCatalogStateChange?: (state: {
    useFallback: boolean
    selectedRequiresComplement: boolean
  }) => void
}

function buildLegacyText(label: string, complement: string): string {
  const c = complement.trim()
  return c ? `${label} — ${c}` : label
}

export function JustificationSelect({
  channel,
  value,
  complement,
  legacyText,
  onChange,
  disabled = false,
  idPrefix = 'justification',
  preferredCategory = null,
  preferredLabelHint = null,
  required = false,
  onCatalogStateChange,
}: JustificationSelectProps) {
  const [options, setOptions] = useState<TimeEntryJustificationOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [catalogEmpty, setCatalogEmpty] = useState(false)
  const preselectAppliedRef = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadFailed(false)
    setCatalogEmpty(false)
    preselectAppliedRef.current = false
    try {
      const data =
        channel === 'production'
          ? await listProductionTimeEntryJustifications()
          : await listMyTimeEntryJustifications()
      setOptions(data)
      if (data.length === 0) {
        setCatalogEmpty(true)
        console.warn(
          '[JustificationSelect] Nenhuma justificativa operacional ativa encontrada.',
          { channel },
        )
      }
    } catch (error) {
      setOptions([])
      setLoadFailed(true)
      console.warn(
        '[JustificationSelect] Falha ao carregar justificativas operacionais; usando fallback.',
        { channel, error },
      )
    } finally {
      setLoading(false)
    }
  }, [channel])

  useEffect(() => {
    void load()
  }, [load])

  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value],
  )

  const useFallback = loadFailed || catalogEmpty

  useEffect(() => {
    onCatalogStateChange?.({
      useFallback,
      selectedRequiresComplement: selected?.requiresComplement ?? false,
    })
  }, [useFallback, selected, onCatalogStateChange])

  useEffect(() => {
    if (loading || useFallback || preselectAppliedRef.current || value || !preferredCategory) return
    const preferredId = pickPreferredJustificationId(
      options,
      preferredCategory,
      preferredLabelHint,
    )
    if (!preferredId) return
    const opt = options.find((o) => o.id === preferredId)
    if (!opt) return
    preselectAppliedRef.current = true
    onChange(buildJustificationFieldFromOption(opt))
  }, [
    loading,
    useFallback,
    value,
    options,
    preferredCategory,
    preferredLabelHint,
    onChange,
  ])

  if (loading) {
    return <p className="text-xs text-slate-500">Carregando justificativas…</p>
  }

  if (useFallback) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-amber-200/90">
          {catalogEmpty
            ? JUSTIFICATION_SELECT_MESSAGES.emptyCatalog
            : JUSTIFICATION_SELECT_MESSAGES.fallback}
        </p>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          {JUSTIFICATION_SELECT_MESSAGES.label}
          <textarea
            value={legacyText}
            disabled={disabled}
            onChange={(e) =>
              onChange({
                justificationId: null,
                justificationComplement: '',
                legacyText: e.target.value,
              })
            }
            rows={3}
            className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
          />
        </label>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {JUSTIFICATION_SELECT_MESSAGES.label}
        {required ? <span className="text-rose-300/90"> *</span> : null}
        {!required ? (
          <span className="ml-1 text-[10px] font-normal normal-case tracking-normal text-slate-500">
            (opcional)
          </span>
        ) : null}
        <select
          id={`${idPrefix}-motivo`}
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const nextId = e.target.value
            const opt = options.find((o) => o.id === nextId)
            const nextComplement = opt?.requiresComplement ? complement : ''
            onChange({
              justificationId: nextId || null,
              justificationComplement: nextComplement,
              legacyText: opt ? buildLegacyText(opt.label, nextComplement) : '',
            })
          }}
          className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
        >
          <option value="">{JUSTIFICATION_SELECT_MESSAGES.placeholder}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id} title={o.description ?? undefined}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {selected?.description ? (
        <p className="text-xs text-slate-400">{selected.description}</p>
      ) : null}
      {selected?.requiresComplement ? (
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          {JUSTIFICATION_SELECT_MESSAGES.complementLabel}
          <span className="text-rose-300/90"> *</span>
          <textarea
            id={`${idPrefix}-complemento`}
            value={complement}
            disabled={disabled}
            onChange={(e) => {
              const nextComplement = e.target.value
              onChange({
                justificationId: value || null,
                justificationComplement: nextComplement,
                legacyText: selected
                  ? buildLegacyText(selected.label, nextComplement)
                  : legacyText,
              })
            }}
            rows={2}
            className="sgp-input-app mt-1.5 w-full rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2.5 text-sm text-slate-200"
          />
          <span className="mt-1 block text-[11px] font-normal normal-case tracking-normal text-slate-500">
            {JUSTIFICATION_SELECT_MESSAGES.complementHelp}
          </span>
        </label>
      ) : null}
    </div>
  )
}

export function validateJustificationSelectValue(input: {
  useFallback: boolean
  justificationId: string | null
  legacyText: string
  requiresComplement: boolean
  complement: string
}): string | null {
  if (input.useFallback) {
    return input.legacyText.trim().length > 0
      ? null
      : JUSTIFICATION_SELECT_MESSAGES.missingSelection
  }
  if (!input.justificationId) {
    return JUSTIFICATION_SELECT_MESSAGES.missingSelection
  }
  if (input.requiresComplement && !input.complement.trim()) {
    return JUSTIFICATION_SELECT_MESSAGES.missingComplement
  }
  return null
}
