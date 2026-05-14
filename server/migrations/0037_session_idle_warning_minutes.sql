-- Aviso preventivo de expiração por inatividade (minutos antes do timeout).

INSERT INTO system_settings (
  setting_key,
  setting_value,
  value_type,
  description,
  is_active
) VALUES (
  'SESSION_IDLE_WARNING_MINUTES',
  '5',
  'INTEGER',
  'Minutos antes da expiração por inatividade em que o frontend deve exibir aviso preventivo.',
  true
)
ON CONFLICT (setting_key) DO NOTHING;
