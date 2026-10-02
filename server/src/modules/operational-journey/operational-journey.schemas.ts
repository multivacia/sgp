import { z } from 'zod'

const MAX_LIMIT = 100

export const operationalJourneyQuerySchema = z
  .object({
    periodPreset: z.enum(['7d', '15d', '30d', 'month', 'custom']).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
    conveyorId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    const hasFrom = Boolean(data.from?.trim())
    const hasTo = Boolean(data.to?.trim())
    const preset = data.periodPreset
    const implicitCustom = !preset && hasFrom && hasTo
    const explicitCustom = preset === 'custom'
    if (explicitCustom || implicitCustom) {
      if (!hasFrom || !hasTo) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Intervalo personalizado requer os parâmetros from e to (ISO 8601).',
          path: ['from'],
        })
      }
    }
  })
  .transform((data) => {
    const from = data.from?.trim() || undefined
    const to = data.to?.trim() || undefined
    let periodPreset: '7d' | '15d' | '30d' | 'month' | 'custom'
    if (from && to && !data.periodPreset) {
      periodPreset = 'custom'
    } else if (data.periodPreset) {
      periodPreset = data.periodPreset
    } else {
      periodPreset = '7d'
    }
    return {
      periodPreset,
      from,
      to,
      limit: data.limit ?? 20,
      conveyorId: data.conveyorId?.trim(),
    }
  })

export type OperationalJourneyQuery = z.infer<typeof operationalJourneyQuerySchema>

/** Teto de colaboradores por consulta — protege o custo da jornada consolidada. */
export const MAX_JOURNEY_COLLABORATORS = 20

/**
 * `collaboratorIds=a,b,c` — escopo multi-colaborador. Remove duplicados preservando a
 * ordem de entrada; exige ao menos 1 id e no máximo {@link MAX_JOURNEY_COLLABORATORS}.
 */
export const operationalJourneyCollaboratorIdsSchema = z
  .string({
    required_error: 'Informe collaboratorIds com ao menos um colaborador.',
    invalid_type_error: 'Informe collaboratorIds com ao menos um colaborador.',
  })
  .transform((raw) => {
    const seen = new Set<string>()
    const ids: string[] = []
    for (const part of raw.split(',')) {
      const id = part.trim()
      if (id === '' || seen.has(id)) continue
      seen.add(id)
      ids.push(id)
    }
    return ids
  })
  .pipe(
    z
      .array(z.string().uuid({ message: 'collaboratorIds contém identificador inválido.' }))
      .min(1, { message: 'Informe collaboratorIds com ao menos um colaborador.' })
      .max(MAX_JOURNEY_COLLABORATORS, {
        message: `Selecione no máximo ${MAX_JOURNEY_COLLABORATORS} colaboradores por consulta.`,
      }),
  )
