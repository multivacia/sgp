# R5 S1.1 — ARGOS Conveyor Health (Fechamento)

## Visão geral

A release R5 S1.1 consolida o fluxo de análise de saúde operacional de esteiras com ARGOS, mantendo execução manual por esteira e persistência no SGP para leitura histórica e executiva.

Escopo consolidado:

- Execução manual da análise no detalhe da esteira.
- Persistência de análises no SGP (`conveyor_health_analyses`).
- Consulta de última análise, histórico e resumo por esteira.
- Exibição operacional no detalhe, backlog e dashboard.
- Sem chamadas automáticas ao ARGOS, sem jobs, sem análise em massa.

## Arquitetura de fluxo

1. Frontend dispara `POST /api/v1/conveyors/:id/health-analysis` manualmente.
2. Backend carrega snapshot operacional do SGP.
3. Backend chama ARGOS Conveyor Health.
4. Backend persiste análise e metadados.
5. Frontend consome:
   - `latest` para estado inicial do card;
   - `history` para seleção/tendência;
   - `summary` para backlog/dashboard executivo.

## Endpoints

### `POST /api/v1/conveyors/:id/health-analysis`

- Body opcional: `{ policy: economy | balanced | quality }`.
- Mantém execução manual.
- Em sucesso persiste análise e retorna `meta` com:
  - `analysisId`, `savedAt`, `requestId`, `correlationId`, `routeUsed`, `llmUsed`.
- Se ARGOS falhar: não persiste.
- Se persistência falhar após ARGOS: retorna erro (`500`).

### `GET /api/v1/conveyors/:id/health-analysis/latest`

- Retorna última análise da esteira.
- Sem histórico: `data: null`.

### `GET /api/v1/conveyors/:id/health-analysis/history?limit=10`

- Retorna histórico em ordem `createdAt DESC`.
- `limit` default 10, máximo 50.
- Meta: `limit`, `count`, `hasMore`.

### `GET /api/v1/conveyors/health-analysis/summary?limit=...`

- Retorna última análise por esteira (resumo executivo).
- **Não** retorna `analysis_json`.
- `limit` default 100, máximo 500.

## Variáveis de ambiente

Relevantes para health:

- `ARGOS_BASE_URL`
- `ARGOS_CONVEYOR_HEALTH_ANALYZE_PATH`
- `ARGOS_HEALTH_TIMEOUT_MS`
- `ARGOS_HEALTH_ENABLED`
- `ARGOS_INGEST_TOKEN`

Validações/comportamento:

- `ARGOS_HEALTH_ENABLED=false`: cliente health recusa chamada e retorna indisponível.
- `ARGOS_BASE_URL` ausente: backend responde erro de configuração para health.
- Timeout de health dedicado por `ARGOS_HEALTH_TIMEOUT_MS`.
- `server/.env.example` atualizado com comentários de rotas BFF health.

## Persistência

Tabela: `conveyor_health_analyses`

Campos principais:

- IDs e rastreabilidade: `id`, `conveyor_id`, `request_id`, `correlation_id`
- Execução: `policy`, `route_used`, `llm_used`
- Resumo denormalizado: `health_status`, `score`, `risk_level`
- Payloads:
  - `analysis_json` (completo do ARGOS)
  - `snapshot_summary_json` (somente resumo técnico)
- Auditoria: `created_by`, `created_at`

Índices:

- `(conveyor_id, created_at desc)`
- `request_id`
- `correlation_id`

Permissões:

- Migration inclui `GRANT SELECT, INSERT, UPDATE, DELETE` para `sgp_app` quando a role existir.
- Mitiga erro de permissão (`42501`) em ambientes com role dedicada de aplicação.

## Comportamento de erro

- Falha ARGOS: UI mostra mensagem amigável; tela não bloqueia.
- Falha `latest/history/summary`: fallback discreto sem quebrar tela principal.
- Falha persistência pós-ARGOS: backend retorna erro para evitar falso sucesso.
- Sem detalhes técnicos/JSON bruto para usuário final.

## Telas impactadas

- Detalhe da esteira (`ConveyorHealthAnalysisCard`):
  - latest, history, seleção de análise, tendência.
- Backlog/listagem:
  - coluna ARGOS;
  - filtros executivos ARGOS;
  - chips agregados.
- Dashboard operacional:
  - bloco `ARGOS — Saúde das Esteiras` com KPIs e top itens de atenção.

## Validação manual (checklist)

Pré-requisitos:

1. ARGOS gateway em `localhost:8080` (ou base configurada).
2. SGP backend em `localhost:3333`.
3. SGP frontend em execução.

Checklist:

- [ ] `latest` sem histórico retorna `data: null`.
- [ ] Botão **Analisar saúde com ARGOS** dispara POST manual.
- [ ] Card mostra saúde/score/risco/narrativa.
- [ ] Histórico aparece e permite selecionar análise anterior.
- [ ] Tendência aparece quando há análise anterior.
- [ ] Backlog mostra coluna ARGOS.
- [ ] Filtros ARGOS no backlog funcionam.
- [ ] Dashboard operacional mostra bloco ARGOS.
- [ ] Falha de summary não quebra backlog/dashboard.
- [ ] `ARGOS_HEALTH_ENABLED=0` produz erro amigável no card.

## Comandos de validação executados

Backend:

- `npm run build`
- `npx vitest run src/modules/conveyors/health src/modules/argos`

Frontend:

- `npm run build`
- `npx vitest run src/domain/conveyors src/services/conveyors src/lib/api`
- `npm run test` (suite geral frontend)

## Limitações conhecidas

- Sem autoanálise e sem batch (decisão explícita).
- Sem endpoint de comparação avançada/tendência agregada temporal.
- Classificações de risco/saúde usam normalização textual; valores desconhecidos ficam como `unknown`.

## Próximos passos recomendados

1. Hardening de observabilidade (métricas de latência/erro por endpoint health).
2. Política de retenção de histórico e eventual paginação avançada.
3. Testes E2E de fluxo completo com ambiente ARGOS de homologação.
