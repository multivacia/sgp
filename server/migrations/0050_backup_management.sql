-- Gestão de backups: catálogo, WAL e permissões (somente SUPER_ADMIN).
-- Idempotente. Migration 0013 reatribui todas as permissões ao ADMIN;
-- o REVOKE abaixo é obrigatório (padrão 0047).

CREATE TABLE IF NOT EXISTS backup_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment VARCHAR NOT NULL,
  database_name VARCHAR NOT NULL,
  backup_kind VARCHAR NOT NULL
    CHECK (backup_kind IN ('FULL_LOGICAL', 'PRE_RESTORE_SNAPSHOT')),
  trigger_type VARCHAR NOT NULL
    CHECK (trigger_type IN ('SCHEDULED', 'MANUAL', 'PRE_RESTORE')),
  status VARCHAR NOT NULL
    CHECK (status IN ('REQUESTED', 'RUNNING', 'COMPLETED', 'FAILED', 'MISSING_FILE', 'EXPIRED')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  size_bytes BIGINT,
  storage_key TEXT NOT NULL,
  logical_file_name VARCHAR NOT NULL,
  checksum_sha256 VARCHAR(64),
  integrity_status VARCHAR NOT NULL DEFAULT 'NOT_CHECKED'
    CHECK (integrity_status IN ('NOT_CHECKED', 'VALID', 'INVALID')),
  error_code VARCHAR,
  error_message TEXT,
  created_by_user_id UUID NULL REFERENCES app_users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backup_runs_status ON backup_runs (status);
CREATE INDEX IF NOT EXISTS idx_backup_runs_started_at_desc ON backup_runs (started_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_backup_runs_backup_kind ON backup_runs (backup_kind);

CREATE TABLE IF NOT EXISTS backup_wal_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment VARCHAR NOT NULL,
  database_name VARCHAR NOT NULL,
  segment_name VARCHAR NOT NULL,
  storage_key TEXT NOT NULL,
  size_bytes BIGINT,
  checksum_sha256 VARCHAR(64),
  archived_at TIMESTAMPTZ,
  available_for_download BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (environment, segment_name)
);

INSERT INTO app_roles (id, code, name) VALUES
  ('66666666-6666-6666-6666-666666666666', 'SUPER_ADMIN', 'Super administrador')
ON CONFLICT (code) DO NOTHING;

INSERT INTO app_permissions (code, name) VALUES
  ('backups.view', 'Backups: consultar'),
  ('backups.create', 'Backups: executar backup manual'),
  ('backups.download', 'Backups: baixar backup'),
  ('backups.wal.view', 'Backups: consultar WAL'),
  ('backups.wal.download', 'Backups: baixar WAL'),
  ('backups.restore', 'Backups: restaurar'),
  ('backups.delete', 'Backups: excluir'),
  ('backups.settings', 'Backups: alterar configurações')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT '66666666-6666-6666-6666-666666666666'::uuid, p.id
FROM app_permissions p
WHERE p.code IN (
  'backups.view',
  'backups.create',
  'backups.download',
  'backups.wal.view',
  'backups.wal.download',
  'backups.restore',
  'backups.delete',
  'backups.settings'
)
ON CONFLICT DO NOTHING;

-- Migration 0013 reatribui todas as permissões ao ADMIN; remover acesso indevido.
DELETE FROM app_role_permissions rp
USING app_permissions p
WHERE rp.permission_id = p.id
  AND p.code LIKE 'backups.%'
  AND rp.role_id IN (
    '11111111-1111-1111-1111-111111111111'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid
  );
