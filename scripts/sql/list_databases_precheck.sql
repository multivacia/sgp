-- Inspeção / pré-check: listar databases do cluster (não é backup).
-- Útil para confirmar o que existe antes de correr pg_dumpall.
-- Não substitui pg_dumpall.

SELECT
  d.datname AS database_name,
  pg_catalog.pg_get_userbyid(d.datdba) AS owner,
  d.datcollate AS collate,
  d.datctype AS ctype,
  d.datistemplate AS is_template
FROM pg_catalog.pg_database d
ORDER BY d.datname;
