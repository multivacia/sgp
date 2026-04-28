-- Histórico das análises ARGOS de saúde por esteira (Sprint 6).
-- Persistimos o retorno completo em analysis_json e apenas resumo do snapshot.

CREATE TABLE IF NOT EXISTS conveyor_health_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conveyor_id UUID NOT NULL REFERENCES conveyors (id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  correlation_id UUID NOT NULL,
  policy VARCHAR(20) NOT NULL,
  route_used VARCHAR(50) NULL,
  llm_used BOOLEAN NULL,
  health_status VARCHAR(50) NULL,
  score NUMERIC NULL,
  risk_level VARCHAR(50) NULL,
  analysis_json JSONB NOT NULL,
  snapshot_summary_json JSONB NULL,
  created_by UUID NULL REFERENCES app_users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conveyor_health_analyses_conveyor_created_desc
  ON conveyor_health_analyses (conveyor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_conveyor_health_analyses_request_id
  ON conveyor_health_analyses (request_id);

CREATE INDEX IF NOT EXISTS idx_conveyor_health_analyses_correlation_id
  ON conveyor_health_analyses (correlation_id);

-- Permissões para role de aplicação (quando existir no ambiente).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE conveyor_health_analyses TO sgp_app';
  END IF;
END$$;

