CREATE TABLE IF NOT EXISTS matrix_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_id UUID NULL REFERENCES matrix_nodes (id) ON DELETE RESTRICT,
  root_id UUID NOT NULL,
  node_type VARCHAR(20) NOT NULL CHECK (
    node_type IN ('ITEM', 'TASK', 'SECTOR', 'ACTIVITY')
  ),
  code VARCHAR(50) NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,

  order_index INT NOT NULL DEFAULT 0,
  level_depth INT NOT NULL DEFAULT 0,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  planned_minutes INT NULL,
  default_responsible_id UUID NULL REFERENCES collaborators (id) ON DELETE SET NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,

  source_key VARCHAR(100) NULL,
  metadata_json JSONB NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,

  CONSTRAINT chk_matrix_parent_item_root CHECK (
    (node_type = 'ITEM' AND parent_id IS NULL)
    OR (node_type <> 'ITEM' AND parent_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_matrix_nodes_parent ON matrix_nodes (parent_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_matrix_nodes_root ON matrix_nodes (root_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_matrix_nodes_type ON matrix_nodes (node_type);

CREATE INDEX IF NOT EXISTS idx_matrix_nodes_active ON matrix_nodes (is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_matrix_nodes_root_level_order ON matrix_nodes (
  root_id,
  level_depth,
  order_index
);

CREATE INDEX IF NOT EXISTS idx_matrix_nodes_responsible ON matrix_nodes (default_responsible_id)
  WHERE deleted_at IS NULL;
