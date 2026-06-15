-- Troca obrigatória de PIN no primeiro acesso ao Modo Fábrica.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'collaborator_production_credentials'
      AND column_name = 'must_change_pin'
  ) THEN
    ALTER TABLE collaborator_production_credentials
      ADD COLUMN must_change_pin BOOLEAN NOT NULL DEFAULT false;
  END IF;
END$$;

COMMENT ON COLUMN collaborator_production_credentials.must_change_pin IS
  'Quando true, o colaborador deve trocar o PIN antes de acessar a fila de trabalho.';
