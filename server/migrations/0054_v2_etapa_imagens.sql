-- SGP+ V2: foto de cada etapa (TASK) da matriz, mostrada no "cardápio" da Nova esteira.
-- Aditiva: tabela nova, nenhuma tabela da V1 é alterada. A V1 não lê esta tabela.
-- Imagem guardada no próprio banco (entra no backup normal), limitada a 1 MB.

CREATE TABLE IF NOT EXISTS v2_etapa_imagens (
  matrix_node_id uuid PRIMARY KEY REFERENCES matrix_nodes (id) ON DELETE CASCADE,
  content_type text NOT NULL,
  bytes bytea NOT NULL,
  updated_by uuid NULL REFERENCES app_users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_v2_etapa_imagens_content_type
    CHECK (content_type IN ('image/webp', 'image/jpeg', 'image/png')),
  CONSTRAINT chk_v2_etapa_imagens_tamanho
    CHECK (octet_length(bytes) BETWEEN 1 AND 1048576)
);

COMMENT ON TABLE v2_etapa_imagens IS
  'SGP+ V2: foto da etapa (matrix_nodes TASK) exibida na criação/alteração de esteira. Uma por etapa.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v2_etapa_imagens TO sgp_app';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_user') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE v2_etapa_imagens TO sgp_user';
  END IF;
END$$;
