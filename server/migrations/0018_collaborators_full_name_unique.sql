-- Nome operacional único entre registos não removidos (comparação case-insensitive, sem espaços nas pontas).
CREATE UNIQUE INDEX IF NOT EXISTS idx_collaborators_full_name_unique_not_deleted
  ON collaborators (lower(btrim(full_name)))
  WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_collaborators_full_name_unique_not_deleted IS
  'Garante unicidade do nome entre colaboradores ativos na base (soft delete excluído).';
