-- Base de Esteira: cabeçalho + árvore única (OPTION -> AREA -> STEP).
-- Filosofia espelhada em matrix_nodes (0003). Domínio: ITEM/TASK/SECTOR/ACTIVITY -> OPTION/AREA/STEP.
-- Documentação: server/docs/RELATORIO_BASE_ESTEIRA.md
--
-- RECRIAÇÃO LIMPA (dev/homologação nesta fase):
-- Remove tabelas das Bases antes de recriar. Aceitável enquanto não há dados de produção
-- a preservar. Em produção futura, preferir migrações incrementais (ALTER) sem DROP total.
DROP TABLE IF EXISTS conveyor_base_nodes CASCADE;
DROP TABLE IF EXISTS conveyor_bases CASCADE;

CREATE TABLE conveyor_bases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(64) NULL,
  name VARCHAR(256) NOT NULL,
  description TEXT NULL,

  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' CHECK (
    status IN ('DRAFT', 'ACTIVE', 'INACTIVE')
  ),

  version INT NOT NULL DEFAULT 1,
  CONSTRAINT chk_conveyor_bases_version_positive CHECK (version > 0),

  source_type VARCHAR(16) NOT NULL DEFAULT 'MANUAL' CHECK (
    source_type IN ('MANUAL', 'MATRIX', 'CONVEYOR')
  ),
  -- Referência polimórfica: sem FK. Semântica por source_type (validação no service).
  -- MANUAL -> NULL; MATRIX -> ITEM raiz em matrix_nodes; CONVEYOR -> esteira de origem.
  source_ref_id UUID NULL,

  metadata_json JSONB NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conveyor_bases_code_active
  ON conveyor_bases (code)
  WHERE deleted_at IS NULL AND code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_bases_status
  ON conveyor_bases (status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_bases_source
  ON conveyor_bases (source_type, source_ref_id)
  WHERE deleted_at IS NULL;

-- root_id: OPTION -> root_id = id do próprio OPTION; AREA/STEP -> root_id = id da OPTION raiz.
-- root_id deve referir um OPTION na mesma base_id (validação na aplicação).
CREATE TABLE conveyor_base_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  base_id UUID NOT NULL REFERENCES conveyor_bases (id) ON DELETE RESTRICT,
  parent_id UUID NULL REFERENCES conveyor_base_nodes (id) ON DELETE RESTRICT,
  root_id UUID NOT NULL,

  node_type VARCHAR(16) NOT NULL CHECK (
    node_type IN ('OPTION', 'AREA', 'STEP')
  ),

  code VARCHAR(50) NULL,
  name VARCHAR(150) NOT NULL,
  description TEXT NULL,

  order_index INT NOT NULL DEFAULT 0,
  level_depth INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_conveyor_base_nodes_order_non_negative CHECK (order_index >= 0),
  CONSTRAINT chk_conveyor_base_nodes_level_non_negative CHECK (level_depth >= 0),

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  planned_minutes INT NULL,
  CONSTRAINT chk_conveyor_base_nodes_planned_minutes CHECK (
    planned_minutes IS NULL OR planned_minutes >= 0
  ),
  default_responsible_id UUID NULL REFERENCES collaborators (id) ON DELETE SET NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,

  source_key VARCHAR(100) NULL,
  metadata_json JSONB NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,

  CONSTRAINT chk_conveyor_base_parent_option_root CHECK (
    (node_type = 'OPTION' AND parent_id IS NULL)
    OR (node_type <> 'OPTION' AND parent_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_conveyor_base_nodes_base
  ON conveyor_base_nodes (base_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_base_nodes_parent
  ON conveyor_base_nodes (parent_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_base_nodes_root
  ON conveyor_base_nodes (root_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_base_nodes_type
  ON conveyor_base_nodes (node_type);

CREATE INDEX IF NOT EXISTS idx_conveyor_base_nodes_active
  ON conveyor_base_nodes (is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conveyor_base_nodes_base_root_level_order
  ON conveyor_base_nodes (
    base_id,
    root_id,
    level_depth,
    order_index
);

CREATE INDEX IF NOT EXISTS idx_conveyor_base_nodes_responsible
  ON conveyor_base_nodes (default_responsible_id)
  WHERE deleted_at IS NULL;
