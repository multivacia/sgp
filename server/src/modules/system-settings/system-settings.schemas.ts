import { z } from 'zod'

export const patchSystemSettingBodySchema = z.object({
  value: z.union([
    z.number().int('O valor deve ser um número inteiro.'),
    z
      .string()
      .trim()
      .min(1, 'Informe um valor.')
      .regex(/^\d+$/, 'O valor deve ser um número inteiro.')
      .transform((raw) => Number.parseInt(raw, 10)),
  ]),
})

export const systemSettingKeyParamSchema = z.object({
  key: z.string().trim().min(1),
})
