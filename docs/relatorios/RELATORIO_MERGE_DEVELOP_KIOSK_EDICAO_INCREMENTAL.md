# Relatório — Merge develop: Kiosk + Edição incremental

## STATUS_FINAL

`CONCLUÍDO COM RESSALVAS`

## Identidade dos commits

| Campo | Valor |
|-------|-------|
| DEVELOP_ANTES (esperado no brief) | `41c672df7cd111d73047c144012cb2f3260e9c4b` |
| DEVELOP_ANTES (real no gate) | `2efec505c7cab4b63d724819613552c207db8165` |
| FEATURE_HEAD | `3ab6e3be66317295f553cffeb2cded42ddb715ec` |
| MERGE_COMMIT | `08c83c342dbba4ba530d60c27511a1c4ea674d70` |
| DEVELOP_DEPOIS | `435f9bce60b811433726d10beaffca9c8d71ecf4` (merge + relatório; após `git push origin HEAD:develop`) |
| MAIN_ALTERADA | **NÃO** (`origin/main` permanece `6b768c852a18b7428e3dadf761bad7e35c1d61ef`) |

## Divergência do gate

No início da tarefa, `origin/develop` **avançou** em relação a `41c672df…`:

1. `04219a3a` — `fix(kiosk): align other activity entries with canonical assignment rules`
2. `2efec505` — `docs: registra correção de alinhamento de Outra atividade com regra canônica`

Ação tomada: **não** sobrescrever; integrar a feature sobre a develop atual (`2efec505`), preservando os commits novos do Kiosk.

## Estratégia

```text
git switch --detach origin/develop   # 2efec505
git switch -c cursor/integration-develop-kiosk-edicao-incremental-fb5b
git merge --no-ff origin/cursor/edicao-incremental-estrutura-esteira-c836
# mensagem: merge: integra edição incremental de esteiras na develop
```

- Merge **limpo** (estratégia `ort`), **sem conflitos**.
- Sem rebase, sem squash, sem cherry-pick parcial, sem force push.

## Ancestralidade (pré-push)

```bash
git merge-base --is-ancestor 41c672df7cd111d73047c144012cb2f3260e9c4b HEAD
# exit 0

git merge-base --is-ancestor 3ab6e3be66317295f553cffeb2cded42ddb715ec HEAD
# exit 0

git merge-base --is-ancestor 2efec505c7cab4b63d724819613552c207db8165 HEAD
# exit 0
```

Comprova: Kiosk (incl. develop avançada) **+** edição incremental.

## MIGRATIONS

| Item | Resultado |
|------|-----------|
| `0052_operational_extra_time_entries_production_origin.sql` | **PRESENTE** |
| Diff migrations vs develop pré-merge (`2efec505..HEAD`) | **vazio** (nenhuma migration nova da edição incremental) |
| Renumeração / duplicata / remoção | **Não ocorreu** |
| Apply em produção/HML | **Não executado** (fora de escopo) |

## Kiosk preservado

| Critério | Status |
|----------|--------|
| Extra esteira | **SIM** (`KioskExtraEsteiraFlow`, botões/testes) |
| Outra atividade | **SIM** (`KioskOutraAtividadeFlow` + alinhamento `04219a3a`) |
| Migration 0052 | **SIM** |
| Fluxo PIN / produção | **SIM** (código e testes unitários de produção) |
| Testes Kiosk | **PASS** (ver seção TESTES) |

Arquivos de teste localizados, entre outros:

- `src/features/kiosk/KioskActivityCards.test.tsx`
- `src/features/kiosk/kioskExtraEsteiraFlowLogic.test.ts`
- `src/features/kiosk/kioskOutraAtividadeFlowLogic.test.ts`
- `src/domain/production/kioskActivityCardLogic.test.ts`
- `src/domain/production/kioskWorkQueueUi.test.ts`

## Edição incremental integrada

| Critério | Status |
|----------|--------|
| Diff incremental (`computeConveyorStructureDiff` / `serviceApplyConveyorStructureDiff`) | **SIM** |
| IDs preservados (payload frontend com `id` quando persistido) | **SIM** |
| Edição em qualquer status (`canReplaceConveyorStructure` → `true`) | **SIM** |
| Soft-remove híbrido com histórico (COMPLETED/ABORTED forçam soft) | **SIM** |
| Inclusão tardia preservada (`lateAddToWeeklyBacklog` / append existente) | **SIM** |
| Evento `CONVEYOR_STRUCTURE_UPDATED` | **SIM** |
| Migration adicional | **NÃO** (conforme feature) |

## BUILD / TYPECHECK / LINT

| Check | Comando | Exit |
|-------|---------|------|
| BUILD backend | `cd server && npm run build` | **0** |
| TYPECHECK frontend | `npx tsc -b` | **0** |
| BUILD frontend | `npm run build` (`tsc -b && vite build`) | **0** |
| LINT arquivos mesclados/alterados | `npx eslint` (lista fechada de fontes do merge) | **0** |
| Lint global histórico | **Não usado para reprovar** (baseline conhecido fora de escopo) |

## TESTES_KIOSK

Comandos (Node `v22.22.2`):

```bash
npx vitest run src/features/kiosk/ \
  src/domain/production/kioskActivityCardLogic.test.ts \
  src/domain/production/kioskWorkQueueUi.test.ts
```

Resultado agregado frontend (esteiras + kiosk na mesma leva inicial): **19 files / 134 tests PASS**.

Leva específica Kiosk + políticas:

```bash
npx vitest run \
  src/features/kiosk/KioskActivityCards.test.tsx \
  src/features/kiosk/kioskExtraEsteiraFlowLogic.test.ts \
  src/features/kiosk/kioskOutraAtividadeFlowLogic.test.ts \
  src/features/esteiras/conveyorEditSavePolicy.test.ts \
  src/features/esteiras/nova-esteira/matrixToConveyorCreateInput.test.ts
```

**5 files / 45 tests PASS** (exit 0).

Backend unitários de produção/extra correlatos:

```bash
npx vitest run \
  src/tests/production-work-queue.rules.test.ts \
  src/tests/production-time-entries.schemas.test.ts \
  src/tests/production-pin.crypto.test.ts \
  src/tests/production-out-of-sequence.test.ts \
  src/tests/production-plan-assignee.test.ts \
  src/tests/production-credential-status.test.ts \
  src/tests/production-initials.test.ts \
  src/tests/extra-time-entries.schemas.test.ts \
  src/tests/extra-time-entries.service.test.ts
  # (+ structure-diff / lifecycle / abort / fingerprint na mesma leva)
```

**14 files / 71 tests PASS** (exit 0).

## TESTES_ESTEIRA

```bash
cd server && npx vitest run src/tests/conveyor-structure-diff.test.ts
# incluído na leva unitária — PASS

npx vitest run src/features/esteiras/
# incluído na leva frontend — PASS
```

## INTEGRACAO_DB

**NÃO EXECUTADA** — PostgreSQL local não configurado neste ambiente (`DATABASE_URL` ausente; `pg_isready` indisponível).

Integração tentada e **skipped** (exit 0, 56 testes skipped):

- `src/tests/conveyors-patch-structure.integration.test.ts`
- `src/tests/production-extra-time-entries.integration.test.ts`
- `src/tests/production-unassigned-time-entries.integration.test.ts`
- `src/tests/production-time-entries.integration.test.ts`

### Roteiro obrigatório de validação manual / DB (cruzado)

1. Esteira editada incrementalmente recebe nova atividade → novo STEP → backlog quando aplicável → IDs antigos preservados.
2. Kiosk consulta esteira após alteração incremental → ativos disponíveis; soft-removidos fora; IDs consistentes.
3. Apontamento Kiosk em atividade existente → editar nome/tempo/responsável → vínculo pelo mesmo `conveyor_node_id`.
4. Atividade com histórico Kiosk removida da estrutura → histórico permanece; fora da estrutura ativa; sem quebra de FK.

## CI

Acompanhar após o push em `develop` (workflow(s) do repositório). Este relatório registra o estado pré-acompanhamento; atualizar se CI falhar por causa do merge.

## PUSH

```bash
git push origin HEAD:develop
# sem --force / --force-with-lease
```

PR draft de rastreio da branch de integração: `#23` (base `develop`).  
PR `#22` (feature) **não** fechada / **não** mergeada em `main` / **não** retargetada.

## Diff relativo

- `2efec505..HEAD`: essencialmente só a entrada da edição incremental (17 arquivos, +1829/−115) — **sem perda do Kiosk**.
- `41c672df..HEAD`: edição incremental **+** commits de alinhamento Outra atividade já presentes na develop avançada.

## Ressalvas

1. Integração DB / testes de integração PostgreSQL **não executados** neste ambiente (skipped).
2. Cenários cruzados Kiosk × edição incremental ficam como **roteiro manual obrigatório** em HML/local com banco.
3. `origin/develop` no gate já estava em `2efec505` (não `41c672df`); commits extras do Kiosk foram preservados de propósito.
