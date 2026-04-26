CREATE TABLE app_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(256) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(256) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(64),
  registration_code VARCHAR(64),
  nickname VARCHAR(256),
  full_name TEXT NOT NULL,
  email VARCHAR(256),
  phone VARCHAR(64),
  job_title VARCHAR(256),
  avatar_url TEXT,
  sector_id UUID REFERENCES sectors (id) ON DELETE SET NULL,
  role_id UUID REFERENCES app_roles (id) ON DELETE SET NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  notes TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_collaborators_code_active ON collaborators (code)
  WHERE code IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX idx_collaborators_sector ON collaborators (sector_id);
CREATE INDEX idx_collaborators_role ON collaborators (role_id);
CREATE INDEX idx_collaborators_status ON collaborators (status);
CREATE INDEX idx_collaborators_full_name ON collaborators (full_name);
