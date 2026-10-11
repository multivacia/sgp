# Retorno — analisar-divergencia-apontamento-web-kiosk

- **TASK_ID:** analisar-divergencia-apontamento-web-kiosk
- **Data/hora:** 2026-10-08 (America/Sao_Paulo)
- **Objetivo:** explicar por que "Apontar horas" sem filtro lista 10 atividades no SGP web e 7 no Kiosk para o mesmo colaborador; estruturar checklist de homologação do pacote develop.
- **Status final:** análise concluída, sem alteração de código.
- **Branch:** develop (clone raso, somente leitura)
- **SHA inicial:** a4a3d5d
- **SHA final:** a4a3d5d (sem commits)

## Resumo

As duas telas consultam fontes diferentes; a diferença é regra de consulta, não falha.

| | SGP web — Apontar horas | Kiosk — fila de atividades |
|---|---|---|
| Endpoint | `GET /api/v1/me/time-entry-candidates` | `GET /api/v1/production/me/work-queue` |
| Serviço | `serviceListTimeEntryCandidates` (`my-activities.service.ts`) | `serviceGetProductionWorkQueue` → `serviceGetWorkQueueForCollaborator` |
| Fonte 1 | `listTimeEntryCandidatesForCollaborator`: toda STEP em aberto com alocação estrutural (`conveyor_node_assignees`, direta ou via time), esteira `A_INICIAR`/`EM_ANDAMENTO`, **independente do plano** | `listMyWorkQueueRows`: itens do plano semanal publicado, `planItemStatuses: ['PLANNED']`, `assigned_collaborator_id` = colaborador, data = hoje ou atrasados não concluídos |
| Fonte 2 | `listTimeEntryCandidatesFromPublishedPlan`: itens PLANNED do plano publicado (hoje + atrasados) | — |
| Unidade | uma linha por STEP (dedup) | uma linha por item do plano |

As 3 atividades a mais na web são, em princípio, STEPs com alocação estrutural ao colaborador que não estão no plano dele para hoje/atrasadas (planejadas para dia futuro, para outra pessoa, MOVED, ou não planejadas). No Kiosk, elas aparecem em **Outra atividade** (`GET /production/me/time-entry-candidates`, mesmo serviço da web).

Diferenças secundárias (podem inverter o sinal da diferença):
- O Kiosk não filtra esteira por status nem STEP concluída quando o item é de hoje; a web filtra.
- O Kiosk repete a STEP se houver mais de um item de plano para ela; a web deduplica.
- Sem plano publicado na semana, o Kiosk mostra 0 e a web continua mostrando a alocação estrutural.

## Diagnóstico sugerido (somente leitura)

Lista as STEPs que a web mostra pela alocação estrutural e que não estão na fila do Kiosk:

```sql
WITH estrutural AS (
  SELECT DISTINCT step.id, cv.name AS esteira, step.name AS atividade
  FROM conveyor_node_assignees cna
  JOIN conveyor_nodes step ON step.id = cna.conveyor_node_id
   AND step.deleted_at IS NULL AND step.is_active AND step.node_type = 'STEP'
   AND step.operational_status IS DISTINCT FROM 'COMPLETED'
   AND step.operational_status IS DISTINCT FROM 'ABORTED'
  JOIN conveyors cv ON cv.id = cna.conveyor_id AND cv.deleted_at IS NULL
   AND cv.operational_status IN ('A_INICIAR', 'EM_ANDAMENTO')
  WHERE cna.deleted_at IS NULL AND (
    (cna.assignment_type = 'COLLABORATOR' AND cna.collaborator_id = '<id-colaborador>'::uuid)
    OR (cna.assignment_type = 'TEAM' AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = cna.team_id AND tm.collaborator_id = '<id-colaborador>'::uuid AND tm.is_active)))
)
SELECT e.esteira, e.atividade
FROM estrutural e
WHERE NOT EXISTS (
  SELECT 1 FROM operational_work_plan_items i
  JOIN operational_work_plans p ON p.id = i.work_plan_id AND p.status = 'PUBLISHED' AND p.deleted_at IS NULL
  WHERE i.deleted_at IS NULL AND i.status = 'PLANNED'
    AND i.assigned_collaborator_id = '<id-colaborador>'::uuid
    AND i.activity_node_id = e.id
    AND p.week_start_date = date_trunc('week', current_date)::date
    AND i.planned_date <= current_date);
```

Observação: a consulta simplifica (não exige área/opção ativas e não escolhe a versão mais recente do plano da semana); serve para identificar as 3 atividades, não para reproduzir a contagem exata.

## Decisão de produto (Gustavo, 08/10/2026)

A regra do Kiosk é a correta e passa a valer para web e Kiosk, ampliada:
- apontar somente em atividades planejadas para o colaborador em plano publicado: atrasadas, de hoje ou futuras, em qualquer semana;
- concluídas e abortadas não aparecem em nenhuma das telas;
- Outra atividade (Kiosk) e a busca de outras atividades (web) seguem a mesma regra;
- Extra Esteira e o lançamento do gestor em nome de outro ficam fora.

Prompt de implementação: `docs/ai/prompts/apontamento-somente-planejado.md`.

## Arquivos

- Criado: `docs/ai/returns/analisar-divergencia-apontamento-web-kiosk-retorno.md`
- Nenhum arquivo de código alterado. Sem migrations.

## Validação

- Análise estática do código na develop (a4a3d5d). Build, lint e testes não executados (sem alteração de código).
- Consulta SQL não executada: sem acesso ao banco.

## Entrega

- Sem autorização/credencial de push nesta sessão: arquivo criado localmente, **não publicado** no GitHub.
- Checklist de homologação publicado como página separada (claude.ai).

## git status

Working tree com 1 arquivo não rastreado (este retorno).

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
