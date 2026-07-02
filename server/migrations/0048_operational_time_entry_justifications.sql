CREATE TABLE IF NOT EXISTS operational_time_entry_justifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  description text NULL,
  category text NULL,
  requires_complement boolean NOT NULL DEFAULT false,
  usage_scope text NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE operational_time_entry_justifications IS
  'Catálogo de justificativas padronizadas para apontamentos operacionais (exceção de alocação, fora de sequência).';

ALTER TABLE conveyor_time_entries
  ADD COLUMN IF NOT EXISTS standard_justification_id uuid NULL
    REFERENCES operational_time_entry_justifications(id),
  ADD COLUMN IF NOT EXISTS standard_justification_label_snapshot text NULL,
  ADD COLUMN IF NOT EXISTS standard_justification_category_snapshot text NULL,
  ADD COLUMN IF NOT EXISTS standard_justification_complement text NULL;

COMMENT ON COLUMN conveyor_time_entries.standard_justification_id IS
  'Referência à justificativa padronizada usada no apontamento (pode ficar órfã se desativada).';
COMMENT ON COLUMN conveyor_time_entries.standard_justification_label_snapshot IS
  'Cópia imutável do label no momento do apontamento.';
COMMENT ON COLUMN conveyor_time_entries.standard_justification_category_snapshot IS
  'Cópia imutável da categoria no momento do apontamento.';
COMMENT ON COLUMN conveyor_time_entries.standard_justification_complement IS
  'Complemento livre associado à justificativa padronizada.';

INSERT INTO operational_time_entry_justifications (label, description, category, requires_complement, sort_order)
VALUES
  ('Substituição por ausência', 'Cobertura operacional por ausência do colaborador designado.', 'SUBSTITUTION', false, 10),
  ('Substituição por remanejamento', 'Cobertura por remanejamento de equipe ou prioridade interna.', 'SUBSTITUTION', false, 20),
  ('Atividade anterior pendente de outro colaborador', 'Execução antecipada com pendência de outro colaborador na sequência.', 'SEQUENCE', false, 30),
  ('Sequência liberada pelo gestor', 'Gestor autorizou execução fora da sequência recomendada.', 'SEQUENCE', false, 40),
  ('Repriorização autorizada pelo gestor', 'Mudança de prioridade autorizada pela gestão.', 'PRIORITY', false, 50),
  ('Retrabalho autorizado', 'Retrabalho aprovado pela gestão ou qualidade.', 'REWORK', false, 60),
  ('Falha no planejamento', 'Inconsistência ou falha identificada no planejamento operacional.', 'PLANNING', false, 70),
  ('Atividade emergencial', 'Demanda emergencial que exige execução imediata.', 'EMERGENCY', false, 80),
  ('Outro motivo autorizado', 'Motivo operacional não listado — exige complemento.', 'OTHER', true, 90)
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sgp_app') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON TABLE operational_time_entry_justifications TO sgp_app';
  END IF;
END$$;
