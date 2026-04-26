-- Evolução de app_users: autenticação real, RBAC, ponte com collaborators, Argon2id.
-- password_hash: TEXT para strings PHC Argon2id (legado bcrypt mantido em verificação).

ALTER TABLE app_users
  ALTER COLUMN password_hash TYPE TEXT;

ALTER TABLE app_users
  ADD COLUMN collaborator_id UUID,
  ADD COLUMN role_id UUID,
  ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN last_login_at TIMESTAMPTZ,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN created_by UUID,
  ADD COLUMN updated_by UUID;

UPDATE app_users
SET is_active = (status = 'ACTIVE')
WHERE status IS NOT NULL;

ALTER TABLE app_users DROP CONSTRAINT chk_app_users_status;
ALTER TABLE app_users DROP COLUMN status;

UPDATE app_users
SET email = lower(btrim(email::text));

ALTER TABLE app_users DROP CONSTRAINT app_users_email_key;

CREATE UNIQUE INDEX idx_app_users_email_lower ON app_users (lower(btrim(email::text)));

ALTER TABLE app_users
  ADD CONSTRAINT fk_app_users_collaborator
    FOREIGN KEY (collaborator_id) REFERENCES collaborators (id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_app_users_role
    FOREIGN KEY (role_id) REFERENCES app_roles (id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_app_users_created_by
    FOREIGN KEY (created_by) REFERENCES app_users (id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_app_users_updated_by
    FOREIGN KEY (updated_by) REFERENCES app_users (id) ON DELETE SET NULL;

CREATE UNIQUE INDEX idx_app_users_collaborator_id_unique
  ON app_users (collaborator_id)
  WHERE collaborator_id IS NOT NULL;

COMMENT ON COLUMN app_users.password_hash IS
  'Argon2id (PHC) ou legado bcrypt. Salt embutido na string. NULL = sem login por senha.';
COMMENT ON COLUMN app_users.is_active IS
  'false: conta bloqueada (não autentica).';
COMMENT ON COLUMN app_users.collaborator_id IS
  'Ponte opcional para collaborators (operação). Um colaborador ativo só pode ligar a um app_user.';
COMMENT ON COLUMN app_users.role_id IS
  'Papel de acesso (RBAC). ON DELETE RESTRICT evita apagar role em uso.';
