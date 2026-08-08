# Relatório de Teste — Dispensar atividade (STEP ABORTED)

## Escopo revisado

- Spec: `docs/specs/dispensar-atividade-producao-spec.md` (APROVADA PARA IMPLEMENTAÇÃO)
- Inventário: `docs/inventory/abortar-atividade-producao-inventario.md`
- Implementation report: `docs/implementation/dispensar-atividade-producao-implementation-report.md`
- Branch: `feature/abortar-atividade-producao`
- HEAD tip (sem commit da implementação): `276a92ffae2fec58b87c3f646382f83cbf6006b6`
- SHA-base `origin/main`: `34679fd90b5270dc3e8f56c4f9b6f32bedf8815b`
- Ciclo de correção: **2** de 2 (após REPROVA inicial → rodada 2 do `sgp-implementer`)

## Execução da suíte

Reexecução **independente** pelo orquestrador após a rodada 2 (exit codes reais):

| Comando | Exit code | Observação |
|---|---|---|
| `npx tsc -b` (FE) | **0** | |
| `cd server && npx tsc -p tsconfig.json` | **0** | |
| `cd server && npm test -- --run` abort unit + integração + progress + stepOperationalStatus + sequence | **0** | 5 files, **41 passed** |
| `npm test -- --run` stepOperationalStatus FE + filtros tickets planning/conveyor | **0** | 3 files, **26 passed** |
| `npm run lint` (repo inteiro) | não reexecutado nesta rodada | Implementador reportou exit 1 por dívidas pré-existentes; 0 errors nos arquivos da feature |
| `npm test` / `npm run server:test` suíte completa | **não executada** | Subset da spec com evidência; risco residual |

Integração abort usa `describe.skipIf(!hasDb)` e **fail-fast** (`throw`) se `hasDb` e migration `0050` (`aborted_at`) ausente — corrige o early-return silencioso da rodada 1.

## Cobertura dos critérios de aceite

| Critério de aceite | Coberto por teste? | Arquivo do teste |
|---|---|---|
| Migration CHECK + colunas abort | Sim (aplicação local + fail-fast se ausente) | `0050_…sql`; integração |
| Tipos BE/FE + label Dispensada | Sim | `stepOperationalStatus.test.ts` (BE/FE) |
| Transições → ABORTED só origens permitidas | Sim | BE unit |
| COMPLETED → ABORTED → 409 | Sim | integração |
| Esteira FINALIZADA/CANCELADA → 409 | Sim (rodada 2) | integração |
| `isStepClosedForSequence` inclui ABORTED | Sim | sequence + domain |
| Progresso: ABORTED ≠ completed; previsto efetivo exclui | Sim (rodada 2) | `conveyor-progress.service.test.ts` |
| POST abort/restore + Idempotency-Key | Sim (serviço; rotas presentes) | serviço + unit key ausente |
| Key ausente → 400 | Sim (rodada 2) | `conveyor-step-abort.unit.test.ts` |
| Replay mesma key idempotente; key divergente → 409 | Sim | integração |
| Lock compartilhado + concorrência apontamento×dispensa | Sim | integração (2 conexões) |
| Concorrência conclusão×dispensa | Sim | integração |
| Sync plano esteira + work plan → CANCELLED | Sim (rodada 2) | integração |
| Time entries preservadas; block novos | Sim | integração |
| Tickets excluem ABORTED | Sim (rodada 2) | `filterPlanningActivityTicketSources.test.ts` + conveyor print models |
| Restore sem reativar planos | Sim | integração |
| UI só detalhe | Parcial (grep/código; sem E2E) | `EsteiraDetalhePage.tsx` |
| 403 HTTP / 404 HTTP dedicados | Parcial | rotas com `requirePermission`; sem Supertest dedicado |
| Suites completas FE/BE | Não | não executadas |

## Lacunas e regressão não testada

- Suíte completa `npm test` / `npm run server:test` não rodada ponta a ponta.
- Lint global com dívidas pré-existentes (não bloqueante da feature se arquivos novos limpos).
- Sem E2E/UI automatizado do modal Dispensar/Restaurar.
- Sem Supertest HTTP para 403/404 de rota (cobertura no serviço + guards de rota).
- Caso “dispensa primeiro” na concorrência ainda combina UPDATE sob lock + serviço de apontamento (asserta rejeição); caminho feliz abort completo é coberto noutros testes.

## Validação manual necessária

- Fluxo gestor no detalhe da esteira (motivo catálogo + OUTRO, badge, restore).
- Conferir filas produção/kiosk após dispensa em dados reais.
- Deploy atômico migration `0050` + app em HML (fora desta autorização).

## Ciclo

Ciclo atual de correção: **2** de 2.

## Veredito

**PASSA COM RESSALVAS**

### Por quê não PASSA pleno

Suites completas e lint global não foram reexecutados integralmente; cobertura HTTP 403/404 e E2E UI permanecem parciais. Critérios críticos da spec (domínio, lock, concorrência, sync dos dois planos, tickets ABORTED, progresso, fail-fast) estão cobertos com exit code **0** na reexecução independente.

### Governança

- Branch permanece `feature/abortar-atividade-producao`
- Implementação **não commitada** / **não pushada** / sem atualização de PR nesta autorização
- Migration `0050` só em banco local de teste
