-- Painel operacional: aba Histórico (esteiras-historico-painel).
-- Data de encerramento de esteiras CANCELADA (FINALIZADA já usa completed_at).
-- Idempotente: o runner reexecuta todas as migrations.

ALTER TABLE conveyors ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ NULL;

-- Backfill aproximado para esteiras canceladas antes desta migration.
UPDATE conveyors
SET canceled_at = updated_at
WHERE operational_status = 'CANCELADA'
  AND canceled_at IS NULL;

COMMENT ON COLUMN conveyors.canceled_at IS
  'Data/hora da transição para CANCELADA. Para esteiras canceladas antes da migration 0054, o valor foi preenchido a partir de updated_at (aproximação).';
