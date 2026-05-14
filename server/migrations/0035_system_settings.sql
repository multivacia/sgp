-- Parâmetros operacionais do sistema (ex.: timeout de sessão por inatividade).

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(128) NOT NULL,
  setting_value TEXT NOT NULL,
  value_type VARCHAR(32) NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_system_settings_setting_key UNIQUE (setting_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_setting_key
  ON system_settings (setting_key);

INSERT INTO system_settings (
  setting_key,
  setting_value,
  value_type,
  description,
  is_active
) VALUES (
  'SESSION_IDLE_TIMEOUT_MINUTES',
  '30',
  'INTEGER',
  'Tempo máximo de inatividade da sessão antes de exigir novo login, em minutos.',
  true
)
ON CONFLICT (setting_key) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE system_settings TO sgp_app';
  END IF;
END$$;
