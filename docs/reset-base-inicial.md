# Reset da base ao estado inicial (“verde”)

## Propósito

Scripts SQL para **apagar dados operacionais e administrativos** (esteiras, matriz, bases/templates, colaboradores, auditoria, utilizadores exceto um), mantendo **schema**, **histórico de migrations no repositório** (estes scripts **não** alteram ficheiros de migration), **RBAC** (`app_roles`, `app_permissions`, `app_role_permissions`) e **setores** (`sectors`).

Objetivo: voltar a uma jornada **funcionalmente limpa** após o setup inicial, com **um único** `app_users` administrativo e sem dados operacionais.

## O que é preservado

- Estrutura do schema (tabelas, índices, extensões, funções, triggers definidos nas migrations).
- `app_roles`, `app_permissions`, `app_role_permissions`.
- `sectors` (dados existentes mantêm-se).
- **Uma** conta em `app_users`, identificada por parâmetro (ver abaixo).

## O que é apagado

- Dados em: `conveyor_time_entries`, `conveyor_node_assignees`, `conveyor_nodes`, `conveyors`, `matrix_nodes`, `conveyor_base_nodes`, `conveyor_bases`, `admin_audit_events`.
- Todos os `collaborators`.
- Todos os `app_users` **exceto** o utilizador preservado.

Após o reset, o utilizador preservado fica com `collaborator_id = NULL`, `is_active = true` e `role_id` apontando para o papel **ADMIN** em `app_roles` (código `ADMIN`).

## Parâmetros (obrigatório: exatamente um)

Nos ficheiros `reset_to_initial_state_precheck.sql` e `reset_to_initial_state.sql`, edite no bloco `DO $$`:

| Variável | Uso |
|----------|-----|
| `v_master_user_id` | UUID do `app_users` a preservar (ativo, `deleted_at IS NULL`). |
| `v_master_email` | Email do utilizador (comparação case-insensitive após `trim`). |

**Regras:**

- Preencha **apenas um** dos dois. Se ambos tiverem valor, o script falha.
- Se ambos estiverem vazios (ou email só espaços), o script falha.
- Deve existir **exatamente um** `app_users` ativo correspondente; zero ou mais de um → falha explícita.
- Não há escolha automática de “um ADMIN qualquer”.

O `reset_to_initial_state_postcheck.sql` **não** usa estes parâmetros: apenas valida contagens e o papel ADMIN do único utilizador.

## Ordem de execução

1. **Backup** completo da base (ex.: `pg_dump` com formato custom ou plain SQL).
2. `reset_to_initial_state_precheck.sql` — confirma parâmetros e mostra contagens.
3. `reset_to_initial_state.sql` — transação única com reset (destrutivo).
4. `reset_to_initial_state_postcheck.sql` — valida o estado final.

## Cuidados obrigatórios

- **Nunca** executar em produção sem backup e janela acordada.
- Estes scripts **não são** executados automaticamente por esta documentação; correr manualmente no cliente SQL (psql, DBeaver, etc.).
- Manter os **mesmos** `v_master_user_id` / `v_master_email` entre precheck e script principal.
- Se o catálogo `app_roles` não tiver linha com `code = 'ADMIN'`, o reset principal aborta (base inconsistente).

## Como validar

- Execução bem-sucedida do `postcheck` (sem `EXCEPTION`, `NOTICE` final “OK”).
- Opcional: consultas manuais de contagem nas tabelas listadas em “O que é apagado” (todas em zero, exceto `app_users` = 1).

## Schema e FKs consideradas

Os scripts seguem as FKs definidas nas migrations sob `server/migrations/` (até `0015_*`): ordem de `TRUNCATE` alinhada a `server/scripts/dev_truncate_conveyors.sql` para a cadeia de esteiras; `admin_audit_events` é truncada antes de remover utilizadores; `app_users.created_by` / `updated_by` são neutralizados antes do `DELETE` dos outros utilizadores.

Se no futuro forem adicionadas tabelas com FK para `app_users`, `collaborators` ou dados operacionais, **atualize** os três scripts SQL e este documento antes de usar o reset.

## Risco residual

- Ambientes com **schema divergente** das migrations do repositório podem exigir ajuste manual do SQL.
- O postcheck emite **WARNING** (não falha) se `app_permissions` estiver vazio — útil para detetar seeds em falta, mas pode ser ignorado se o ambiente for intencionalmente mínimo.
