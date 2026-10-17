-- SGP+ V2: fotos do veículo na esteira (recepção do carro, detalhes, avarias). Até 10 por esteira.
-- Aditiva: tabela nova; nenhuma tabela da V1 é alterada. Imagem no próprio banco (entra no backup), até 1 MB.

CREATE TABLE IF NOT EXISTS v2_esteira_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conveyor_id uuid NOT NULL REFERENCES conveyors (id) ON DELETE CASCADE,
  content_type text NOT NULL,
  bytes bytea NOT NULL,
  created_by uuid NULL REFERENCES app_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_v2_esteira_fotos_content_type
    CHECK (content_type IN ('image/webp', 'image/jpeg', 'image/png')),
  CONSTRAINT chk_v2_esteira_fotos_tamanho
    CHECK (octet_length(bytes) BETWEEN 1 AND 1048576)
);

CREATE INDEX IF NOT EXISTS idx_v2_esteira_fotos_conveyor ON v2_esteira_fotos (conveyor_id, created_at);

COMMENT ON TABLE v2_esteira_fotos IS
  'SGP+ V2: fotos do veículo da esteira (até 10 por esteira), tiradas na criação ou no detalhe.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, DELETE ON TABLE v2_esteira_fotos TO sgp_app';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_user') THEN
    EXECUTE 'GRANT SELECT, INSERT, DELETE ON TABLE v2_esteira_fotos TO sgp_user';
  END IF;
END$$;
