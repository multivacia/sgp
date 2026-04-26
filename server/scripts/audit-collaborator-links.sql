-- Consultas de auditoria (executar após migrations/0011_collaborators_integrity_backfill.sql).
-- Não altera dados.

-- Utilizadores ativos ainda sem colaborador operacional vinculado
SELECT COUNT(*) AS app_users_sem_collaborator_id
FROM app_users
WHERE deleted_at IS NULL
  AND collaborator_id IS NULL;

-- Colaboradores ativos com o mesmo e-mail normalizado (ambiguidade — não vinculados automaticamente)
SELECT lower(btrim(email::text)) AS email_norm, COUNT(*) AS n
FROM collaborators
WHERE deleted_at IS NULL
  AND email IS NOT NULL
  AND btrim(email::text) <> ''
  AND status = 'ACTIVE'
GROUP BY lower(btrim(email::text))
HAVING COUNT(*) > 1;
