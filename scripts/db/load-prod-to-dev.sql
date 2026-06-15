-- =============================================================================
-- SGP+ — Carga adaptada: sgp_prod_raw → sgp_dev
-- =============================================================================
--
-- OBJETIVO
--   Copiar dados reais de produção (restaurados em sgp_prod_raw) para a base
--   de desenvolvimento sgp_dev, que já deve estar com schema atual (migration 0046).
--
-- NÃO FAZ ESTE SCRIPT
--   - Não restaura dump sobre sgp_dev
--   - Não recria schema / não roda migrations
--   - Não executa seed.ts nem seed-production-pins
--   - Não altera produção nem sgp_prod_raw (somente leitura via FDW)
--   - Não apaga sgp_prod_raw
--
-- PRÉ-REQUISITOS (checklist manual)
--   [ ] Dump de produção restaurado em database sgp_prod_raw (pg_restore)
--   [ ] Database sgp_dev criada e migrada (npm run migrate --prefix server)
--   [ ] NÃO rodou npm run seed em sgp_dev
--   [ ] Conectado como superuser ou role com CREATE EXTENSION + postgres_fdw
--   [ ] Ajustou USER MAPPING abaixo (usuário/senha com acesso a sgp_prod_raw)
--   [ ] Ambiente local/DEV — session_replication_role = replica desliga FK checks
--   [ ] Backup opcional de sgp_dev antes de executar (dropdb recria se falhar)
--
-- EXECUÇÃO
--   psql -d sgp_dev -v ON_ERROR_STOP=1 -f scripts/db/load-prod-to-dev.sql
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PREFLIGHT — aborta se pré-condições não forem atendidas
-- -----------------------------------------------------------------------------

DO $$
BEGIN
  IF current_database() <> 'sgp_dev' THEN
    RAISE EXCEPTION
      'PREFLIGHT FALHOU: conecte-se à database sgp_dev (atual: %)',
      current_database();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'sgp_prod_raw'
  ) THEN
    RAISE EXCEPTION
      'PREFLIGHT FALHOU: database sgp_prod_raw não existe neste cluster PostgreSQL';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'conveyor_nodes'
      AND column_name = 'planned_quantity'
  ) THEN
    RAISE EXCEPTION
      'PREFLIGHT FALHOU: sgp_dev parece desatualizada (coluna conveyor_nodes.planned_quantity ausente). Rode migrations até 0046.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'collaborator_production_credentials'
      AND column_name = 'must_change_pin'
  ) THEN
    RAISE EXCEPTION
      'PREFLIGHT FALHOU: sgp_dev parece desatualizada (coluna must_change_pin ausente). Rode migrations até 0045/0046.';
  END IF;
END $$;

-- Snapshot de contagens na origem (via FDW será repetido após setup)
-- Apenas informativo neste ponto; contagens finais estão no final do arquivo.

-- -----------------------------------------------------------------------------
-- SETUP postgres_fdw — origem: sgp_prod_raw
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS postgres_fdw;

DROP SERVER IF EXISTS sgp_prod_raw_srv CASCADE;

CREATE SERVER sgp_prod_raw_srv
  FOREIGN DATA WRAPPER postgres_fdw
  OPTIONS (
    host '127.0.0.1',
    dbname 'sgp_prod_raw',
    port '5432'
  );

-- AJUSTE: usuário e senha com permissão de leitura em sgp_prod_raw
CREATE USER MAPPING IF NOT EXISTS FOR CURRENT_USER
  SERVER sgp_prod_raw_srv
  OPTIONS (
    user 'postgres',
    password 'COLOQUE_A_SENHA_AQUI'
  );

CREATE SCHEMA IF NOT EXISTS prod_raw;

IMPORT FOREIGN SCHEMA public
  LIMIT TO (
    sectors,
    app_roles,
    app_permissions,
    app_role_permissions,
    collaborators,
    teams,
    team_members,
    app_users,
    matrix_nodes,
    matrix_node_assignment_teams,
    conveyor_bases,
    conveyor_base_nodes,
    conveyors,
    conveyor_nodes,
    conveyor_node_assignees,
    conveyor_operational_plans,
    conveyor_operational_plan_items,
    operational_work_plans,
    operational_work_plan_items,
    conveyor_time_entries,
    conveyor_operational_events,
    operational_capacity_settings,
    collaborator_capacity_overrides,
    operational_extra_time_entry_descriptions,
    operational_extra_time_entries,
    conveyor_health_analyses,
    admin_audit_events,
    support_tickets,
    support_ticket_notifications,
    system_settings,
    collaborator_production_credentials,
    production_auth_events
  )
  FROM SERVER sgp_prod_raw_srv
  INTO prod_raw;

-- -----------------------------------------------------------------------------
-- CARGA — transação única
-- -----------------------------------------------------------------------------

BEGIN;

-- DEV/local apenas: desabilita triggers e FK checks durante bulk insert
SET LOCAL session_replication_role = replica;

-- Limpa dados operacionais existentes em sgp_dev (preserva schema)
TRUNCATE TABLE
  production_auth_events,
  collaborator_production_credentials,
  support_ticket_notifications,
  support_tickets,
  admin_audit_events,
  conveyor_health_analyses,
  operational_extra_time_entries,
  operational_extra_time_entry_descriptions,
  collaborator_capacity_overrides,
  operational_capacity_settings,
  conveyor_operational_events,
  conveyor_time_entries,
  operational_work_plan_items,
  operational_work_plans,
  conveyor_operational_plan_items,
  conveyor_operational_plans,
  conveyor_node_assignees,
  conveyor_nodes,
  conveyors,
  conveyor_base_nodes,
  conveyor_bases,
  matrix_node_assignment_teams,
  matrix_nodes,
  app_users,
  team_members,
  teams,
  collaborators,
  app_role_permissions,
  app_permissions,
  app_roles,
  sectors,
  system_settings
CASCADE;

-- 1. sectors
INSERT INTO public.sectors (
  id,
  name,
  created_at,
  is_active
)
SELECT
  id,
  name,
  created_at,
  is_active
FROM prod_raw.sectors;

-- 2. app_roles
INSERT INTO public.app_roles (
  id,
  code,
  name,
  created_at,
  is_active,
  is_collaborator_function
)
SELECT
  id,
  code,
  name,
  created_at,
  is_active,
  is_collaborator_function
FROM prod_raw.app_roles;

-- 3. app_permissions
INSERT INTO public.app_permissions (
  id,
  code,
  name,
  created_at
)
SELECT
  id,
  code,
  name,
  created_at
FROM prod_raw.app_permissions;

-- 4. app_role_permissions
INSERT INTO public.app_role_permissions (
  role_id,
  permission_id
)
SELECT
  role_id,
  permission_id
FROM prod_raw.app_role_permissions;

-- 5. collaborators
INSERT INTO public.collaborators (
  id,
  code,
  registration_code,
  nickname,
  full_name,
  email,
  phone,
  job_title,
  avatar_url,
  sector_id,
  role_id,
  status,
  notes,
  deleted_at,
  created_at,
  updated_at,
  is_active
)
SELECT
  id,
  code,
  registration_code,
  nickname,
  full_name,
  email,
  phone,
  job_title,
  avatar_url,
  sector_id,
  role_id,
  status,
  notes,
  deleted_at,
  created_at,
  updated_at,
  is_active
FROM prod_raw.collaborators;

-- 6. teams
INSERT INTO public.teams (
  id,
  name,
  description,
  is_active,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  id,
  name,
  description,
  is_active,
  created_at,
  updated_at,
  deleted_at
FROM prod_raw.teams;

-- 7. team_members
INSERT INTO public.team_members (
  id,
  team_id,
  collaborator_id,
  role,
  is_primary,
  is_active,
  created_at,
  updated_at
)
SELECT
  id,
  team_id,
  collaborator_id,
  role,
  is_primary,
  is_active,
  created_at,
  updated_at
FROM prod_raw.team_members;

-- 8. app_users
INSERT INTO public.app_users (
  id,
  email,
  created_at,
  password_hash,
  collaborator_id,
  role_id,
  is_active,
  last_login_at,
  updated_at,
  created_by,
  updated_by,
  deleted_at,
  avatar_url,
  password_changed_at,
  must_change_password,
  failed_login_count,
  locked_until,
  password_reset_token_hash,
  password_reset_expires_at
)
SELECT
  id,
  email,
  created_at,
  password_hash,
  collaborator_id,
  role_id,
  is_active,
  last_login_at,
  updated_at,
  created_by,
  updated_by,
  deleted_at,
  avatar_url,
  password_changed_at,
  must_change_password,
  failed_login_count,
  locked_until,
  password_reset_token_hash,
  password_reset_expires_at
FROM prod_raw.app_users;

-- 9. matrix_nodes (+ planned_quantity = 1)
INSERT INTO public.matrix_nodes (
  id,
  parent_id,
  root_id,
  node_type,
  code,
  name,
  description,
  order_index,
  level_depth,
  is_active,
  planned_minutes,
  default_responsible_id,
  required,
  source_key,
  metadata_json,
  created_at,
  updated_at,
  deleted_at,
  planned_quantity
)
SELECT
  id,
  parent_id,
  root_id,
  node_type,
  code,
  name,
  description,
  order_index,
  level_depth,
  is_active,
  planned_minutes,
  default_responsible_id,
  required,
  source_key,
  metadata_json,
  created_at,
  updated_at,
  deleted_at,
  1
FROM prod_raw.matrix_nodes;

-- 10. matrix_node_assignment_teams
INSERT INTO public.matrix_node_assignment_teams (
  id,
  matrix_node_id,
  team_id,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  id,
  matrix_node_id,
  team_id,
  created_at,
  updated_at,
  deleted_at
FROM prod_raw.matrix_node_assignment_teams;

-- 11. conveyor_bases
INSERT INTO public.conveyor_bases (
  id,
  code,
  name,
  description,
  status,
  version,
  source_type,
  source_ref_id,
  metadata_json,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  id,
  code,
  name,
  description,
  status,
  version,
  source_type,
  source_ref_id,
  metadata_json,
  created_at,
  updated_at,
  deleted_at
FROM prod_raw.conveyor_bases;

-- 12. conveyor_base_nodes
INSERT INTO public.conveyor_base_nodes (
  id,
  base_id,
  parent_id,
  root_id,
  node_type,
  code,
  name,
  description,
  order_index,
  level_depth,
  is_active,
  planned_minutes,
  default_responsible_id,
  required,
  source_key,
  metadata_json,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  id,
  base_id,
  parent_id,
  root_id,
  node_type,
  code,
  name,
  description,
  order_index,
  level_depth,
  is_active,
  planned_minutes,
  default_responsible_id,
  required,
  source_key,
  metadata_json,
  created_at,
  updated_at,
  deleted_at
FROM prod_raw.conveyor_base_nodes;

-- 13. conveyors (conversão operational_status legado → ciclo de vida 0042)
INSERT INTO public.conveyors (
  id,
  code,
  name,
  client_name,
  vehicle,
  model_version,
  plate,
  initial_notes,
  responsible,
  estimated_deadline,
  priority,
  origin_register,
  base_ref_snapshot,
  base_code_snapshot,
  base_name_snapshot,
  base_version_snapshot,
  total_options,
  total_areas,
  total_steps,
  total_planned_minutes,
  metadata_json,
  created_at,
  updated_at,
  deleted_at,
  operational_status,
  completed_at
)
SELECT
  id,
  code,
  name,
  client_name,
  vehicle,
  model_version,
  plate,
  initial_notes,
  responsible,
  estimated_deadline,
  priority,
  origin_register,
  base_ref_snapshot,
  base_code_snapshot,
  base_name_snapshot,
  base_version_snapshot,
  total_options,
  total_areas,
  total_steps,
  total_planned_minutes,
  metadata_json,
  created_at,
  updated_at,
  deleted_at,
  CASE operational_status
    WHEN 'NO_BACKLOG' THEN 'EM_ELABORACAO'
    WHEN 'EM_REVISAO' THEN 'AGUARDANDO_PLANEJAMENTO'
    WHEN 'PRONTA_LIBERAR' THEN 'A_INICIAR'
    WHEN 'EM_PRODUCAO' THEN 'EM_ANDAMENTO'
    WHEN 'CONCLUIDA' THEN 'FINALIZADA'
    ELSE operational_status
  END,
  completed_at
FROM prod_raw.conveyors;

-- 14. conveyor_nodes (+ planned_quantity = 1; status STEP inalterado)
INSERT INTO public.conveyor_nodes (
  id,
  conveyor_id,
  parent_id,
  root_id,
  node_type,
  source_origin,
  code,
  name,
  description,
  order_index,
  level_depth,
  is_active,
  planned_minutes,
  default_responsible_id,
  required,
  source_key,
  metadata_json,
  created_at,
  updated_at,
  deleted_at,
  operational_status,
  operational_completed_at,
  operational_completed_by,
  planned_quantity
)
SELECT
  id,
  conveyor_id,
  parent_id,
  root_id,
  node_type,
  source_origin,
  code,
  name,
  description,
  order_index,
  level_depth,
  is_active,
  planned_minutes,
  default_responsible_id,
  required,
  source_key,
  metadata_json,
  created_at,
  updated_at,
  deleted_at,
  operational_status,
  operational_completed_at,
  operational_completed_by,
  1
FROM prod_raw.conveyor_nodes;

-- 15. conveyor_node_assignees
INSERT INTO public.conveyor_node_assignees (
  id,
  conveyor_id,
  conveyor_node_id,
  collaborator_id,
  is_primary,
  assignment_origin,
  order_index,
  metadata_json,
  created_at,
  updated_at,
  deleted_at,
  assignment_type,
  team_id
)
SELECT
  id,
  conveyor_id,
  conveyor_node_id,
  collaborator_id,
  is_primary,
  assignment_origin,
  order_index,
  metadata_json,
  created_at,
  updated_at,
  deleted_at,
  assignment_type,
  team_id
FROM prod_raw.conveyor_node_assignees;

-- 16. conveyor_operational_plans
INSERT INTO public.conveyor_operational_plans (
  id,
  conveyor_id,
  status,
  planned_start_date,
  planned_end_date,
  version,
  generated_at,
  generated_by,
  approved_at,
  approved_by,
  factory_planning_status,
  notes,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  id,
  conveyor_id,
  status,
  planned_start_date,
  planned_end_date,
  version,
  generated_at,
  generated_by,
  approved_at,
  approved_by,
  factory_planning_status,
  notes,
  created_at,
  updated_at,
  deleted_at
FROM prod_raw.conveyor_operational_plans;

-- 17. conveyor_operational_plan_items
INSERT INTO public.conveyor_operational_plan_items (
  id,
  plan_id,
  conveyor_id,
  activity_node_id,
  planned_date,
  planned_order,
  planned_minutes,
  planned_collaborator_id,
  planned_team_id,
  status,
  source_kind,
  origin_work_plan_item_id,
  sync_status,
  review_required,
  cancellation_reason,
  notes,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  id,
  plan_id,
  conveyor_id,
  activity_node_id,
  planned_date,
  planned_order,
  planned_minutes,
  planned_collaborator_id,
  planned_team_id,
  status,
  source_kind,
  origin_work_plan_item_id,
  sync_status,
  review_required,
  cancellation_reason,
  notes,
  created_at,
  updated_at,
  deleted_at
FROM prod_raw.conveyor_operational_plan_items;

-- 18. operational_work_plans
INSERT INTO public.operational_work_plans (
  id,
  week_start_date,
  week_end_date,
  status,
  created_by,
  published_at,
  published_by,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  id,
  week_start_date,
  week_end_date,
  status,
  created_by,
  published_at,
  published_by,
  created_at,
  updated_at,
  deleted_at
FROM prod_raw.operational_work_plans;

-- 19. operational_work_plan_items
INSERT INTO public.operational_work_plan_items (
  id,
  work_plan_id,
  conveyor_id,
  activity_node_id,
  assigned_collaborator_id,
  assigned_team_id,
  planned_date,
  planned_order,
  planned_minutes,
  status,
  notes,
  created_at,
  updated_at,
  deleted_at,
  conveyor_operational_plan_item_id
)
SELECT
  id,
  work_plan_id,
  conveyor_id,
  activity_node_id,
  assigned_collaborator_id,
  assigned_team_id,
  planned_date,
  planned_order,
  planned_minutes,
  status,
  notes,
  created_at,
  updated_at,
  deleted_at,
  conveyor_operational_plan_item_id
FROM prod_raw.operational_work_plan_items;

-- 20. conveyor_time_entries (+ colunas novas 0044/0046)
INSERT INTO public.conveyor_time_entries (
  id,
  conveyor_id,
  conveyor_node_id,
  collaborator_id,
  conveyor_node_assignee_id,
  entry_at,
  minutes,
  notes,
  entry_mode,
  metadata_json,
  created_at,
  updated_at,
  deleted_at,
  entry_origin,
  exception_justification,
  is_out_of_sequence,
  out_of_sequence_justification,
  executed_quantity,
  session_completion_pct,
  mark_as_done
)
SELECT
  id,
  conveyor_id,
  conveyor_node_id,
  collaborator_id,
  conveyor_node_assignee_id,
  entry_at,
  minutes,
  notes,
  entry_mode,
  metadata_json,
  created_at,
  updated_at,
  deleted_at,
  entry_origin,
  exception_justification,
  is_out_of_sequence,
  out_of_sequence_justification,
  NULL,
  NULL,
  false
FROM prod_raw.conveyor_time_entries;

-- 21. conveyor_operational_events
INSERT INTO public.conveyor_operational_events (
  id,
  conveyor_id,
  node_id,
  event_type,
  previous_value,
  new_value,
  reason,
  source,
  occurred_at,
  created_by,
  metadata_json,
  idempotency_key,
  created_at
)
SELECT
  id,
  conveyor_id,
  node_id,
  event_type,
  previous_value,
  new_value,
  reason,
  source,
  occurred_at,
  created_by,
  metadata_json,
  idempotency_key,
  created_at
FROM prod_raw.conveyor_operational_events;

-- 22. operational_capacity_settings
INSERT INTO public.operational_capacity_settings (
  id,
  default_daily_minutes,
  created_at,
  updated_at,
  updated_by
)
SELECT
  id,
  default_daily_minutes,
  created_at,
  updated_at,
  updated_by
FROM prod_raw.operational_capacity_settings;

-- 23. collaborator_capacity_overrides
INSERT INTO public.collaborator_capacity_overrides (
  id,
  collaborator_id,
  daily_minutes,
  effective_from,
  effective_to,
  is_active,
  created_at,
  updated_at,
  created_by,
  updated_by,
  deleted_at
)
SELECT
  id,
  collaborator_id,
  daily_minutes,
  effective_from,
  effective_to,
  is_active,
  created_at,
  updated_at,
  created_by,
  updated_by,
  deleted_at
FROM prod_raw.collaborator_capacity_overrides;

-- 24. operational_extra_time_entry_descriptions
INSERT INTO public.operational_extra_time_entry_descriptions (
  id,
  description,
  normalized_description,
  internal_note,
  sort_order,
  is_active,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  id,
  description,
  normalized_description,
  internal_note,
  sort_order,
  is_active,
  created_at,
  updated_at,
  deleted_at
FROM prod_raw.operational_extra_time_entry_descriptions;

-- 25. operational_extra_time_entries
INSERT INTO public.operational_extra_time_entries (
  id,
  collaborator_id,
  created_by_user_id,
  description_id,
  entry_date,
  minutes,
  notes,
  created_at,
  updated_at,
  deleted_at
)
SELECT
  id,
  collaborator_id,
  created_by_user_id,
  description_id,
  entry_date,
  minutes,
  notes,
  created_at,
  updated_at,
  deleted_at
FROM prod_raw.operational_extra_time_entries;

-- 26. conveyor_health_analyses
INSERT INTO public.conveyor_health_analyses (
  id,
  conveyor_id,
  request_id,
  correlation_id,
  policy,
  route_used,
  llm_used,
  health_status,
  score,
  risk_level,
  analysis_json,
  snapshot_summary_json,
  created_by,
  created_at
)
SELECT
  id,
  conveyor_id,
  request_id,
  correlation_id,
  policy,
  route_used,
  llm_used,
  health_status,
  score,
  risk_level,
  analysis_json,
  snapshot_summary_json,
  created_by,
  created_at
FROM prod_raw.conveyor_health_analyses;

-- 27. admin_audit_events
INSERT INTO public.admin_audit_events (
  id,
  event_type,
  actor_user_id,
  target_user_id,
  target_collaborator_id,
  occurred_at,
  result_status,
  metadata_json
)
SELECT
  id,
  event_type,
  actor_user_id,
  target_user_id,
  target_collaborator_id,
  occurred_at,
  result_status,
  metadata_json
FROM prod_raw.admin_audit_events;

-- 28. support_tickets
INSERT INTO public.support_tickets (
  id,
  code,
  status,
  source,
  category,
  severity,
  title,
  description,
  created_by_user_id,
  created_by_collaborator_id,
  module_name,
  route_path,
  context_json,
  request_id,
  correlation_id,
  created_at,
  updated_at
)
SELECT
  id,
  code,
  status,
  source,
  category,
  severity,
  title,
  description,
  created_by_user_id,
  created_by_collaborator_id,
  module_name,
  route_path,
  context_json,
  request_id,
  correlation_id,
  created_at,
  updated_at
FROM prod_raw.support_tickets;

-- 29. support_ticket_notifications
INSERT INTO public.support_ticket_notifications (
  id,
  ticket_id,
  channel,
  destination,
  status,
  provider_message_id,
  error_message,
  sent_at,
  created_at
)
SELECT
  id,
  ticket_id,
  channel,
  destination,
  status,
  provider_message_id,
  error_message,
  sent_at,
  created_at
FROM prod_raw.support_ticket_notifications;

-- 30. system_settings
INSERT INTO public.system_settings (
  id,
  setting_key,
  setting_value,
  value_type,
  description,
  is_active,
  created_at,
  updated_at
)
SELECT
  id,
  setting_key,
  setting_value,
  value_type,
  description,
  is_active,
  created_at,
  updated_at
FROM prod_raw.system_settings;

-- 31. collaborator_production_credentials (+ must_change_pin = false)
INSERT INTO public.collaborator_production_credentials (
  collaborator_id,
  pin_hash,
  enabled,
  failed_attempts,
  locked_until,
  pin_changed_at,
  reset_by_user_id,
  created_at,
  updated_at,
  must_change_pin
)
SELECT
  collaborator_id,
  pin_hash,
  enabled,
  failed_attempts,
  locked_until,
  pin_changed_at,
  reset_by_user_id,
  created_at,
  updated_at,
  false
FROM prod_raw.collaborator_production_credentials;

-- 32. production_auth_events
INSERT INTO public.production_auth_events (
  id,
  collaborator_id,
  event_type,
  occurred_at,
  ip_address,
  user_agent,
  request_id,
  result,
  metadata_json
)
SELECT
  id,
  collaborator_id,
  event_type,
  occurred_at,
  ip_address,
  user_agent,
  request_id,
  result,
  metadata_json
FROM prod_raw.production_auth_events;

-- Restaura comportamento normal de FKs/triggers
SET LOCAL session_replication_role = DEFAULT;

-- -----------------------------------------------------------------------------
-- Reconciliação pós-carga — permissões/settings que DEV exige via migrations
-- (não sobrescreve dados copiados; apenas completa o que prod pode não ter)
-- -----------------------------------------------------------------------------

INSERT INTO app_roles (id, code, name)
VALUES ('66666666-6666-6666-6666-666666666666', 'SUPER_ADMIN', 'Super administrador')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO app_permissions (code, name) VALUES
  ('teams.view', 'Equipes: consultar'),
  ('teams.create', 'Equipes: criar'),
  ('teams.update', 'Equipes: editar'),
  ('teams.manage_members', 'Equipes: gerir membros'),
  ('operational_settings.manage', 'Configurações operacionais: gerir catálogo (setores e funções)'),
  ('system_settings.view', 'Configurações do sistema: consultar'),
  ('system_settings.manage', 'Configurações do sistema: alterar')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT '11111111-1111-1111-1111-111111111111'::uuid, p.id
FROM app_permissions p
WHERE p.code IN (
  'teams.view',
  'teams.create',
  'teams.update',
  'teams.manage_members',
  'operational_settings.manage',
  'system_settings.view',
  'system_settings.manage'
)
ON CONFLICT DO NOTHING;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT '33333333-3333-3333-3333-333333333333'::uuid, p.id
FROM app_permissions p
WHERE p.code IN (
  'teams.view',
  'teams.create',
  'teams.update',
  'teams.manage_members',
  'operational_settings.manage'
)
ON CONFLICT DO NOTHING;

INSERT INTO app_role_permissions (role_id, permission_id)
SELECT '66666666-6666-6666-6666-666666666666'::uuid, p.id
FROM app_permissions p
WHERE p.code IN ('system_settings.view', 'system_settings.manage')
ON CONFLICT DO NOTHING;

INSERT INTO system_settings (
  setting_key,
  setting_value,
  value_type,
  description,
  is_active
) VALUES
  (
    'SESSION_IDLE_TIMEOUT_MINUTES',
    '30',
    'INTEGER',
    'Tempo máximo de inatividade da sessão antes de exigir novo login, em minutos.',
    true
  ),
  (
    'SESSION_IDLE_WARNING_MINUTES',
    '5',
    'INTEGER',
    'Minutos antes da expiração por inatividade em que o frontend deve exibir aviso preventivo.',
    true
  )
ON CONFLICT (setting_key) DO NOTHING;

COMMIT;

-- =============================================================================
-- VALIDAÇÕES PÓS-CARGA — executar manualmente; resultados esperados anotados
-- =============================================================================

-- Contagens principais (conferir manualmente contra prod_raw via psql -d sgp_prod_raw)
SELECT 'sectors' AS entity, COUNT(*) AS rows_in_sgp_dev FROM public.sectors
UNION ALL SELECT 'app_users', COUNT(*) FROM public.app_users
UNION ALL SELECT 'collaborators', COUNT(*) FROM public.collaborators
UNION ALL SELECT 'matrix_nodes', COUNT(*) FROM public.matrix_nodes
UNION ALL SELECT 'conveyors', COUNT(*) FROM public.conveyors
UNION ALL SELECT 'conveyor_nodes', COUNT(*) FROM public.conveyor_nodes
UNION ALL SELECT 'conveyor_time_entries', COUNT(*) FROM public.conveyor_time_entries
UNION ALL SELECT 'operational_work_plans', COUNT(*) FROM public.operational_work_plans
UNION ALL SELECT 'operational_work_plan_items', COUNT(*) FROM public.operational_work_plan_items
UNION ALL SELECT 'conveyor_operational_plans', COUNT(*) FROM public.conveyor_operational_plans
UNION ALL SELECT 'conveyor_operational_plan_items', COUNT(*) FROM public.conveyor_operational_plan_items
ORDER BY entity;

-- Status de esteira inválidos (esperado: 0 linhas)
SELECT operational_status, COUNT(*) AS qty
FROM public.conveyors
WHERE deleted_at IS NULL
  AND operational_status NOT IN (
    'EM_ELABORACAO',
    'AGUARDANDO_PLANEJAMENTO',
    'EM_PLANEJAMENTO',
    'A_INICIAR',
    'EM_ANDAMENTO',
    'FINALIZADA',
    'CANCELADA'
  )
GROUP BY operational_status;

-- Status legado remanescente (esperado: 0 linhas)
SELECT operational_status, COUNT(*) AS qty
FROM public.conveyors
WHERE operational_status IN (
  'NO_BACKLOG',
  'EM_REVISAO',
  'PRONTA_LIBERAR',
  'EM_PRODUCAO',
  'CONCLUIDA'
)
GROUP BY operational_status;

-- Colunas novas preenchidas (esperado: 0 linhas em cada)
SELECT COUNT(*) AS matrix_nodes_bad_planned_quantity
FROM public.matrix_nodes
WHERE planned_quantity IS NULL OR planned_quantity < 1;

SELECT COUNT(*) AS conveyor_nodes_bad_planned_quantity
FROM public.conveyor_nodes
WHERE planned_quantity IS NULL OR planned_quantity < 1;

SELECT COUNT(*) AS time_entries_bad_mark_as_done
FROM public.conveyor_time_entries
WHERE mark_as_done IS DISTINCT FROM false;

-- FKs órfãs — esteiras (esperado: 0)
SELECT COUNT(*) AS orphan_conveyor_nodes
FROM public.conveyor_nodes cn
LEFT JOIN public.conveyors c ON c.id = cn.conveyor_id
WHERE c.id IS NULL;

-- FKs órfãs — apontamentos (esperado: 0)
SELECT COUNT(*) AS orphan_time_entries_node
FROM public.conveyor_time_entries te
LEFT JOIN public.conveyor_nodes cn ON cn.id = te.conveyor_node_id
WHERE cn.id IS NULL;

SELECT COUNT(*) AS orphan_time_entries_collaborator
FROM public.conveyor_time_entries te
LEFT JOIN public.collaborators col ON col.id = te.collaborator_id
WHERE col.id IS NULL;

-- STEPs sem pai (exceto OPTION) (esperado: 0)
SELECT COUNT(*) AS orphan_step_parent
FROM public.conveyor_nodes
WHERE deleted_at IS NULL
  AND node_type <> 'OPTION'
  AND parent_id IS NULL;

-- Planejamento semanal — vínculo plano esteira (esperado: 0)
SELECT COUNT(*) AS orphan_work_plan_conveyor_link
FROM public.operational_work_plan_items wpi
WHERE wpi.conveyor_operational_plan_item_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.conveyor_operational_plan_items copi
    WHERE copi.id = wpi.conveyor_operational_plan_item_id
  );

-- Sequences (projeto usa UUID; lista informativa)
SELECT schemaname, sequencename, last_value
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;

-- Limpeza opcional do FDW (descomente se quiser remover após validação)
-- DROP SERVER IF EXISTS sgp_prod_raw_srv CASCADE;
-- DROP SCHEMA IF EXISTS prod_raw CASCADE;
