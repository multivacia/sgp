-- Alinha OWNER de `teams` e `team_members` ao de `collaborators`, para o role da aplicação
-- ter os mesmos privilégios DDL/DML que nas restantes tabelas de domínio.
--
-- Quando a sessão é superuser, executa ALTER TABLE ... OWNER TO <owner de collaborators>.
-- Caso contrário, apenas emite NOTICE (não falha): nesse caso execute este ficheiro com um
-- utilizador superuser (ex.: postgres) ou reaplique 0016 já ligado ao role da app.

DO $$
DECLARE
  target_owner name;
  is_super boolean;
BEGIN
  SELECT pg_catalog.pg_get_userbyid(c.relowner)
  INTO target_owner
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'collaborators'
    AND c.relkind = 'r'
  LIMIT 1;

  IF target_owner IS NULL THEN
    RAISE NOTICE '0017 teams: tabela collaborators não encontrada; ignorado.';
    RETURN;
  END IF;

  SELECT COALESCE(rolsuper, false)
  INTO is_super
  FROM pg_catalog.pg_roles
  WHERE rolname = current_user;

  IF is_super THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'teams'
    ) THEN
      EXECUTE format('ALTER TABLE public.teams OWNER TO %I', target_owner);
    END IF;
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'team_members'
    ) THEN
      EXECUTE format('ALTER TABLE public.team_members OWNER TO %I', target_owner);
    END IF;
    RAISE NOTICE '0017 teams: OWNER de teams e team_members alinhado a %.', target_owner;
  ELSE
    RAISE NOTICE
      '0017 teams: sem privilégio de superuser — não foi alterado OWNER. '
      'Se a app receber "permissão negada" em teams, execute este SQL como superuser '
      'ou assegure que 0016 corre com o mesmo role da connection string da aplicação. '
      'OWNER esperado (collaborators): %.',
      target_owner;
  END IF;
END $$;
