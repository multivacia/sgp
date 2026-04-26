export type SupportTicketPeriodParam = 'all' | 'today' | '7d' | '30d'

export type SupportTicketListParams = {
  q?: string
  status?: string
  category?: string
  severity?: string
  period?: SupportTicketPeriodParam
}

export type SupportTicketDetail = {
  id: string
  code: string
  status: string
  category: string
  severity: string
  title: string
  description: string
  createdByUserId: string
  createdByCollaboratorId: string | null
  moduleName: string | null
  routePath: string | null
  context: Record<string, unknown>
  requestId: string | null
  correlationId: string | null
  createdAt: string
  updatedAt: string
}

export type SupportTicketListResponse = {
  items: SupportTicketDetail[]
  total: number
}
