import { z } from 'zod'

export const loginBodySchema = z.object({
  email: z.string().trim().email('E-mail inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
})

const minPasswordLen = 8

export const changePasswordBodySchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    newPassword: z
      .string()
      .min(minPasswordLen, `A nova senha deve ter pelo menos ${minPasswordLen} caracteres.`),
    confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'A confirmação não coincide com a nova senha.',
    path: ['confirmPassword'],
  })
