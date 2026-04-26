# Esteira registrada — alocação e apontamento analítico

## Checkpoint (baseline)

A Esteira registrada agora expõe API REST real para alocação de colaboradores por STEP e apontamento analítico por STEP, com soft delete, integridade de domínio e contratos HTTP consistentes com o restante do servidor.

Contratos: **camelCase** e envelope `{ data, meta }`. Erros: **404** (recurso inexistente no escopo), **409** (unicidade / principal duplicado), **422** (validação e regras operacionais). **DELETE** retorna **200** com `ok(...)`, como nos demais módulos.

## Três camadas

1. **Estrutura:** `conveyors`, `conveyor_nodes` (OPTION → AREA → STEP).
2. **Alocação:** `conveyor_node_assignees` — colaboradores por **STEP**; principal opcional; no máximo um principal ativo por atividade.
3. **Execução analítica:** `conveyor_time_entries` — fato de tempo por colaborador em **STEP**; `conveyor_node_assignee_id` opcional.

`default_responsible_id` em `conveyor_nodes` existe apenas por **compatibilidade legada**. **Não** deve ser tratado como fonte principal da alocação multi-colaborador. A fonte de verdade da alocação multi-colaborador é **`conveyor_node_assignees`**.

## Integridade

- **Triggers** (`fn_validate_conveyor_node_assignee_row`, `fn_validate_conveyor_time_entry_row`): STEP-only, coerência `conveyor_id` ↔ nó, vínculo opcional assignee ↔ mesmo STEP e colaborador.
- **Índices únicos parciais:** par (STEP, colaborador) ativo; no máximo um `is_primary` ativo por STEP.
- **Service** (`conveyorAssignments.service.ts`): colaborador **ACTIVE** e não soft-deleted; mensagens de domínio; conflitos 409 em violações únicas.

## API REST (prefixo `/api/v1`)

Substituir `:conveyorId` e `:stepNodeId` (UUID do nó STEP) nos paths.

| Método | Path |
|--------|------|
| `POST` | `/conveyors/:conveyorId/steps/:stepNodeId/assignees` |
| `GET` | `/conveyors/:conveyorId/steps/:stepNodeId/assignees` |
| `DELETE` | `/conveyors/:conveyorId/steps/:stepNodeId/assignees/:assigneeId` |
| `POST` | `/conveyors/:conveyorId/steps/:stepNodeId/time-entries` |
| `GET` | `/conveyors/:conveyorId/steps/:stepNodeId/time-entries` |
| `DELETE` | `/conveyors/:conveyorId/steps/:stepNodeId/time-entries/:timeEntryId` |

Implementação: `conveyorAssignments.routes.ts`, `conveyorAssignments.controller.ts`, schemas e DTOs no mesmo módulo.

## Evolução futura (não implementado)

- **`conveyor_base_node_assignees`:** espelho/alocações na Base de Esteira (`conveyor_bases` / `conveyor_base_nodes`), com snapshot para a esteira real ao aplicar a base.
- **PATCH** de assignee (`isPrimary` / `orderIndex`).
- **Frontend:** multi-responsável, apontamento analítico, leitura dessas camadas no detalhe real da esteira.
