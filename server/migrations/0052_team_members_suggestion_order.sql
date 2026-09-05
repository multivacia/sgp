-- Prioridade de sugestão dos membros da equipe no planejamento semanal.
-- Menor valor = sugerido antes. Valores iguais são permitidos (sem unicidade).
-- O membro principal (is_primary) continua com precedência independente deste campo.
-- Idempotente: ADD COLUMN IF NOT EXISTS + CHECK recriado.

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS suggestion_order INTEGER NOT NULL DEFAULT 1;

-- Backfill explícito das linhas existentes para o nível inicial compartilhado.
-- Não inventa ordem alfabética. Não sobrescreve valores já distintos de 1
-- (reexecução segura após gestores terem reordenado).
UPDATE team_members
   SET suggestion_order = 1
 WHERE suggestion_order IS NULL;

ALTER TABLE team_members
  ALTER COLUMN suggestion_order SET DEFAULT 1;

ALTER TABLE team_members
  ALTER COLUMN suggestion_order SET NOT NULL;

ALTER TABLE team_members
  DROP CONSTRAINT IF EXISTS chk_team_members_suggestion_order_min;

ALTER TABLE team_members
  ADD CONSTRAINT chk_team_members_suggestion_order_min
  CHECK (suggestion_order >= 1);

COMMENT ON COLUMN team_members.suggestion_order IS
  'Nível de sugestão no planejamento semanal. Menor valor aparece primeiro entre não principais. Sem unicidade. is_primary tem precedência.';
