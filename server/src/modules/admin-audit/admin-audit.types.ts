export const ADMIN_AUDIT_EVENT_TYPES = [
  'admin_user_created',
  'admin_user_updated',
  'admin_user_activated',
  'admin_user_deactivated',
  'admin_user_soft_deleted',
  'admin_user_restored',
  'admin_user_password_reset',
  'admin_user_force_password_change',
  'admin_user_collaborator_linked',
  'admin_user_collaborator_unlinked',
  'role_permissions_updated',
  'time_entry_created_on_behalf',
  'time_entry_deleted_by_manager',
] as const

export type AdminAuditEventType = (typeof ADMIN_AUDIT_EVENT_TYPES)[number]

export type AdminAuditListItem = {
  id: string
  eventType: AdminAuditEventType
  occurredAt: string
  resultStatus: string
  actorUserId: string | null
  actorEmail: string | null
  targetUserId: string | null
  targetUserEmail: string | null
  targetCollaboratorId: string | null
  metadata: Record<string, unknown> | null
}
