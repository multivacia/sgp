import { z } from 'zod'

const PIN_REGEX = /^\d{4,8}$/

export const productionPinSchema = z
  .string()
  .trim()
  .refine((v) => PIN_REGEX.test(v), {
    message: 'PIN deve conter de 4 a 8 dígitos numéricos, sem espaços.',
  })

export const productionLoginBodySchema = z.object({
  collaboratorId: z.string().uuid(),
  pin: productionPinSchema,
})

export const productionChangePinBodySchema = z
  .object({
    newPin: productionPinSchema,
    confirmPin: productionPinSchema,
  })
  .refine((v) => v.newPin === v.confirmPin, {
    message: 'A confirmação do PIN deve ser igual ao novo PIN.',
    path: ['confirmPin'],
  })

export type ProductionLoginBody = z.infer<typeof productionLoginBodySchema>
export type ProductionChangePinBody = z.infer<typeof productionChangePinBodySchema>

/** PIN inicial provisionado pelo script de seed — não permitido como PIN definitivo. */
export const PRODUCTION_DEFAULT_INITIAL_PIN = '1234'
