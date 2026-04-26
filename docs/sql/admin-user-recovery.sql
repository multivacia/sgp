-- =============================================================================
-- SGP+ — Recuperação administrativa de acesso (contingência manual)
-- =============================================================================
--
-- FINALIDADE
--   Script de referência para PostgreSQL quando for necessário, fora do fluxo
--   normal da aplicação, criar ou recuperar um registo em `app_users` de forma
--   coerente com o modelo atual (ver migrações `server/migrations/0008`–`0010`).
--
-- NÃO SUBSTITUI
--   Reset oficial pela UI, políticas de segurança da organização nem revisão de RBAC.
--
-- ANTES DE EXECUTAR
--   1) Backup ou snapshot da base (recomendado).
--   2) Executar primeiro em transação de teste: BEGIN; … SELECT … ; ROLLBACK;
--   3) E-mail: a aplicação usa `lower(btrim(email))` e índice único em
--      `lower(btrim(email::text))` — guarde sempre e-mail em minúsculas, sem
--      espaços nas pontas.
--   4) Senha: o backend usa Argon2id (string PHC, prefixo `$argon2`). Não invente
--      hashes. Gere o hash com a mesma stack do servidor, por exemplo a partir da
--      pasta `server/` do repositório:
--
--        npx --yes tsx -e "import argon2 from 'argon2'; console.log(await argon2.hash('SUA_SENHA_TEMP', { type: argon2.argon2id }))"
--
--      Copie a linha completa do hash para colar em :password_hash abaixo.
--      (Legado bcrypt `$2…` ainda é aceite em verificação, mas novas senhas devem
--      ser Argon2id.)
--
-- ESTRUTURA RELEVANTE (resumo)
--   app_users: email, password_hash (TEXT), role_id → app_roles, collaborator_id
--   → collaborators (opcional, único por colaborador quando preenchido),
--   is_active, deleted_at (soft delete), must_change_password, password_changed_at,
--   failed_login_count, locked_until, password_reset_token_hash,
--   password_reset_expires_at, last_login_at, created_at, updated_at, created_by,
--   updated_by, avatar_url.
--
-- =============================================================================
-- BLOCO 0 — Consultas de apoio (roles e colaboradores)
-- =============================================================================

-- Listar papéis de acesso (RBAC) — escolha um id ou code para usar mais abaixo.
SELECT id, code, name
FROM app_roles
ORDER BY code;

-- Localizar colaborador operacional (para vínculo opcional).
-- Substitua o filtro conforme necessidade.
SELECT id, full_name, status, deleted_at
FROM collaborators
WHERE deleted_at IS NULL
ORDER BY full_name
LIMIT 50;

-- =============================================================================
-- BLOCO 1 — Conferência: utilizador existente por e-mail
-- =============================================================================

-- Substitua o e-mail.
SELECT
  id,
  email,
  is_active,
  deleted_at,
  role_id,
  collaborator_id,
  must_change_password,
  failed_login_count,
  locked_until,
  password_reset_token_hash IS NOT NULL AS tem_token_reset,
  last_login_at,
  created_at,
  updated_at
FROM app_users
WHERE lower(btrim(email::text)) = lower(btrim('SUBSTITUIR_EMAIL@dominio.pt'));

-- =============================================================================
-- BLOCO 2 — Cenário A: CRIAR novo utilizador
-- =============================================================================
-- Pré-condições:
--   - E-mail ainda não existe (ver BLOCO 1).
--   - role_id válido (BLOCO 0).
--   - Se collaborator_id for preenchido: colaborador existe, não removido, e não
--     existe outro app_user com esse collaborator_id (índice único parcial).
--   - password_hash: gerado com Argon2id (ver cabeçalho).
--
-- Descomente e ajuste os placeholders antes de executar.

/*
BEGIN;

INSERT INTO app_users (
  id,
  email,
  password_hash,
  role_id,
  collaborator_id,
  avatar_url,
  is_active,
  must_change_password,
  password_changed_at,
  failed_login_count,
  locked_until,
  password_reset_token_hash,
  password_reset_expires_at,
  deleted_at,
  created_by,
  updated_by
) VALUES (
  gen_random_uuid(),
  lower(btrim('SUBSTITUIR_EMAIL@dominio.pt')),
  'SUBSTITUIR_HASH_ARGON2ID_COMPLETO',
  'SUBSTITUIR_ROLE_UUID'::uuid,
  NULL,  -- ou 'SUBSTITUIR_COLLABORATOR_UUID'::uuid
  NULL,
  true,
  true,
  NULL,  -- alinhado à app: se must_change_password, password_changed_at fica NULL
  0,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL
);

-- Ver registo criado
SELECT id, email, role_id, collaborator_id, is_active, must_change_password
FROM app_users
WHERE lower(btrim(email::text)) = lower(btrim('SUBSTITUIR_EMAIL@dominio.pt'));

COMMIT;
-- ou ROLLBACK; se for apenas teste
*/

-- =============================================================================
-- BLOCO 3 — Cenário B: REATIVAR utilizador (soft delete e/ou inativo)
-- =============================================================================
-- Ajusta conta eliminada logicamente e/ou inativa para voltar a autenticar.
-- Opcionalmente combine com BLOCO 4 para nova senha e limpeza de bloqueio.
--
-- Substitua SUBSTITUIR_USER_UUID.

/*
BEGIN;

UPDATE app_users
SET
  deleted_at = NULL,
  is_active = true,
  updated_at = now(),
  updated_by = NULL
WHERE id = 'SUBSTITUIR_USER_UUID'::uuid;

COMMIT;
*/

-- =============================================================================
-- BLOCO 4 — Cenário B/C: DESTRAVAR e redefinir acesso (senha + bloqueios + reset)
-- =============================================================================
-- Alinha-se ao comportamento de `resetAdminUserPasswordHash` no código:
--   nova hash, must_change_password = true, zera tentativas, limpa locked_until,
--   password_changed_at = now(), atualiza updated_at.
-- Limpa tokens de recuperação por e-mail para evitar estado inconsistente.
--
-- Substitua SUBSTITUIR_USER_UUID e SUBSTITUIR_HASH_ARGON2ID_COMPLETO.

/*
BEGIN;

UPDATE app_users
SET
  password_hash = 'SUBSTITUIR_HASH_ARGON2ID_COMPLETO',
  password_changed_at = now(),
  must_change_password = true,
  failed_login_count = 0,
  locked_until = NULL,
  password_reset_token_hash = NULL,
  password_reset_expires_at = NULL,
  updated_at = now(),
  updated_by = NULL
WHERE id = 'SUBSTITUIR_USER_UUID'::uuid
  AND deleted_at IS NULL;

COMMIT;
*/

-- =============================================================================
-- BLOCO 5 — Cenário C: Ajustar apenas vínculo com colaborador
-- =============================================================================
-- Cuidado: existe no máximo um app_user por collaborator_id (quando não nulo).
-- Verifique antes se o colaborador já está ligado a outro utilizador.

/*
-- Quem já usa este colaborador?
SELECT id, email
FROM app_users
WHERE collaborator_id = 'SUBSTITUIR_COLLABORATOR_UUID'::uuid;

BEGIN;

UPDATE app_users
SET
  collaborator_id = 'SUBSTITUIR_COLLABORATOR_UUID'::uuid,
  updated_at = now(),
  updated_by = NULL
WHERE id = 'SUBSTITUIR_USER_UUID'::uuid;

COMMIT;
*/

-- =============================================================================
-- BLOCO 6 — Ajuste pontual: role (perfil RBAC)
-- =============================================================================

/*
BEGIN;

UPDATE app_users
SET
  role_id = 'SUBSTITUIR_ROLE_UUID'::uuid,
  updated_at = now(),
  updated_by = NULL
WHERE id = 'SUBSTITUIR_USER_UUID'::uuid;

COMMIT;
*/

-- =============================================================================
-- BLOCO 7 — Apenas forçar troca de senha no próximo login (sem alterar hash)
-- =============================================================================

/*
BEGIN;

UPDATE app_users
SET
  must_change_password = true,
  updated_at = now(),
  updated_by = NULL
WHERE id = 'SUBSTITUIR_USER_UUID'::uuid
  AND deleted_at IS NULL;

COMMIT;
*/

-- =============================================================================
-- BLOCO 8 — Validações finais sugeridas
-- =============================================================================

-- Substitua o UUID do utilizador.
/*
SELECT
  u.id,
  u.email,
  u.is_active,
  u.deleted_at,
  r.code AS role_code,
  c.full_name AS collaborator_name,
  u.must_change_password,
  u.failed_login_count,
  u.locked_until,
  u.password_hash IS NOT NULL AS tem_senha,
  length(u.password_hash) AS len_hash
FROM app_users u
LEFT JOIN app_roles r ON r.id = u.role_id
LEFT JOIN collaborators c ON c.id = u.collaborator_id
WHERE u.id = 'SUBSTITUIR_USER_UUID'::uuid;
*/

-- =============================================================================
-- FIM
-- =============================================================================
