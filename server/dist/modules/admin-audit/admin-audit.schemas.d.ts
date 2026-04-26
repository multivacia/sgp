import { z } from 'zod';
export declare const listAdminAuditEventsQuerySchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    event_type: z.ZodOptional<z.ZodEnum<["admin_user_created" | "admin_user_updated" | "admin_user_activated" | "admin_user_deactivated" | "admin_user_soft_deleted" | "admin_user_restored" | "admin_user_password_reset" | "admin_user_force_password_change" | "admin_user_collaborator_linked" | "admin_user_collaborator_unlinked" | "role_permissions_updated" | "time_entry_created_on_behalf" | "time_entry_deleted_by_manager", ...("admin_user_created" | "admin_user_updated" | "admin_user_activated" | "admin_user_deactivated" | "admin_user_soft_deleted" | "admin_user_restored" | "admin_user_password_reset" | "admin_user_force_password_change" | "admin_user_collaborator_linked" | "admin_user_collaborator_unlinked" | "role_permissions_updated" | "time_entry_created_on_behalf" | "time_entry_deleted_by_manager")[]]>>;
    target_user_id: z.ZodOptional<z.ZodString>;
    occurred_from: z.ZodOptional<z.ZodString>;
    occurred_to: z.ZodOptional<z.ZodString>;
    limit: z.ZodOptional<z.ZodNumber>;
    offset: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    event_type?: "admin_user_created" | "admin_user_updated" | "admin_user_activated" | "admin_user_deactivated" | "admin_user_soft_deleted" | "admin_user_restored" | "admin_user_password_reset" | "admin_user_force_password_change" | "admin_user_collaborator_linked" | "admin_user_collaborator_unlinked" | "role_permissions_updated" | "time_entry_created_on_behalf" | "time_entry_deleted_by_manager" | undefined;
    target_user_id?: string | undefined;
    occurred_from?: string | undefined;
    occurred_to?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}, {
    event_type?: "admin_user_created" | "admin_user_updated" | "admin_user_activated" | "admin_user_deactivated" | "admin_user_soft_deleted" | "admin_user_restored" | "admin_user_password_reset" | "admin_user_force_password_change" | "admin_user_collaborator_linked" | "admin_user_collaborator_unlinked" | "role_permissions_updated" | "time_entry_created_on_behalf" | "time_entry_deleted_by_manager" | undefined;
    target_user_id?: string | undefined;
    occurred_from?: string | undefined;
    occurred_to?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>, {
    event_type?: "admin_user_created" | "admin_user_updated" | "admin_user_activated" | "admin_user_deactivated" | "admin_user_soft_deleted" | "admin_user_restored" | "admin_user_password_reset" | "admin_user_force_password_change" | "admin_user_collaborator_linked" | "admin_user_collaborator_unlinked" | "role_permissions_updated" | "time_entry_created_on_behalf" | "time_entry_deleted_by_manager" | undefined;
    target_user_id?: string | undefined;
    occurred_from?: string | undefined;
    occurred_to?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}, {
    event_type?: "admin_user_created" | "admin_user_updated" | "admin_user_activated" | "admin_user_deactivated" | "admin_user_soft_deleted" | "admin_user_restored" | "admin_user_password_reset" | "admin_user_force_password_change" | "admin_user_collaborator_linked" | "admin_user_collaborator_unlinked" | "role_permissions_updated" | "time_entry_created_on_behalf" | "time_entry_deleted_by_manager" | undefined;
    target_user_id?: string | undefined;
    occurred_from?: string | undefined;
    occurred_to?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>, {
    eventType: "admin_user_created" | "admin_user_updated" | "admin_user_activated" | "admin_user_deactivated" | "admin_user_soft_deleted" | "admin_user_restored" | "admin_user_password_reset" | "admin_user_force_password_change" | "admin_user_collaborator_linked" | "admin_user_collaborator_unlinked" | "role_permissions_updated" | "time_entry_created_on_behalf" | "time_entry_deleted_by_manager" | undefined;
    targetUserId: string | undefined;
    occurredFrom: Date | undefined;
    occurredTo: Date | undefined;
    limit: number;
    offset: number;
}, {
    event_type?: "admin_user_created" | "admin_user_updated" | "admin_user_activated" | "admin_user_deactivated" | "admin_user_soft_deleted" | "admin_user_restored" | "admin_user_password_reset" | "admin_user_force_password_change" | "admin_user_collaborator_linked" | "admin_user_collaborator_unlinked" | "role_permissions_updated" | "time_entry_created_on_behalf" | "time_entry_deleted_by_manager" | undefined;
    target_user_id?: string | undefined;
    occurred_from?: string | undefined;
    occurred_to?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}>;
//# sourceMappingURL=admin-audit.schemas.d.ts.map