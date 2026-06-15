-- Campos para o Kiosk de Apontamento (R-kiosk):
--   session_completion_pct: avaliação subjetiva do colaborador sobre o estado atual da atividade (0-100%)
--   mark_as_done: colaborador indicou que a atividade está concluída ao apontar via kiosk

ALTER TABLE conveyor_time_entries
  ADD COLUMN IF NOT EXISTS session_completion_pct SMALLINT
    CHECK (session_completion_pct IS NULL OR (session_completion_pct >= 0 AND session_completion_pct <= 100)),
  ADD COLUMN IF NOT EXISTS mark_as_done BOOLEAN NOT NULL DEFAULT FALSE;
