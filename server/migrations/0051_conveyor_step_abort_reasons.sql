-- Catálogo administrável de motivos de dispensa operacional de atividades STEP.
-- Não reutilizar operational_time_entry_justifications (domínio de apontamento).

CREATE TABLE IF NOT EXISTS conveyor_step_abort_reasons (
  code varchar(64) PRIMARY KEY,
  label text NOT NULL,
  description text NULL,
  requires_complement boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_conveyor_step_abort_reasons_code_format
    CHECK (code ~ '^[A-Z0-9_]+$'),
  CONSTRAINT chk_conveyor_step_abort_reasons_label_nonempty
    CHECK (length(btrim(label)) > 0),
  CONSTRAINT chk_conveyor_step_abort_reasons_sort_order_nonneg
    CHECK (sort_order >= 0)
);

COMMENT ON TABLE conveyor_step_abort_reasons IS
  'Motivos cadastráveis para dispensa operacional de atividades STEP (abort). Catálogo distinto das justificativas de apontamento.';

COMMENT ON COLUMN conveyor_step_abort_reasons.code IS
  'Código estável e imutável após criação (ex.: NAO_MAIS_NECESSARIA, OUTRO).';
COMMENT ON COLUMN conveyor_step_abort_reasons.requires_complement IS
  'Quando true, a dispensa exige texto complementar (abort_reason_text).';
COMMENT ON COLUMN conveyor_step_abort_reasons.is_active IS
  'Motivos inativos não aparecem no seletor nem são aceitos em novas dispensas; histórico preservado.';

CREATE INDEX IF NOT EXISTS idx_conveyor_step_abort_reasons_active_sort
  ON conveyor_step_abort_reasons (is_active, sort_order, label);

INSERT INTO conveyor_step_abort_reasons (
  code, label, description, requires_complement, sort_order, is_active
) VALUES
  ('NAO_MAIS_NECESSARIA', 'Não é mais necessária', NULL, false, 10, true),
  ('SUBSTITUIDA_POR_OUTRA', 'Substituída por outra atividade', NULL, false, 20, true),
  ('ERRO_DE_PLANEJAMENTO', 'Erro de planejamento / escopo', NULL, false, 30, true),
  ('SOLICITACAO_CLIENTE', 'Solicitação do cliente', NULL, false, 40, true),
  ('OUTRO', 'Outro', NULL, true, 50, true)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE conveyor_nodes
  ADD COLUMN IF NOT EXISTS abort_reason_label_snapshot text NULL;

COMMENT ON COLUMN conveyor_nodes.abort_reason_label_snapshot IS
  'Cópia imutável do rótulo do motivo de dispensa no momento do abort; independe de edições posteriores no catálogo.';

-- Backfill legado a partir do catálogo inicial (não sobrescreve snapshot já preenchido).
UPDATE conveyor_nodes cn
   SET abort_reason_label_snapshot = r.label
  FROM conveyor_step_abort_reasons r
 WHERE cn.abort_reason_code IS NOT NULL
   AND cn.abort_reason_label_snapshot IS NULL
   AND cn.abort_reason_code = r.code;

-- Impede FK se existirem códigos históricos fora do catálogo.
DO $$
DECLARE
  unknown_codes text;
BEGIN
  SELECT string_agg(code, ', ' ORDER BY code)
    INTO unknown_codes
  FROM (
    SELECT DISTINCT cn.abort_reason_code AS code
      FROM conveyor_nodes cn
     WHERE cn.abort_reason_code IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
           FROM conveyor_step_abort_reasons r
          WHERE r.code = cn.abort_reason_code
       )
  ) unknown;

  IF unknown_codes IS NOT NULL THEN
    RAISE EXCEPTION
      'Migration 0051: abort_reason_code desconhecido(s) em conveyor_nodes impede FK: %',
      unknown_codes;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'fk_conveyor_nodes_abort_reason_code'
  ) THEN
    ALTER TABLE conveyor_nodes
      ADD CONSTRAINT fk_conveyor_nodes_abort_reason_code
      FOREIGN KEY (abort_reason_code)
      REFERENCES conveyor_step_abort_reasons(code)
      ON DELETE RESTRICT
      ON UPDATE RESTRICT;
  END IF;
END$$;

COMMENT ON CONSTRAINT fk_conveyor_nodes_abort_reason_code ON conveyor_nodes IS
  'Garante que abort_reason_code referencia um motivo existente; impede exclusão física de motivos referenciados.';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE conveyor_step_abort_reasons TO sgp_app';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_user') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE conveyor_step_abort_reasons TO sgp_user';
  END IF;
END$$;
