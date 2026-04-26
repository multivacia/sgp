import { useState } from 'react'
import { createSupportTicket } from './support.api'
import { validateSupportTicketInput } from './support.schemas'
import type { SupportTicketCreateInput, SupportTicketCreateResult } from './support.types'

export function useOpenSupportTicket() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(input: SupportTicketCreateInput): Promise<SupportTicketCreateResult | null> {
    const validationError = validateSupportTicketInput(input)
    if (validationError) {
      setError(validationError)
      return null
    }
    try {
      setSubmitting(true)
      setError(null)
      return await createSupportTicket(input)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível abrir o chamado.')
      return null
    } finally {
      setSubmitting(false)
    }
  }

  return { submit, submitting, error, clearError: () => setError(null) }
}
