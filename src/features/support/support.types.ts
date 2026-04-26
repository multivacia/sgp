export type SupportTicketCreateInput = {
  category: string
  title: string
  description: string
  isBlocking: boolean
  moduleName?: string | null
  routePath?: string | null
  context?: Record<string, unknown>
  requestId?: string | null
  correlationId?: string | null
}

export type SupportTicketCreateResult = {
  id: string
  code: string
  status: string
  notificationSummary: {
    email: 'SENT' | 'FAILED' | 'SKIPPED' | 'PENDING'
    whatsapp: 'SENT' | 'FAILED' | 'SKIPPED' | 'PENDING'
  }
  createdAt: string
}
