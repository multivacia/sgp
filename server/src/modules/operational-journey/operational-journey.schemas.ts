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

/** Máximo de colaboradores por exportação (protege o banco e o tamanho do arquivo). */
export const OPERATIONAL_JOURNEY_EXPORT_MAX_COLLABORATORS = 50

/**
 * `collaboratorIds` aceita lista separada por vírgula e/ou parâmetro repetido.
 * Duplicados são removidos preservando a ordem.
 */
export const operationalJourneyExportCollaboratorIdsSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((raw) =>
    (Array.isArray(raw) ? raw : [raw])
      .flatMap((v) => v.split(','))
      .map((v) => v.trim())
      .filter((v) => v.length > 0),
  )
  .pipe(
    z
      .array(z.string().uuid('Identificador de colaborador inválido.'))
      .min(1, 'Selecione ao menos um colaborador.')
      .transform((ids) => [...new Set(ids)])
      .refine((ids) => ids.length <= OPERATIONAL_JOURNEY_EXPORT_MAX_COLLABORATORS, {
        message: `Selecione no máximo ${OPERATIONAL_JOURNEY_EXPORT_MAX_COLLABORATORS} colaboradores por exportação.`,
      }),
  )

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
