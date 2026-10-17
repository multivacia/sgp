-- SGP+ V2: o colaborador corrige ou remove o próprio apontamento no tablet
-- (só o dele, lançado hoje, com a atividade ainda não concluída). Cada correção fica registrada aqui.
-- Aditiva: tabela nova. A auditoria da V1 (admin_audit_events) exige usuário do sistema; no tablet o
-- colaborador entra só com PIN, por isso a V2 tem o próprio registro.

CREATE TABLE IF NOT EXISTS v2_correcoes_apontamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid NOT NULL REFERENCES conveyor_time_entries (id),
  collaborator_id uuid NOT NULL REFERENCES collaborators (id),
  acao text NOT NULL,
  minutos_antes integer NOT NULL,
  minutos_depois integer NULL,
  motivo text NOT NULL,
  canal text NOT NULL DEFAULT 'TABLET_V2',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_v2_correcoes_apontamento_acao CHECK (acao IN ('CORRIGIR', 'REMOVER')),
  CONSTRAINT chk_v2_correcoes_apontamento_motivo CHECK (char_length(btrim(motivo)) BETWEEN 3 AND 500),
  CONSTRAINT chk_v2_correcoes_apontamento_minutos CHECK (
    (acao = 'CORRIGIR' AND minutos_depois IS NOT NULL AND minutos_depois > 0)
    OR (acao = 'REMOVER' AND minutos_depois IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_v2_correcoes_apontamento_entry ON v2_correcoes_apontamento (time_entry_id);
CREATE INDEX IF NOT EXISTS idx_v2_correcoes_apontamento_colab ON v2_correcoes_apontamento (collaborator_id, created_at DESC);

COMMENT ON TABLE v2_correcoes_apontamento IS
  'SGP+ V2: correções/remoções feitas pelo próprio colaborador no tablet (motivo, antes e depois).';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT ON TABLE v2_correcoes_apontamento TO sgp_app';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_user') THEN
    EXECUTE 'GRANT SELECT, INSERT ON TABLE v2_correcoes_apontamento TO sgp_user';
  END IF;
END$$;
