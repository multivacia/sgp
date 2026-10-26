import { z } from 'zod'

const backupFileNameSchema = z
  .string()
  .trim()
  .regex(
    /^sgp_\d{8}-\d{6}_(scheduled|manual|pre-deploy|pre-restore)\.dump$/,
    'Nome de arquivo de backup inválido.',
  )

export const backupFileParamSchema = z.object({
  fileName: backupFileNameSchema,
})

export const restoreBodySchema = z.object({
  fileName: backupFileNameSchema,
  databaseName: z.string().trim().min(1, 'Digite o nome da base para confirmar.'),
})
