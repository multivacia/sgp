# Integração externa — rotas `/api/v1/collaborators`

Rotas **legadas** sob o prefixo `/api/v1/collaborators` foram endurecidas para alinhar com o modelo de governança (cadastro real em `/api/v1/admin/collaborators`).

## Requisitos

| Método | Rota | Autenticação | Autorização |
|--------|------|--------------|-------------|
| `GET` | `/api/v1/collaborators` | Cookie de sessão JWT (`httpOnly`) | Qualquer utilizador autenticado |
| `GET` | `/api/v1/collaborators/:id` | Idem | Idem |
| `POST` | `/api/v1/collaborators` | Idem | Papel **ADMIN** ou **GESTOR** |
| `PATCH` | `/api/v1/collaborators/:id` | Idem | Idem |
| `POST` | `/api/v1/collaborators/:id/activate` | Idem | Idem |
| `POST` | `/api/v1/collaborators/:id/inactivate` | Idem | Idem |

- Sem cookie válido: **401** (`Sessão não autenticada`).
- Autenticado sem ADMIN/GESTOR em mutações: **403** (`Sem permissão para administrar utilizadores…`).

## Alternativa recomendada para cadastro

- Listagem / criação / edição / soft delete / restore com metadados de governança: usar **`/api/v1/admin/collaborators`** (mesmas regras de papel, envelope `{ data, meta }`).

## Consumidores internos (SPA)

- **Esteiras** e **matrizes de operação** usam principalmente **GET** (lista de colaboradores) com sessão ativa — compatível.
- **Telas de Utilizadores / Colaboradores** usam rotas **`/admin/*`**.

## Integrações externas (scripts, ETL, parceiros)

1. Obter sessão: fluxo de login existente (`POST /api/v1/auth/login` ou equivalente) para receber o cookie.
2. Para **criação ou alteração** de colaboradores: garantir utilizador com papel **ADMIN** ou **GESTOR**, ou migrar chamadas para processos internos que usem as rotas administrativas.

## Integridade `status` / `is_active`

A migração `server/migrations/0011_collaborators_integrity_backfill.sql` alinha dados existentes, aplica backfill seguro de `app_users.collaborator_id` e impõe o `CHECK` `is_active = (status = 'ACTIVE')`. Em bases já criadas, aplicar só este ficheiro (não reexecutar migrações antigas):

`npx tsx src/scripts/migrate-file.ts migrations/0011_collaborators_integrity_backfill.sql`

Durante a execução, o PostgreSQL emite `RAISE NOTICE` com o número de linhas alinhadas em `collaborators` e o número de `app_users` atualizados no backfill. Consultas adicionais de auditoria: `server/scripts/audit-collaborator-links.sql`.

Inserções ou atualizações SQL manuais em `collaborators` devem manter `status` e `is_active` coerentes.
