-- Limpa dados de esteiras instanciadas (public.conveyors e dependentes).
-- Uso: dev/homologação. Não rode em produção sem backup.
-- Ordem: filhas primeiro (FKs ON DELETE RESTRICT em assignees/time_entries).

BEGIN;

TRUNCATE TABLE
  conveyor_time_entries,
  conveyor_node_assignees,
  conveyor_nodes,
  conveyors
RESTART IDENTITY;

COMMIT;

-- Opcional: bases de esteira (presets em conveyor_bases / conveyor_base_nodes).
-- Descomente se quiser zerar também o catálogo de bases.
/*
BEGIN;
TRUNCATE TABLE
  conveyor_base_nodes,
  conveyor_bases
RESTART IDENTITY;
COMMIT;
*/
