INSERT INTO app_roles (id, code, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ADMIN', 'Administrador'),
  ('22222222-2222-2222-2222-222222222222', 'COLABORADOR', 'Colaborador'),
  ('33333333-3333-3333-3333-333333333333', 'GESTOR', 'Gestor operacional')
ON CONFLICT (code) DO NOTHING;

INSERT INTO sectors (id, name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tapeçaria'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Costura'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Acabamento')
ON CONFLICT (id) DO NOTHING;

INSERT INTO collaborators (
  id,
  code,
  full_name,
  email,
  phone,
  job_title,
  avatar_url,
  sector_id,
  role_id,
  status,
  is_active
) VALUES (
  '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c',
  'COL-001',
  'Maria Silva',
  'maria@exemplo.com',
  '11999999999',
  'Costureira',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=maria-colab',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  'ACTIVE',
  true
) ON CONFLICT (id) DO NOTHING;
