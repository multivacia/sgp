# R6 S9.4.5 — Validação de pseudo-etapa rollup (consulta SQL)

Para verificar esteiras já gravadas com o padrão bloqueado (área placeholder + etapa com o mesmo nome da opção/TASK):

```sql
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
WHERE lower(trim(area.name)) IN ('área', 'area', 'serviço', 'servico')
  AND lower(trim(step.name)) = lower(trim(opt.name))
  AND step.planned_minutes > 0;
```

Substitua o filtro `c.name` conforme necessário (ex.: `AND c.name ILIKE '%7452%'`). Para novas criações após S9.4.5, o resultado esperado para esse anti-padrão é **zero linhas**.
