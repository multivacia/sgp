# Retorno — auditoria-textos-tela

- **TASK_ID:** `auditoria-textos-tela`
- **Data/hora:** 2026-10-10 (UTC)
- **Objetivo:** localizar na `develop` textos de tela em português de Portugal e jargão técnico (STEP, nomes de coluna/tabela, códigos), e entregar uma ferramenta de busca reutilizável.
- **Status final:** CONCLUÍDO — análise + script. **Nenhum texto de produto foi corrigido** (aguarda decisão).
- **Branch:** `ccr-4b05a2d1-plgj52` (código idêntico a `origin/develop` `54b23b5` + PR #34, que não toca nos textos auditados)
- **SHA inicial:** `4b5191b`
- **SHA final:** ver `git log -1` (commit desta atividade na branch do PR #34, por exigência do hook de encerramento da sessão).

## Arquivos

- `scripts/auditar-textos-tela.mjs` (novo) — auditoria por categoria `PT-PT` / `TECNICO`, saída no terminal e CSV opcional.
- `package.json` — script `npm run auditoria:textos`.
- `docs/ai/returns/auditoria-textos-tela-retorno.md` (este).

## Como o script decide

- Varre `src/` e `server/src/` (`.ts/.tsx`); ignora testes, mocks, `config/`, comentários, imports, logs.
- Analisa só o conteúdo de strings e texto JSX; descarta SQL, classes CSS, rotas `/api`, valores de `id/value/role/aria-*`.
- No backend ignora `new Error(...)` genérico: o `errorHandler` troca a mensagem por "Serviço temporariamente indisponível" (não chega à tela).
- É triagem: cada linha deve ser conferida.

## Resultado na develop (144 achados)

| Categoria | Frontend | Backend (mensagens de API) |
|---|---|---|
| PT-PT | 17 | 11 |
| TECNICO | 40 | 76 |

Principais grupos:

- **PT-PT:** "passo" no apontamento gerencial (`ApontamentoGestorPage.tsx`, 7 ocorrências, incluindo "Registo em nome…"); "Ficheiro" (por documento, frontend e backend); "Contacte o administrador" (login/apontamento); "ao premir" (dashboards); "registados/registadas"; "Gerir"; "autenticar-se"; "Utilizador criado…".
- **STEP / tipos internos:** `ConveyorOperationalPlanItemRow.tsx:215` (" · STEP <status>" na linha do plano), `ExtraTimeEntryDescriptionsTab.tsx:73`, `operationalSemantics.ts:41`, `LateStructureAppendDrawer.tsx` ("tarefa (OPTION)", "setor (AREA)"); backend: "atividades (STEP)", "etapas (STEP)", "tipo ACTIVITY", "step(s) com realizado…".
- **Nomes técnicos:** "bucket operacional" (dashboard, backlog, jornada), `completed_at`, `entry_at`, `total_planned_minutes`, `em_atraso`, permissão `conveyors.edit_status` exibida na tela, `DOCUMENT_DRAFT_ADAPTER`, `NETWORK_ERROR`, `passwordChangedAt`; backend: mensagens de validação com `role_id`, `sector_id`, `collaboratorId`, `teamId`, `UUID`, `payload`.

## Decisões / glossário

- Pelo `PROJECT_CONTEXT.md`: hierarquia **Esteira → Tarefa → Setor → Atividade**. `STEP` = **Atividade** (OPTION = Tarefa, AREA = Setor). "Etapa"/"passo" também devem virar **atividade**, salvo quando significar etapa de fluxo (ex.: "Próximo passo:" em Nova esteira — conferir).

## Validação

- `npm run auditoria:textos` → 144 achados, exit 1 (esperado quando há achados).
- `npm run auditoria:textos -- --so=PT-PT --csv=...` → 28 achados, CSV gerado.
- `npx eslint scripts/auditar-textos-tela.mjs` → ok.

## Pendências / próximo passo

- Decidir se as correções de texto entram em PR próprio (recomendado, separado do PR #34) e se mensagens de validação do backend (normalmente vistas só por admin) entram no escopo.
- Após corrigir, o script pode virar checagem de CI.

## Git

- Commit/push na branch `ccr-4b05a2d1-plgj52` (entra no PR #34; pode ser movido para PR próprio se preferir). `git status` limpo.

Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.
