# Evolução das Esteiras

Tela de acompanhamento operacional das esteiras para gestão/administrativo (Bravo e demais clientes).

## Decisão visual (Bravo / Tati)

Layout escolhido: **tabela analítica hierárquica expansível**, com aparência de relatório operacional/gestão.

- Filtros horizontais no topo (período, esteira, status, agrupar por hierarquia)
- Resumo geral consolidado acima da tabela
- Colunas fixas: Item, Status, Previsto, Realizado, Falta, Excedente, Evolução, Seleção
- Paginação no rodapé da tabela (client-side por esteira)
- PDF via `window.print()` com layout analítico print-friendly

## Rota

- **Frontend:** `/app/gestao/evolucao-esteiras`
- **API:** `GET /api/v1/management/conveyor-progress`
- **Permissão:** `conveyors.create` (gestão de esteiras)
- **Menu:** Gestão → Evolução das Esteiras
- **TODO:** permissão granular futura `conveyor_progress.view`

## Objetivo

Permitir acompanhar a evolução operacional das esteiras do macro ao micro, com visão de tempo previsto, realizado e faltante/excedente, incluindo **Apontamentos analíticos** por atividade. Voltada para gestão e impressão operacional em papel.

## Hierarquia exibida

```
Esteira (conveyor)
└── Tarefa (OPTION)
    └── Setor (AREA)
        └── Atividade (STEP)
            └── Apontamentos analíticos (conveyor_time_entries)
```

## Colunas da tabela

| Coluna | Descrição |
|--------|-----------|
| Item | Nível hierárquico + nome (com indentação) |
| Status | Status operacional (esteira) ou da atividade; tarefa/setor exibem `—` |
| Previsto | Tempo planejado agregado |
| Realizado | Tempo apontado agregado |
| Falta | `max(previsto - realizado, 0)` |
| Excedente | `max(realizado - previsto, 0)` — destaque laranja, ex.: `+0h41` |
| Evolução | Percentual real + barra (largura visual limitada a 100%) |
| Seleção | Checkbox **apenas no nível Esteira** |

## Regras de cálculo

Para cada nível (esteira, tarefa, setor, atividade):

| Métrica | Fórmula |
|---------|---------|
| Previsto | Soma de `planned_minutes` dos STEPs do escopo |
| Realizado | Soma de `minutes` dos apontamentos vinculados |
| Falta | `max(previsto - realizado, 0)` |
| Excedente | `max(realizado - previsto, 0)` |
| Evolução | `round(realizado / previsto × 100)`; se previsto = 0 → `—` |

**Coerência visual:** Falta e Excedente nunca são positivos simultaneamente para o mesmo item.

Agregações calculadas no backend (`server/src/shared/conveyorProgressMetrics.ts`).

## Seleção e PDF

- Checkbox de seleção **somente em esteiras**
- “Selecionar todas” afeta as esteiras visíveis na página atual
- Botão **Gerar PDF** desabilitado sem seleção
- PDF/impressão inclui apenas esteiras selecionadas, resumo geral e hierarquia completa com Apontamentos analíticos

## Filtros

- Período dos apontamentos (de/até)
- Busca por nome/código da esteira
- Status operacional da esteira
- Agrupar por: Hierarquia (fixo)
- Filtros avançados: colaborador, somente excedidas

## Arquivos principais

- Backend: `server/src/modules/conveyor-progress/`
- Frontend: `src/features/conveyor-progress/`
  - `ConveyorProgressPage.tsx`
  - `ConveyorProgressFilters.tsx`
  - `ConveyorProgressSummary.tsx`
  - `ConveyorProgressTable.tsx`
  - `ConveyorProgressAnalyticalEntries.tsx`
  - `ConveyorProgressPrintView.tsx`
- Tipos/domínio: `src/domain/conveyor-progress/`

## Validação manual

1. Acessar `/app/gestao/evolucao-esteiras`
2. Aplicar filtro por período
3. Expandir esteira → tarefa → setor → atividade
4. Verificar seção **Apontamentos analíticos**
5. Selecionar esteira(s) — confirmar ausência de checkbox em níveis filhos
6. Clicar **Gerar PDF** e conferir impressão
7. Conferir coerência Falta/Excedente e barra de evolução > 100%
