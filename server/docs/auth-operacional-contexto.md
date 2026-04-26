# Auth (`app_users`) vs contexto operacional (`collaborators`)

## Modelo

- **Autenticação e RBAC**: `app_users` (`role_id`, `is_active`, `password_hash`).
- **Operação** (esteiras, apontamento, minhas atividades): entidade `collaborators`.
- **Ponte**: `app_users.collaborator_id` (opcional; índice único parcial evita dois utilizadores no mesmo colaborador).

## Minhas atividades (implementação atual)

1. Usa `app_users.collaborator_id` quando preenchido.
2. Se for `NULL`, usa correspondência **provisória** por e-mail com colaboradores ativos (log estruturado `my_activities_collaborator_resolved_via_email_fallback`).

## Próximos passos sugeridos

- Exigir `collaborator_id` para rotas puramente operacionais quando o produto fechar a migração.
- Middleware global de conta ativa (hoje `GET /auth/me` valida `isActive`; outras rotas ainda confiam no JWT até expirar).
- Rate limit / lockout em `/auth/login`, reset e troca de senha, auditoria de login.
