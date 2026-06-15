-- Novo ciclo de vida oficial das esteiras (Item A).
-- Migração idempotente: mapeia status legados por valor textual, não por ordem/ID.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_conveyors_operational_status'
      AND conrelid = 'conveyors'::regclass
  ) THEN
    ALTER TABLE conveyors DROP CONSTRAINT chk_conveyors_operational_status;
  END IF;
END $$;

-- Mapeamento obrigatório + demais legados equivalentes funcionais
UPDATE conveyors
SET operational_status = CASE operational_status
  WHEN 'NO_BACKLOG' THEN 'EM_ELABORACAO'
  WHEN 'EM_REVISAO' THEN 'AGUARDANDO_PLANEJAMENTO'
  WHEN 'PRONTA_LIBERAR' THEN 'A_INICIAR'
  WHEN 'EM_PRODUCAO' THEN 'EM_ANDAMENTO'
  WHEN 'CONCLUIDA' THEN 'FINALIZADA'
  ELSE operational_status
END
WHERE operational_status IN (
  'NO_BACKLOG',
  'EM_REVISAO',
  'PRONTA_LIBERAR',
  'EM_PRODUCAO',
  'CONCLUIDA'
);

ALTER TABLE conveyors
  ALTER COLUMN operational_status SET DEFAULT 'EM_ELABORACAO';

ALTER TABLE conveyors
  ADD CONSTRAINT chk_conveyors_operational_status CHECK (
    operational_status IN (
      'EM_ELABORACAO',
      'AGUARDANDO_PLANEJAMENTO',
      'EM_PLANEJAMENTO',
      'A_INICIAR',
      'EM_ANDAMENTO',
      'FINALIZADA',
      'CANCELADA'
    )
  );

COMMENT ON COLUMN conveyors.operational_status IS
  'Estágio no pipeline: EM_ELABORACAO | AGUARDANDO_PLANEJAMENTO | EM_PLANEJAMENTO | A_INICIAR | EM_ANDAMENTO | FINALIZADA | CANCELADA';
