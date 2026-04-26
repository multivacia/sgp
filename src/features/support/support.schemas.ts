import type { SupportTicketCreateInput } from './support.types'

export function validateSupportTicketInput(input: SupportTicketCreateInput): string | null {
  if (!input.category.trim()) return 'Selecione uma categoria.'
  if (!input.title.trim()) return 'Informe o assunto.'
  if (!input.description.trim()) return 'Informe a descrição.'
  if (input.title.trim().length > 160) return 'Assunto deve ter no máximo 160 caracteres.'
  return null
}
