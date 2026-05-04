-- R6 S10 — Queries de validação: OS Bravo por documento (HML / pós-deploy)
-- Substituir todas as ocorrências de 'SUBSTITUIR_NOME_DA_ESTEIRA' pelo nome exato da esteira.
-- Alternativa: AND c.name ILIKE '%7452%' — usar com cuidado em bases partilhadas.
-- Tabelas: conveyors, conveyor_nodes, conveyor_node_assignees, collaborators, teams
-- Se node_type não existir na vossa BD, remover os filtros opt.node_type / area.node_type / step.node_type.

-- =============================================================================
-- 1. Estrutura completa por nome da esteira (tarefa, setor, atividade, tempo)
-- =============================================================================
-- OPTION = nós raiz por esteira (parent_id IS NULL); AREA; STEP.

SELECT
  c.id::text AS conveyor_id,
  c.name AS esteira,
  opt.name AS tarefa,
  opt.order_index AS opt_ord,
  area.name AS setor,
  area.order_index AS area_ord,
  step.name AS atividade,
  step.order_index AS step_ord,
  step.planned_minutes AS tempo_min
FROM conveyors c
JOIN conveyor_nodes opt
  ON opt.conveyor_id = c.id
 AND opt.parent_id IS NULL
 AND opt.node_type = 'OPTION'
 AND opt.deleted_at IS NULL
JOIN conveyor_nodes area
  ON area.parent_id = opt.id
 AND area.node_type = 'AREA'
 AND area.deleted_at IS NULL
JOIN conveyor_nodes step
  ON step.parent_id = area.id
 AND step.node_type = 'STEP'
 AND step.deleted_at IS NULL
WHERE c.deleted_at IS NULL
  AND c.name = 'SUBSTITUIR_NOME_DA_ESTEIRA'
ORDER BY opt.order_index, area.order_index, step.order_index;

-- =============================================================================
-- 1b. Colaboradores e times por STEP (assignees)
-- =============================================================================

SELECT
  c.name AS esteira,
  opt.name AS tarefa,
  area.name AS setor,
  step.name AS atividade,
  cna.assignment_type,
  col.full_name AS colaborador,
  t.name AS time_,
  cna.is_primary
FROM conveyors c
JOIN conveyor_nodes opt
  ON opt.conveyor_id = c.id AND opt.parent_id IS NULL AND opt.node_type = 'OPTION' AND opt.deleted_at IS NULL
JOIN conveyor_nodes area
  ON area.parent_id = opt.id AND area.node_type = 'AREA' AND area.deleted_at IS NULL
JOIN conveyor_nodes step
  ON step.parent_id = area.id AND step.node_type = 'STEP' AND step.deleted_at IS NULL
LEFT JOIN conveyor_node_assignees cna
  ON cna.conveyor_node_id = step.id
 AND cna.conveyor_id = c.id
 AND cna.deleted_at IS NULL
LEFT JOIN collaborators col ON col.id = cna.collaborator_id AND col.deleted_at IS NULL
LEFT JOIN teams t ON t.id = cna.team_id AND t.deleted_at IS NULL
WHERE c.deleted_at IS NULL
  AND c.name = 'SUBSTITUIR_NOME_DA_ESTEIRA'
ORDER BY opt.order_index, area.order_index, step.order_index, cna.order_index;

-- =============================================================================
-- 2. Validação pseudo-rollup (esperado: zero linhas após R6 S9.4.5+)
-- =============================================================================

SELECT
  c.name AS esteira,
  opt.name AS tarefa,
  area.name AS setor,
  step.name AS atividade,
  step.planned_minutes
FROM conveyors c
JOIN conveyor_nodes opt
  ON opt.conveyor_id = c.id
 AND opt.parent_id IS NULL
 AND opt.deleted_at IS NULL
JOIN conveyor_nodes area
  ON area.parent_id = opt.id
 AND area.deleted_at IS NULL
JOIN conveyor_nodes step
  ON step.parent_id = area.id
 AND step.deleted_at IS NULL
WHERE c.deleted_at IS NULL
  AND c.name = 'SUBSTITUIR_NOME_DA_ESTEIRA'
  AND lower(trim(area.name)) IN ('área', 'area', 'serviço', 'servico')
  AND lower(trim(step.name)) = lower(trim(opt.name))
  AND step.planned_minutes > 0;

-- =============================================================================
-- 3. Validação “financeiro” em texto operacional (nomes de nós / observações)
--    Esperado: zero linhas — ajustar lista ao critério do time de QA.
-- =============================================================================

SELECT 'OPTION' AS node_kind, c.name AS esteira, opt.name AS texto
FROM conveyors c
JOIN conveyor_nodes opt ON opt.conveyor_id = c.id AND opt.parent_id IS NULL AND opt.deleted_at IS NULL
WHERE c.deleted_at IS NULL AND c.name = 'SUBSTITUIR_NOME_DA_ESTEIRA'
  AND (
    opt.name ~* '(R\$|pagamento|desconto|subtotal|\btotal\b|valor|unitário|unitario)'
    OR opt.name ~ '\d+[,.]\d{2}'
  )
UNION ALL
SELECT 'AREA', c.name, area.name
FROM conveyors c
JOIN conveyor_nodes opt ON opt.conveyor_id = c.id AND opt.parent_id IS NULL AND opt.deleted_at IS NULL
JOIN conveyor_nodes area ON area.parent_id = opt.id AND area.deleted_at IS NULL
WHERE c.deleted_at IS NULL AND c.name = 'SUBSTITUIR_NOME_DA_ESTEIRA'
  AND (
    area.name ~* '(R\$|pagamento|desconto|subtotal|\btotal\b|valor|unitário|unitario)'
    OR area.name ~ '\d+[,.]\d{2}'
  )
UNION ALL
SELECT 'STEP', c.name, step.name
FROM conveyors c
JOIN conveyor_nodes opt ON opt.conveyor_id = c.id AND opt.parent_id IS NULL AND opt.deleted_at IS NULL
JOIN conveyor_nodes area ON area.parent_id = opt.id AND area.deleted_at IS NULL
JOIN conveyor_nodes step ON step.parent_id = area.id AND step.deleted_at IS NULL
WHERE c.deleted_at IS NULL AND c.name = 'SUBSTITUIR_NOME_DA_ESTEIRA'
  AND (
    step.name ~* '(R\$|pagamento|desconto|subtotal|\btotal\b|valor|unitário|unitario)'
    OR step.name ~ '\d+[,.]\d{2}'
  );

-- Observações da esteira (campo livre — deve estar limpo pelas guardas R6)
SELECT c.name AS esteira, c.initial_notes AS observacoes
FROM conveyors c
WHERE c.deleted_at IS NULL AND c.name = 'SUBSTITUIR_NOME_DA_ESTEIRA'
  AND c.initial_notes IS NOT NULL
  AND (
    c.initial_notes ~* '(R\$|pagamento|desconto|CPF|CNPJ|telefone|email)'
    OR c.initial_notes ~ '\d{11,}'
  );

-- =============================================================================
-- 4. Validação LGPD / PII (padrões simplificados — esperado zero em operacional)
-- =============================================================================

SELECT 'STEP' AS kind, c.name AS esteira, step.name AS texto
FROM conveyors c
JOIN conveyor_nodes opt ON opt.conveyor_id = c.id AND opt.parent_id IS NULL AND opt.deleted_at IS NULL
JOIN conveyor_nodes area ON area.parent_id = opt.id AND area.deleted_at IS NULL
JOIN conveyor_nodes step ON step.parent_id = area.id AND step.deleted_at IS NULL
WHERE c.deleted_at IS NULL AND c.name = 'SUBSTITUIR_NOME_DA_ESTEIRA'
  AND (
    step.name ~* '(CPF|CNPJ|\bemail\b|telefone|cep|endereço|endereco|chassi|\bVIN\b)'
    OR step.name ~ '\d{3}\.\d{3}\.\d{3}-\d{2}'
    OR step.name ~ '\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}'
  );

-- =============================================================================
-- 5. Steps com assignees (contagem por tipo)
-- =============================================================================

SELECT
  step.id::text AS step_id,
  step.name AS atividade,
  COUNT(cna.id) FILTER (WHERE cna.deleted_at IS NULL) AS assignee_rows
FROM conveyors c
JOIN conveyor_nodes opt ON opt.conveyor_id = c.id AND opt.parent_id IS NULL AND opt.deleted_at IS NULL
JOIN conveyor_nodes area ON area.parent_id = opt.id AND area.deleted_at IS NULL
JOIN conveyor_nodes step ON step.parent_id = area.id AND step.node_type = 'STEP' AND step.deleted_at IS NULL
LEFT JOIN conveyor_node_assignees cna ON cna.conveyor_node_id = step.id AND cna.conveyor_id = c.id AND cna.deleted_at IS NULL
WHERE c.deleted_at IS NULL AND c.name = 'SUBSTITUIR_NOME_DA_ESTEIRA'
GROUP BY step.id, step.name
ORDER BY step.name;

-- =============================================================================
-- 6. metadata_json — documentReviewAudit (conveyor row)
-- =============================================================================
-- Coluna real: conveyors.metadata_json (jsonb).
-- Esperado: documentReviewAudit com schemaVersion; sem campos de debug/cliente bruto.

SELECT
  c.name AS esteira,
  c.metadata_json->'documentReviewAudit' IS NOT NULL AS tem_audit,
  c.metadata_json->'documentReviewAudit'->>'schemaVersion' AS audit_schema_version,
  c.metadata_json->'documentReviewAudit'->'summary' AS summary,
  jsonb_array_length(COALESCE(c.metadata_json->'documentReviewAudit'->'decisions', '[]'::jsonb)) AS n_decisions,
  (c.metadata_json::text ILIKE '%candidateLines%') AS texto_contem_candidate_lines,
  (c.metadata_json::text ILIKE '%debugLines%') AS texto_contem_debug_lines,
  (c.metadata_json::text ILIKE '%rawText%') AS texto_contem_raw_text
FROM conveyors c
WHERE c.deleted_at IS NULL
  AND c.name = 'SUBSTITUIR_NOME_DA_ESTEIRA';

-- Verificação estrita opcional (falha se chaves indevidas existirem no JSON serializado):
-- SELECT id FROM conveyors WHERE name = 'SUBSTITUIR_NOME_DA_ESTEIRA' AND metadata_json::text ~* 'clientName|licensePlate';
