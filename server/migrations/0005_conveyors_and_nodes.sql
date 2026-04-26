-- Esteira real persistida: cabeçalho + árvore única (OPTION -> AREA -> STEP).
-- Referência: server/docs/PROMPT4_CONVERSOR_BACKEND_DECISOES.md
-- Distinto de conveyor_bases (preset) — aqui é instância registrada (snapshot).

CREATE TABLE IF NOT EXISTS conveyors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(64) NULL,

  name VARCHAR(256) NOT NULL,
  client_name VARCHAR(256) NULL,
  vehicle VARCHAR(256) NULL,
  model_version VARCHAR(256) NULL,
  plate VARCHAR(32) NULL,
  initial_notes TEXT NULL,
  responsible VARCHAR(256) NULL,
  estimated_deadline VARCHAR(128) NULL,

  priority VARCHAR(16) NOT NULL CHECK (priority IN ('alta', 'media', 'baixa')),

  origin_register VARCHAR(16) NOT NULL CHECK (
    origin_register IN ('MANUAL', 'BASE', 'HYBRID')
  ),

  -- Referência histórica (UUID de conveyor_bases ou id de catálogo mock, ex. be-001).
  base_ref_snapshot VARCHAR(128) NULL,
  base_code_snapshot VARCHAR(64) NULL,
  base_name_snapshot VARCHAR(256) NULL,
  base_version_snapshot INT NULL,

  total_options INT NOT NULL,
  total_areas INT NOT NULL,
  total_steps INT NOT NULL,
  total_planned_minutes INT NOT NULL,

  metadata_json JSONB NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,

  CONSTRAINT chk_conveyors_totals_non_negative CHECK (
    total_options >= 0
    AND total_areas >= 0
    AND total_steps >= 0
    AND total_planned_minutes >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_conveyors_created
  ON conveyors (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS conveyor_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conveyor_id UUID NOT NULL REFERENCES conveyors (id) ON DELETE CASCADE,
  parent_id UUID NULL REFERENCES conveyor_nodes (id) ON DELETE RESTRICT,
  root_id UUID NOT NULL,

  node_type VARCHAR(16) NOT NULL CHECK (
    node_type IN ('OPTION', 'AREA', 'STEP')
  ),

  source_origin VARCHAR(20) NOT NULL CHECK (
    source_origin IN ('manual', 'reaproveitada', 'base')
  ),

  code VARCHAR(50) NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,

  order_index INT NOT NULL DEFAULT 0,
  level_depth INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_conveyor_nodes_order_non_negative CHECK (order_index >= 0),
  CONSTRAINT chk_conveyor_nodes_level_non_negative CHECK (level_depth >= 0),

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  planned_minutes INT NULL,
  CONSTRAINT chk_conveyor_nodes_planned_minutes CHECK (
    planned_minutes IS NULL OR planned_minutes >= 0
  ),
  default_responsible_id UUID NULL REFERENCES collaborators (id) ON DELETE SET NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,

  source_key VARCHAR(100) NULL,
  metadata_json JSONB NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,

  CONSTRAINT chk_conveyor_parent_option_root CHECK (
    (node_type = 'OPTION' AND parent_id IS NULL)
    OR (node_type <> 'OPTION' AND parent_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_conveyor_nodes_conveyor
  ON conveyor_nodes (conveyor_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_nodes_parent
  ON conveyor_nodes (parent_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_nodes_root
  ON conveyor_nodes (root_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_nodes_conveyor_root_level_order
  ON conveyor_nodes (
    conveyor_id,
    root_id,
    level_depth,
    order_index
);
