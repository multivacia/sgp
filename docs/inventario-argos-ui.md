# Inventário de menções ARGOS e Multivacia na UI do SGP+

> **Data do inventário:** junho/2026 (revisão pós-limpeza UX)  
> **Escopo:** frontend (`src/`) — somente análise/documentação.  
> **Objetivo:** mapear **tudo que o usuário ainda pode ver** e o que existe no código mas está oculto por flags.

---

## Resumo executivo

| Métrica | ARGOS | Multivacia |
|---------|------:|-----------:|
| **Menções visíveis ao usuário hoje** | **3 áreas** (~8 textos) | **3 áreas** (~4 textos) |
| **Ocultas por flag** | **5 áreas** (~40+ textos no código) | — |
| **Apenas código interno** (não renderiza) | ~45 arquivos | ~5 arquivos (comentários CSS) |
| **Telas autenticadas com ARGOS visível** | Sidebar (rodapé) + Header (tema) + Importar OS | — |
| **Telas com Multivacia visível** | — | Login, troca de senha |

### Flags ativas (estado atual)

| Arquivo | Flag | Valor | Efeito na UI |
|---------|------|-------|--------------|
| `src/lib/argos/argosUiFlags.ts` | `SHOW_ARGOS_HEALTH_UI` | `false` | Oculta card **ARGOS Health** (detalhe esteira) e seção **ARGOS — Saúde das Esteiras** (dashboard) |
| `src/lib/argos/argosUiFlags.ts` | `SHOW_ARGOS_SIDEBAR_FAMILY` | `false` | Oculta **Família ARGOS** no cabeçalho da sidebar |
| `src/lib/argos/argosUiFlags.ts` | `SHOW_ARGOS_LOGIN_BRANDING` | `false` | Login usa textos neutros **sem** citar ARGOS |
| `src/lib/backlog/backlogUiFlags.ts` | `SHOW_ARGOS_PANEL_FILTERS` | `false` | Oculta chips/resumos ARGOS no Painel Operacional |
| `src/lib/backlog/backlogUiFlags.ts` | `SHOW_BACKLOG_ARGOS_COLUMN` | `false` | Oculta coluna **ARGOS** e `Sem análise ARGOS` na tabela |

**Lógica técnica preservada:** services, domínio (`domain/argos`, `conveyorHealth*`), DTOs, `loadArgosSummary`, `filterRowsByArgosHealth`, `ConveyorHealthAnalysisCard` interno, testes de domínio — tudo permanece; apenas a renderização está desligada.

---

## Mapa rápido — o que o usuário vê hoje

```
┌─────────────────────────────────────────────────────────────────┐
│  VISÍVEL (ARGOS)                                                 │
│  · Sidebar rodapé: "ARGOS · Plataforma industrial" (+ badge AR) │
│  · Header: opção de tema "Argos Dark"                           │
│  · /app/importar-os: banners, "Situação ARGOS:", clipboard      │
├─────────────────────────────────────────────────────────────────┤
│  VISÍVEL (Multivacia)                                            │
│  · /login: rótulo "Multivacia" (mobile + painel marca)          │
│  · /login: rodapé "ecossistema Multivacia" (form + painel)      │
├─────────────────────────────────────────────────────────────────┤
│  OCULTO POR FLAG (ARGOS — código existe, UI não renderiza)       │
│  · Família ARGOS (sidebar cabeçalho)                            │
│  · Painel Operacional: painel + coluna ARGOS                    │
│  · Dashboard: seção saúde ARGOS                                 │
│  · Detalhe esteira: card ARGOS Health                           │
│  · Login: frases com "ecossistema ARGOS" / "manual ARGOS"       │
├─────────────────────────────────────────────────────────────────┤
│  SEM ARGOS / MULTIVACIA (após limpezas recentes)                 │
│  · /app/backlog (Painel Operacional)                            │
│  · /app/colaboradores/saude-operacional                         │
│  · /app/dashboard (corpo — sem seção ARGOS)                     │
│  · /app/esteiras/:id (sem card saúde ARGOS)                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tabela de inventário — UX visível ao usuário

Legenda **Status:** `APARECE` · `FLAG` (oculto) · `INTERNO` (não renderiza)

### ARGOS — ainda visível

| Tela/Rota | Arquivo | Componente | Status | Texto/Identificador | Contexto | Recomendação |
|-----------|---------|------------|--------|---------------------|----------|--------------|
| **Global** `/app/*` | `src/components/AppSidebar.tsx` | footer | **APARECE** | `ARGOS` · `Plataforma industrial` | Rodapé da sidebar (expandida) | OCULTAR_TEMPORARIAMENTE ou RENOMEAR — ainda expõe marca ARGOS em todas as telas |
| **Global** `/app/*` (rail) | `src/components/AppSidebar.tsx` | footer rail | **APARECE** | badge `AR`, `title="ARGOS · plataforma industrial"` | Sidebar colapsada (desktop) | OCULTAR_TEMPORARIAMENTE — alinhar com decisão do rodapé |
| **Global** `/app/*` | `src/components/AppHeader.tsx` + `src/lib/theme/theme-constants.ts` | seletor Tema | **APARECE** | `Argos Dark` (label do tema `argos-dark`) | Menu conta/header | AVALIAR_COM_NEGÓCIO — renomear para "Escuro (padrão)" ou similar |
| `/app/importar-os` | `src/features/documentos/nova-esteira-documento/NovaEsteiraPorDocumentoPage.tsx` | banners | **APARECE** (condicional) | `ARGOS remoto`, `Modo remoto ARGOS`, `ARGOS_INGEST_URL` | Conforme modo de execução do servidor | RENOMEAR — linguagem de "processamento" em vez de ARGOS |
| `/app/importar-os` | idem | painel rascunho | **APARECE** | `Situação ARGOS:` | Após upload PDF com sucesso | RENOMEAR — ex. "Situação do processamento" |
| `/app/importar-os` | idem | `ArgosSupportReference` | **APARECE** (ao copiar) | `Pedido ARGOS: {id}` | Clipboard para suporte | RENOMEAR — "Pedido de processamento" |

### ARGOS — oculto por flag (código pronto para reativar)

| Tela/Rota | Arquivo | Flag | Textos no código (não visíveis) | Reativação |
|-----------|---------|------|----------------------------------|------------|
| `/app/backlog` | `BacklogArgosPanel.tsx` | `SHOW_ARGOS_PANEL_FILTERS` | `ARGOS: Todas`, `Com análise ARGOS`, etc. | `backlogUiFlags.ts` |
| `/app/backlog` | `BacklogTable.tsx` / `ArgosCell` | `SHOW_BACKLOG_ARGOS_COLUMN` | coluna `ARGOS`, `Sem análise ARGOS` | idem |
| `/app/dashboard` | `DashboardPage.tsx` | `SHOW_ARGOS_HEALTH_UI` | `ARGOS — Saúde das Esteiras`, `Carregando resumo ARGOS…` | `argosUiFlags.ts` |
| `/app/esteiras/:id` | `ConveyorHealthAnalysisCard.tsx` | `SHOW_ARGOS_HEALTH_UI` | `ARGOS Health`, `Analisar saúde com ARGOS`, estados/erros | idem |
| `/app/*` (sidebar topo) | `AppSidebar.tsx` | `SHOW_ARGOS_SIDEBAR_FAMILY` | `Família ARGOS` | idem |
| `/login`, `/app/alterar-senha` | `LoginBrandPanel.tsx` | `SHOW_ARGOS_LOGIN_BRANDING` | frases com `ecossistema ARGOS`, `manual ARGOS` | idem |

### Multivacia — visível ao usuário

| Tela/Rota | Arquivo | Componente | Status | Texto/Identificador | Contexto | Recomendação |
|-----------|---------|------------|--------|---------------------|----------|--------------|
| `/login` | `src/pages/LoginPage.tsx` | header mobile | **APARECE** | `Multivacia` | Cabeçalho acima do formulário (viewport &lt; lg) | MANTER_VISÍVEL — branding corporativo |
| `/login` | `src/components/login/LoginBrandPanel.tsx` | rótulo marca | **APARECE** | `Multivacia` | Painel esquerdo (desktop) | MANTER_VISÍVEL |
| `/login` | `src/components/login/LoginBrandPanel.tsx` | rodapé painel | **APARECE** | `ecossistema Multivacia` | Texto institucional (flag ARGOS off) | MANTER_VISÍVEL |
| `/login` | `src/components/login/LoginFormCard.tsx` | rodapé formulário | **APARECE** | `SGP Web · ecossistema Multivacia · ambiente corporativo industrial` | Abaixo do botão entrar | MANTER_VISÍVEL |
| `/app/alterar-senha` | `LoginBrandPanel.tsx` (reutilizado) | idem login | **APARECE** | `Multivacia` + `ecossistema Multivacia` | Mesmo painel de marca do login | MANTER_VISÍVEL |

### Multivacia — apenas código interno (não visível)

| Arquivo | Tipo | Conteúdo |
|---------|------|----------|
| `src/index.css` | comentário CSS | `assinatura ouro ARGOS / Multivacia`, `botão outline Multivacia`, vocabulário hover |
| `src/components/shell/FineGridOverlay.tsx` | comentário | `referência Multivacia` |

### Branding relacionado (não é ARGOS nem Multivacia, mas aparece na UI)

| Tela/Rota | Arquivo | Texto | Nota |
|-----------|---------|-------|------|
| `/app/*` | `src/components/shell/BravoSidebarBrand.tsx` | Logo + link **Bravo** (`alt="Bravo"`, `aria-label="Abrir home page da Bravo"`) | Marca cliente/ecossistema; acima do bloco SGP na sidebar |
| `/app/importar-os` | `NovaEsteiraPorDocumentoPage.tsx` | Referências **OS Bravo** em banners técnicos (modo pipeline) | Contexto de importação de documento, não marca Multivacia |

---

## Detalhamento por jornada

### 1. Shell global (`/app/*`)

**ARGOS visível:**
- Rodapé sidebar: `ARGOS · Plataforma industrial`
- Rail: tooltip e badge `AR`
- Header → Tema: `Argos Dark`

**ARGOS oculto:**
- `Família ARGOS` no card de marca SGP (flag `SHOW_ARGOS_SIDEBAR_FAMILY`)

**Multivacia:** não aparece em telas autenticadas.

**Bravo:** logo clicável no topo da sidebar (`BravoSidebarBrand`).

---

### 2. Login e troca de senha

| Termo | Visível? | Onde |
|-------|----------|------|
| **Multivacia** | Sim | `LoginPage` (mobile), `LoginBrandPanel`, `LoginFormCard` |
| **ARGOS** | Não | Substituído por cópia neutra (`SHOW_ARGOS_LOGIN_BRANDING = false`) |

Textos neutros atuais (sem ARGOS):
- *"Uma experiência corporativa focada em profundidade, contraste e no que move a produção."*
- *"Plataforma industrial integrada ao ecossistema Multivacia · identidade visual consistente com a marca."*

---

### 3. Painel Operacional (`/app/backlog`)

| Termo | Visível? |
|-------|----------|
| **ARGOS** | Não — painel de chips, coluna e `Sem análise ARGOS` ocultos |
| **Multivacia** | Não |

Lógica `loadArgosSummary` e merge de `argosSummary` em linhas **continua executando** em modo API real.

---

### 4. Dashboard (`/app/dashboard`)

| Termo | Visível? |
|-------|----------|
| **ARGOS** | Não — seção inteira condicionada a `SHOW_ARGOS_HEALTH_UI` |
| **Multivacia** | Não |

Demais KPIs (esteiras, buckets, minutos apontados) não citam ARGOS.

---

### 5. Detalhe da esteira (`/app/esteiras/:id`)

| Termo | Visível? |
|-------|----------|
| **ARGOS** | Não — `ConveyorHealthAnalysisCard` retorna `null` |
| **Multivacia** | Não |

Mensagens de erro com ARGOS (`friendlyHealthAnalysisMessage`) existem no domínio mas **não chegam à UI** com a flag desligada.

---

### 6. Nova esteira por documento (`/app/importar-os`)

**Principal ponto de exposição ARGOS restante** (fora do shell):

| Elemento | Exemplo de texto |
|----------|------------------|
| Banner modo local | `sem chamada ao ARGOS remoto` |
| Banner stub | `não usa o ARGOS remoto` |
| Banner remoto | `Modo remoto ARGOS` … `ARGOS_INGEST_URL` |
| Status rascunho | `Situação ARGOS:` |
| Copiar suporte | `Pedido ARGOS: …` |

**Multivacia:** não aparece nesta tela. **Bravo** aparece em contexto de pipeline/importação.

---

### 7. Saúde operacional dos colaboradores (`/app/colaboradores/saude-operacional`)

| Termo | Visível? |
|-------|----------|
| **ARGOS** | Não — frases substituídas por cópia neutra |
| **Multivacia** | Não |

Cópia atual:
- Lead: *"Resumo operacional baseado nos dados atuais do colaborador…"*
- Painel: *"Interpretação automática ainda não habilitada…"*

---

## Menções apenas internas (não UX)

### ARGOS — domínio, services, mocks, testes

| Área | Arquivos principais |
|------|---------------------|
| Contrato ingest | `src/domain/argos/*` |
| Saúde esteiras | `conveyorHealth*.ts`, `conveyorHealthDisplay.ts` |
| Backlog helpers | `conveyorHealthBacklog.ts` |
| API | `conveyorsApiService.ts`, `documentDraftApiService.ts` |
| Mocks | `mocks/backlog.ts` (`argosSummary`), `nova-esteira-bloco-contrato.ts` |
| Eventos | `ARGOS_PREP` em `conveyorOperationalEvents.types.ts` |
| Estilos | comentários em `semantic-tokens.css`, `theme.css`, `index.css` |
| Testes UI | `*Argos*.test.ts`, `backlogUiFlags.test.ts`, `argosUiFlags.test.ts` |

### ARGOS — importação (lógica sem string na UI de revisão)

`DocumentDraftReviewPanel.tsx`, `documentDraftReview.ts`, `draftToCreateConveyorInput.ts` — tipos e funções `Argos*`; painel de revisão **não** exibe a palavra ARGOS diretamente ao usuário.

---

## Contagem de ocorrências no código-fonte

| Busca em `src/` | Linhas com match (aprox.) |
|-----------------|---------------------------|
| `ARGOS` / `Argos` / `argos` | ~480 |
| `Multivacia` / `multivacia` | ~12 (quase todas UX login + comentários CSS) |

A grande maioria das ocorrências ARGOS é **tipo, variável, comentário ou teste** — não texto renderizado com as flags atuais.

---

## Pontos de atenção

1. **Inconsistência residual:** ocultamos ARGOS em backlog, dashboard, detalhe e login, mas o **rodapé da sidebar** e **importar OS** ainda expõem o termo em fluxos frequentes.

2. **Tema "Argos Dark":** única menção ARGOS no header; usuário pode confundir com feature de análise.

3. **Multivacia concentrada no login:** aceitável como branding de entrada; não polui operação diária.

4. **Bravo na sidebar:** logo separado de Multivacia/ARGOS — decisão de marca à parte.

5. **Reativação rápida:** duas pastas de flags — `lib/argos/argosUiFlags.ts` e `lib/backlog/backlogUiFlags.ts`.

6. **Testes garantem ausência:** `LoginBrandPanel.test`, `AppSidebar.test`, `ConveyorHealthAnalysisCard.test`, `collaboratorHealthArgosCopy.test`, testes backlog — validam flags `false`.

---

## Recomendações para próxima sprint

### P0 — Alinhar o que ainda aparece

| Item | Ação sugerida |
|------|----------------|
| Rodapé sidebar `ARGOS · Plataforma industrial` | Flag `SHOW_ARGOS_SIDEBAR_FOOTER` ou texto neutro `SGP+` |
| `/app/importar-os` | Renomear labels ARGOS → "processamento" / "interpretação" |
| Tema `Argos Dark` | Renomear label para não citar ARGOS |

### P1 — Manter como está

| Item | Motivo |
|------|--------|
| Multivacia no login | Branding corporativo explícito e localizado |
| Flags + código de saúde/backlog | Preparação para reativação |
| Logo Bravo na sidebar | Marca do negócio, não confunde com ARGOS análise |

### P2 — Governança

1. Unificar flags em `src/lib/argos/argosUiFlags.ts` (incluir reexport de backlog flags ou doc única).
2. Atualizar este inventário quando qualquer flag mudar para `true`.
3. Não remover `domain/argos` nem health services ao ocultar UI.

---

## Anexo — rotas verificadas sem menção UX

Sem **ARGOS** nem **Multivacia** visíveis hoje:

- `/app/planejamento-semanal`
- `/app/nova-esteira` (manual)
- `/app/colaboradores` (lista)
- Apontamento / Minhas atividades / kiosk produção
- Matriz de operações (UI)
- RBAC / admin
- `/app/backlog`, `/app/dashboard` (corpo), `/app/esteiras/:id` (após flags)

---

## Anexo — arquivos com match ARGOS (lista)

```
src/lib/argos/argosUiFlags.ts
src/lib/backlog/backlogUiFlags.ts
src/components/AppSidebar.tsx
src/components/AppHeader.tsx (via theme-constants)
src/components/backlog/BacklogArgosPanel.tsx
src/components/backlog/BacklogTable.tsx
src/components/login/LoginBrandPanel.tsx
src/features/esteiras/ConveyorHealthAnalysisCard.tsx
src/features/gestor/DashboardPage.tsx
src/features/documentos/nova-esteira-documento/NovaEsteiraPorDocumentoPage.tsx
src/domain/argos/*
src/domain/conveyors/conveyorHealth*
src/pages/BacklogPage.tsx
src/services/conveyors/*
… + testes e mocks (ver grep no repositório)
```

## Anexo — arquivos com match Multivacia (lista)

```
src/pages/LoginPage.tsx
src/components/login/LoginBrandPanel.tsx
src/components/login/LoginFormCard.tsx
src/index.css (comentários)
src/components/shell/FineGridOverlay.tsx (comentário)
```

---

*Documento atualizado após sprint de ocultação UX (flags `argosUiFlags` + `backlogUiFlags`). Nenhuma alteração funcional de backend.*
