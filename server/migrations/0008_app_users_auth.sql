-- Credenciais de acesso na tabela de utilizadores da aplicação (`app_users`).
-- A autenticação do SGP valida e-mail + senha contra este registo.

ALTER TABLE app_users
  ADD COLUMN password_hash VARCHAR(64) NULL,
  ADD COLUMN status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
    CONSTRAINT chk_app_users_status CHECK (status IN ('ACTIVE', 'INACTIVE'));

COMMENT ON COLUMN app_users.password_hash IS
  'Hash bcrypt da senha (ex.: cost 10). NULL = conta sem login por senha.';
COMMENT ON COLUMN app_users.status IS
  'ACTIVE: pode autenticar; INACTIVE: bloqueado.';
