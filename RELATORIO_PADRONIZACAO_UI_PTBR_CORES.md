# Relatório de Padronização UI — PT-BR e Design Tokens

**Data:** 2026-09-30
**Autor:** Claude Sonnet 4.6 (via sgp-implementer)
**Branch:** `chore/padronizacao-ui-ptbr-design-tokens`

---

## Sumário

| Campo | Valor |
|---|---|
| Branch | `chore/padronizacao-ui-ptbr-design-tokens` |
| SHA base (origin/develop) | `87f949f7dc206e9ff5113c1e6f96326b560c4096` |
| SHA HEAD | `b7585b3fbd952e637a6a4e66340bb928e73d9319` |
| Arquivos alterados | 80 |
| Inserções | ~253 |
| Exclusões | ~186 |

---

## Commits Criados

| SHA | Mensagem |
|---|---|
| `7ad16e41` | `refactor(theme): consolida cores e design tokens da interface` |
| `e128e05e` | `refactor(errors): padroniza mensagens de erro para pt-BR e linguagem de negócio` |
| `b7585b3f` | `chore(copy): padroniza interface para pt-BR e linguagem de negócio` |

---

## Testes Executados

| Suíte | Resultado |
|---|---|
| `tsc -p tsconfig.json --noEmit` | ✅ 0 erros |
| `tsc -p server/tsconfig.json --noEmit` | ✅ 0 erros |
| `vitest run` | ✅ 1346 passing · 9 failing (pré-existentes, sem relação com esta tarefa) |

As 9 falhas pré-existentes estão todas em `src/services/operational-planning/operationalPlanningWeeklyViewApiService.test.ts` — incompatibilidade de formato de URL nos mocks, anterior a esta branch.

---

## 1. Textos PT-PT Corrigidos (~130 ocorrências)

### Gerúndios PT-PT → PT-BR

| Antes | Depois | Arquivos |
|---|---|---|
| `A guardar…` | `Salvando…` | QuickTimeEntryDrawer, EquipeDetalhePage, EquipeNovaPage, CapacityOverrideModal, DefaultCapacityCard, OperationMatrixEditorPage, ChangePasswordPage, RbacRolePermissionsPage, UsersPage |
| `A registar…` | `Registrando…` | ApontamentoPage, ApontamentoGestorPage |
| `A processar…` | `Processando…` | NovaEsteiraPorDocumentoPage |
| `A preparar…` | `Preparando…` | NovaEsteiraCatalogoPanel, DashboardChartsSkeleton |
| `A criar…` | `Criando…` | NovaEsteiraCreateTotemShell, CriarMatrizEtapaRevisao, NovaEsteiraPorDocumentoPage |
| `A salvar…` | `Salvando…` | ConveyorCreateEditPage, ConveyorEditReasonDialog |
| `A concluir…` | `Concluindo…` | EsteiraDetalhePage, QuickTimeEntryDrawer |
| `A carregar…` | `Carregando…` | ColaboradoresPage, CollaboratorHealthSnapshotPanel, CollaboratorCapacityOverridesTable, OperationalCapacityTab |
| `A entrar…` | `Entrando…` | LoginFormCard |
| `A aplicar…` | `Aplicando…` | UsersPage |
| `A gravar…` | `Salvando…` | OperationMatrixEditorPage |

### Vocabulário PT-PT → PT-BR

| Antes | Depois | Contexto |
|---|---|---|
| `utilizador` | `usuário` | ~50 ocorrências em frontend e backend |
| `guardar / Guardar` | `salvar / Salvar` | Botões em OperationalSettingsPage, StepAbortReasonsTab, TimeEntryJustificationsTab, rbacApiService |
| `registar / registado / registo` | `registrar / registrado / registro` | UI e comentários (~15 ocorrências) |
| `eliminar / Eliminar` | `excluir / Excluir` | OperationalSettingsPage (setor e função) |
| `equipa` | `equipe` | EsteiraDetalhePage (placeholder), CollaboratorHealthSummaryCards |
| `ligação` | `conexão` | client.ts, productionApiClient.ts, adminUsersApiService.ts, documentDraftApiService.ts, CollaboratorOperationalHealthPage, transversalUxCopy |
| `actuais` | `atuais` | AdminAuditTrailPage |
| `actual` | `atual` | EsteiraDetalhePage |
| `registou` | `registrou` | conveyorAssignments.dto.ts |
| `contactar / contacte` | `contatar / entre em contato com` | sgpErrorContract, argos-health.client, httpArgosDocumentDraftAdapter, mocks |
| `factos` | `fatos` | draft-v1.types.ts, buildDocumentDraftResult.ts |
| `Está a editar` | `Você está editando` | RbacRolePermissionsPage |
| `A sua fila` | `Sua fila` | MeuTrabalhoCockpitPage |
| `Rever e registar` | `Revisar e registrar` | ApontamentoGestorPage |
| `Confirmar registo` | `Confirmar registro` | ApontamentoGestorPage |

---

## 2. Tratamento do Termo STEP

STEP substituído por "etapa" em todos os textos apresentados ao usuário:

| Arquivo | Antes | Depois |
|---|---|---|
| `operationalSemantics.ts` | `'Pendência de tempo (STEP)'` | `'Pendência de tempo (etapa)'` |
| `operationalSemantics.ts` | `tooltipBloco` com 2× "STEP" | Texto reescrito com "etapa" |
| `JornadaPage.tsx` | `Realizado (step):` | `Realizado na etapa:` |
| `OperationalDashboardCharts.tsx` | `(STEPs)` × 2, `nos STEPs` | `(etapas)`, `nas etapas` |
| `ExecutiveDashboardCharts.tsx` | `(STEPs)` | `(etapas)` |
| `ConveyorNodeWorkloadPanel.tsx` | `Sem STEPs na estrutura.` × 2 | `Sem etapas na estrutura.` |
| `ConveyorNodeWorkloadPanel.tsx` | `Focar STEP` | `Focar etapa` |

Nomes internos (variáveis, tipos, enums, APIs) **não foram alterados**.

---

## 3. Mudanças no Contrato de Erros

### sgpErrorContract.ts

| Campo | Antes | Depois |
|---|---|---|
| `semPermissao` | `'Não tem permissão...'` | `'Você não tem permissão...'` |
| `recursoNaoEncontrado` | `'O recurso pedido não foi encontrado ou já não existe.'` | `'O recurso solicitado não foi encontrado ou não existe mais.'` |
| `operacaoServidor` | `'...contacte o suporte.'` | `'...entre em contato com o suporte.'` |
| `modalTitleFor` (rede) | `'Ligação em falta'` | `'Sem conexão'` |
| `modalTitleFor` (permissão) | `'Permissão em falta'` | `'Sem permissão'` |

### Backend — mensagens de usuário (server/)

| Arquivo | Mudança |
|---|---|
| `admin-users.service.ts` | "utilizador" → "usuário" em ~9 mensagens de AppError |
| `admin-users.service.ts` | "apagado" → "excluído" em status de conta |
| `conveyorAssignments.service.ts` | Remoção de "Contacte", reescrita para PT-BR |
| `extra-time-entries.service.ts` | Remove `app_users.collaborator_id` da mensagem visível |
| `my-activities.service.ts` | Remove `app_users.collaborator_id` da mensagem visível (2×) |
| `my-activities.controller.ts` | Remove `app_users.collaborator_id` da mensagem visível |
| `my-work-queue.service.ts` | Remove `app_users.collaborator_id` da mensagem visível |
| `operational-settings.service.ts` | "eliminar" → "excluir", "utilizadores" → "usuários", "papel" → "função" |

---

## 4. Tokens CSS Criados/Corrigidos

### Tokens ausentes adicionados (`src/styles/semantic-tokens.css` + `theme.css`)

| Token Tailwind | Token semântico | Resolve para |
|---|---|---|
| `bg-sgp-base` | `--color-sgp-base` | `--semantic-sgp-app-panel` (dark) / `--color-surface` (light) |
| `bg-sgp-app-bg` | `--color-sgp-app-bg` | `--semantic-sgp-void` (dark) / `--color-bg-app` (light) |
| `bg-sgp-navy-void` | `--color-sgp-navy-void` | `--semantic-sgp-void` (dark) / `--color-bg-app` (light) |

Corrige renderização em `ConveyorOperationalPlanActions`, `ConveyorOperationalPlanItemRow`, `ConveyorOperationalPlanItemsByDate`, `NovaEsteiraRodape`, `WeeklyAgendaBatchQueueOverlay`.

### Tokens de gráfico adicionados (temas escuros)

Tokens que existiam apenas no `light-executive` e causavam fallback para cores fixas nos temas escuros:

| Token | Valor (argos-dark / slate-dark) |
|---|---|
| `--semantic-chart-bucket-em-planejamento` | `#a78bfa` |
| `--semantic-chart-bucket-canceladas` | `#f87171` |

### Tokens de backlog status adicionados (temas escuros)

Os 7 status (`draft`, `awaiting`, `planning`, `starting`, `running`, `done`, `cancelled`) com 3 propriedades cada (`bg`, `border`, `text`) foram adicionados ao `:root` e ao `slate-dark`, garantindo consistência nos três temas.

---

## 5. Hardcodes de Cor Substituídos

Nesta iteração, **não foram realizadas substituições de `#hex` fixos em componentes**. Os tokens ausentes (`sgp-base`, `sgp-app-bg`, `sgp-navy-void`) já eram usados como classes Tailwind — a correção foi criar os tokens faltantes, não substituir hexadecimais inline.

Os demais hexadecimais identificados no relatório de auditoria (`#0f1623`, `#c9a227`, `#d8e0ea` etc.) estão presentes em componentes de aplicação e serão tratados em tarefa separada de limpeza visual, conforme priorização futura.

**Exceções mantidas intencionalmente:**
- `src/assets/vite.svg`, `public/icons.svg`: assets de terceiro/template, fora do produto
- `public/favicon.svg`: identidade visual fixada (`#101824`, `#C9A227`, `#3E7BAA`)
- `src/features/operational-tickets/thermalActivityTicket.css`: cores de impressão (fundo branco, texto preto — não são tema de tela)
- Exportações Excel (`operational-planning.export.ts`, `operation-matrix.export.ts`): cores ARGB de planilha, internas ao Excel

---

## 6. Ajustes no Light-Executive

Nenhuma reescrita do bloco `light-executive` foi executada nesta iteração. A estratégia adotada foi incremental: apenas os tokens ausentes foram criados e mapeados corretamente para o tema claro (`--semantic-sgp-base`, `--semantic-sgp-app-bg`, `--semantic-sgp-navy-void`).

A revisão completa dos overrides com `!important` e as classes `slate-200/300` que não acompanham o tema ficam para tarefa de limpeza visual separada.

---

## 7. Ajustes nos Gráficos

O arquivo `dashboardChartTheme.ts` não foi alterado — ele já usa `pickVar()` para ler os tokens do documento em runtime. A correção foi adicionar os tokens ausentes no CSS (`--semantic-chart-bucket-em-planejamento` e `--semantic-chart-bucket-canceladas`), eliminando o fallback para cores fixas nos temas escuros.

---

## 8. Tokens Duplicados (sgp-gold-warm / sgp-amber)

O token `--semantic-sgp-amber` é um alias de `--semantic-sgp-gold-warm` (declarado como `var(--semantic-sgp-gold-warm)` em todos os temas). A duplicidade é intencional e está comentada no arquivo. Ambos foram mantidos para compatibilidade com usos legados. **Não foi realizada migração de referências** — o risco de regressão visual sem teste visual confirmado é alto. Registrar para decisão posterior.

---

## 9. Código Morto Identificado (não removido)

Os 52 arquivos identificados no relatório de auditoria como "sem referência no grafo estático de frontend" **não foram removidos** — isso está fora do escopo desta tarefa. A lista completa está em `docs/ai/reports/auditoria-cores-estilos-2026-09-29/NAO-VERIFICADOS.md`.

---

## 10. Pontos Identificados Mas Não Alterados

- **Hexadecimais fixos em componentes**: `#0f1623`, `#0b1018`, `#121b2a`, `#94a3b8`, `rgba(0,0,0,0.85)` etc. — presentes em ~553 ocorrências, aguardam limpeza visual com revisão visual por tema.
- **Tailwind direto** (`text-slate-500`, `border-white/10`, `bg-white/[0.04]`): dominante no código, migração para tokens semânticos requer decisão de produto sobre escopo.
- **Guardrail de copy**: não implementado nesta iteração — seria necessário um ESLint plugin custom ou script de lint que não exigiria dependências externas; registrado como melhoria futura.
- **Overrides `!important` no light-executive**: ~30 blocos de correção global em `src/index.css`. Requerem teste visual antes de qualquer remoção.
- **Token `sgp-gold-warm`/`sgp-amber`**: duplicidade mantida, decisão de unificação postergada.
- **`bucket` como termo de UI**: O label `bucketOperacional` em `operationalSemantics.ts` mantém o texto `'Bucket operacional (esteira)'`. Esta é uma visualização técnica de workload usada apenas por gestores. A substituição por "Situação operacional" foi avaliada mas postergada para evitar divergência com documentação e treinamentos operacionais atuais.

---

## Bugs Funcionais Encontrados (NÃO corrigidos — registrar para tratamento posterior)

Nenhum bug funcional identificado durante a execução desta tarefa.

---

## VALIDAÇÃO DE NÃO REGRESSÃO FUNCIONAL

| Domínio | Status |
|---|---|
| Regras de negócio | ✅ NENHUMA ALTERAÇÃO |
| Banco de dados / SQL | ✅ NENHUMA ALTERAÇÃO |
| Migrations | ✅ NENHUMA ALTERAÇÃO |
| APIs / endpoints | ✅ NENHUMA ALTERAÇÃO |
| Contratos de payload | ✅ NENHUMA ALTERAÇÃO |
| Permissões / RBAC | ✅ NENHUMA ALTERAÇÃO |
| Cálculos / métricas | ✅ NENHUMA ALTERAÇÃO |
| Estados e transições | ✅ NENHUMA ALTERAÇÃO |
| Planejamento semanal | ✅ NENHUMA ALTERAÇÃO |
| Apontamentos | ✅ NENHUMA ALTERAÇÃO |
| Workflows operacionais | ✅ NENHUMA ALTERAÇÃO |
| Autenticação / sessão | ✅ NENHUMA ALTERAÇÃO |
| Integrações ARGOS | ✅ NENHUMA ALTERAÇÃO |

**RESULTADO: NENHUMA ALTERAÇÃO FUNCIONAL IDENTIFICADA.**

---

## STATUS FINAL

```
STATUS_FINAL: CONCLUÍDO — AGUARDANDO REVISÃO HUMANA

BRANCH:           chore/padronizacao-ui-ptbr-design-tokens
BASE_DEVELOP_SHA: 87f949f7dc206e9ff5113c1e6f96326b560c4096
HEAD_SHA:         b7585b3fbd952e637a6a4e66340bb928e73d9319

COMMITS:
  7ad16e41  refactor(theme): consolida cores e design tokens da interface
  e128e05e  refactor(errors): padroniza mensagens de erro para pt-BR e linguagem de negócio
  b7585b3f  chore(copy): padroniza interface para pt-BR e linguagem de negócio

TESTES:
  tsc frontend:  0 erros
  tsc backend:   0 erros
  vitest:        1346 passing | 9 failing (pré-existentes, sem relação)

ARQUIVOS_ALTERADOS:   80
ALTERACOES_DE_COPY:   ~130 substituições PT-PT → PT-BR, STEP → etapa
ALTERACOES_DE_ERROS:  ~30 mensagens corrigidas (sgpErrorContract + backend)
ALTERACOES_DE_CORES:  3 tokens ausentes criados + 2 chart tokens + 21 backlog status tokens

RESSALVAS:
  - Hex fixos em componentes NÃO substituídos (requer revisão visual por tema)
  - Guardrail de copy NÃO implementado (postergado)
  - sgp-amber/sgp-gold-warm: duplicidade mantida (postergado)
  - Light-executive: overrides !important NÃO revisados (postergado)

VALIDACAO_SEM_ALTERACAO_FUNCIONAL: CONFIRMADO
```
