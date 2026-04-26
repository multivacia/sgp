-- Governança de acesso e operação: soft delete em app_users, avatar/troca de senha,
-- campos evolutivos, e is_active em collaborators (alinhado a status).

-- --- app_users ---
ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN app_users.deleted_at IS
  'Soft delete: registo lógico removido quando não nulo.';
COMMENT ON COLUMN app_users.avatar_url IS
  'URL do avatar (não armazenar binário na base).';
COMMENT ON COLUMN app_users.password_changed_at IS
  'Última alteração bem-sucedida da senha.';
COMMENT ON COLUMN app_users.must_change_password IS
  'Quando true, o utilizador deve alterar a senha antes de usar o sistema operacional.';
COMMENT ON COLUMN app_users.failed_login_count IS
  'Contador de tentativas falhadas (evolutivo; bloqueio opcional).';
COMMENT ON COLUMN app_users.locked_until IS
  'Bloqueio temporário até este instante (evolutivo).';
COMMENT ON COLUMN app_users.password_reset_token_hash IS
  'Hash do token de recuperação de senha (evolutivo).';
COMMENT ON COLUMN app_users.password_reset_expires_at IS
  'Expiração do token de recuperação (evolutivo).';

UPDATE app_users
SET password_changed_at = COALESCE(password_changed_at, now())
WHERE password_hash IS NOT NULL AND password_changed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_app_users_active_login
  ON app_users (id)
  WHERE deleted_at IS NULL;

-- --- collaborators: is_active espelha status (mantém compatibilidade com API existente) ---
ALTER TABLE collaborators
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

UPDATE collaborators
SET is_active = (status = 'ACTIVE')
WHERE true;

COMMENT ON COLUMN collaborators.is_active IS
  'Espelho operacional de status ACTIVE/INACTIVE; usar com deleted_at em listagens.';

CREATE INDEX IF NOT EXISTS idx_collaborators_active_not_deleted
  ON collaborators (is_active)
  WHERE deleted_at IS NULL;
