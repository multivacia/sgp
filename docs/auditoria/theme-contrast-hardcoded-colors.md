# Auditoria — theme, contraste e hardcoded colors

**Branch:** `fix/theme-contrast-hardcoded-colors`  
**Base:** `e5d0caf2` (main)  
**Worktree:** `C:/Users/gustavoalmeida/Documents/sgp-argos-theme-audit`  
**Data:** 2026-07-09

---

## 1. Objetivo da correção

Substituir cores hex/rgba e classes Tailwind amber hardcoded em componentes já identificados, centralizando superfícies, avisos e traços de gráfico em tokens semânticos (`semantic-tokens.css`) reutilizáveis nos três temas (`argos-dark`, `slate-dark`, `light-executive`), sem alterar layout, fluxo, regra de negócio, API, banco ou deploy.

---

## 2. Premissa arquitetural

- **Tokens semânticos** (`src/styles/semantic-tokens.css`) são a fonte de valores por tema.
- **Mapeamento Tailwind** (`src/styles/theme.css`) expõe `--color-semantic-*` para classes utilitárias (`bg-semantic-*`, `via-semantic-*`).
- **Utilitários globais** (`src/index.css`) concentram shims de contraste e classes compostas (ex.: `.sgp-info-warning-banner`).
- **Componentes** consomem tokens/classes semânticas; evitam hex inline em `className` e em props de gráfico quando há token equivalente.
- Escopo fechado: apenas arquivos já alterados nesta branch; sem varredura ampla do repositório.

---

## 3. Resumo dos problemas encontrados

| Problema | Impacto |
|----------|---------|
| Hex de superfície (`#0f1623`, `#0b1018`, etc.) em modais/cards do laboratório-esteiras | Cores não reagem ao tema; duplicação |
| Hex em gradientes (sidebar, drawer de saúde) | Mesmo problema |
| Hex/gradientes no login (`SgpMark`, `HexPatternBackground`) | Duplica tokens SGP já existentes |
| `rgba(15,23,42,0.9)` fixo no stroke de pie charts | Contraste inconsistente no tema claro |
| Classes amber hardcoded em banners/badges da matriz de operações | Duplicação; contraste variável entre temas |
| `text-slate-500/600` em painéis escuros | Contraste abaixo de WCAG AA (~3.5:1 em `#121a26`) |
| Tokens `--semantic-text-primary/secondary` criados sem uso | Ruído no sistema de tokens |

---

## 4. Lista de arquivos alterados

### Estilos (3)
- `src/styles/semantic-tokens.css`
- `src/styles/theme.css`
- `src/index.css`

### Componentes shell / login / charts (6)
- `src/components/AppSidebar.tsx`
- `src/components/login/HexPatternBackground.tsx`
- `src/components/login/SgpMark.tsx`
- `src/components/dashboard/charts/dashboardChartTheme.ts`
- `src/components/dashboard/charts/ExecutiveDashboardCharts.tsx`
- `src/components/dashboard/charts/OperationalDashboardCharts.tsx`

### Features (8)
- `src/features/collaborators/health/CollaboratorHealthSnapshotPanel.tsx`
- `src/features/esteiras/laboratorio-esteiras/ConfigureMatrixModal.tsx`
- `src/features/esteiras/laboratorio-esteiras/EditBasicDataModal.tsx`
- `src/features/esteiras/laboratorio-esteiras/MatrixCard.tsx`
- `src/features/esteiras/laboratorio-esteiras/MountedMatrixBlock.tsx`
- `src/features/esteiras/laboratorio-esteiras/MountedStructureReview.tsx`
- `src/features/operation-matrix/OperationMatrixMacroView.tsx`
- `src/features/operation-matrix/OperationMatrixPreviewPage.tsx`

### Documentação (1)
- `docs/auditoria/theme-contrast-hardcoded-colors.md`

**Total código:** 17 arquivos | **+116 / −21** linhas (sem contar este doc).

---

## 5. Lista de hardcodes removidos

| Valor anterior | Substituição |
|----------------|--------------|
| `via-[#060b14]` (AppSidebar) | `via-semantic-surface-gradient-mid` |
| `via-[#070d16]` (CollaboratorHealthSnapshotPanel) | `via-semantic-surface-drawer-mid` |
| `bg-[#0b1018]` (ConfigureMatrixModal) | `bg-semantic-surface-modal-deep` |
| `bg-[#0f1623]` (5 arquivos laboratório-esteiras + submodal) | `bg-semantic-surface-panel-raised` |
| `hover:bg-[#121b2a]` (MatrixCard) | `hover:bg-semantic-surface-panel-hover` |
| `#101824`, `#0a1018` (HexPatternBackground SVG) | `var(--semantic-sgp-navy)`, `var(--semantic-sgp-navy-deep)` |
| `#d4b366`, `#c99c5c`, `#8b6914`, `#152030` (SgpMark SVG) | tokens `--semantic-sgp-amber/gold-warm/gold-muted/navy-mid/navy-deep` |
| `stroke="rgba(15,23,42,0.9)"` (pie charts) | `chart.pieCellStroke` via `--semantic-chart-pie-cell-stroke` |
| `border-amber-300/90 bg-[#FFFBEB] text-amber-950 dark:…` (info row MacroView) | `.sgp-info-warning-banner` |
| `border-amber-300/80 bg-amber-100/80 … text-amber-950 dark:…` (info badge MacroView) | `.sgp-info-warning-banner` + classes de layout |
| Classes amber/hex inline (OperationMatrixPreviewPage tip) | `.sgp-info-warning-banner` |

---

## 6. Tokens existentes reaproveitados

- `--semantic-sgp-navy`, `--semantic-sgp-navy-deep`, `--semantic-sgp-navy-mid`
- `--semantic-sgp-amber`, `--semantic-sgp-gold-warm`, `--semantic-sgp-gold-muted`
- `--semantic-base-fg` (já existente; referência para tooltips)
- `--color-text-*` do tema `light-executive` (via aliases em tokens novos de superfície)

---

## 7. Novos tokens criados

| Token | Uso |
|-------|-----|
| `--semantic-text-muted` | Shim WCAG + `.text-semantic-muted` |
| `--semantic-text-soft` | `.text-semantic-soft` |
| `--semantic-surface-panel-raised` | Cards/modais laboratório-esteiras |
| `--semantic-surface-panel-hover` | Hover MatrixCard |
| `--semantic-surface-modal-deep` | ConfigureMatrixModal |
| `--semantic-surface-gradient-mid` | Gradiente sidebar |
| `--semantic-surface-drawer-mid` | Gradiente drawer saúde colaborador |
| `--semantic-accent-warning-surface` | `.sgp-info-warning-banner` |
| `--semantic-accent-warning-border` | idem |
| `--semantic-accent-warning-text` | idem |
| `--semantic-chart-pie-cell-stroke` | Stroke células pie (executivo/operacional) |

### Removidos nesta correção (sem uso)

- `--semantic-text-primary` — removido
- `--semantic-text-secondary` — removido

---

## 8. Justificativa para hardcodes mantidos

| Local | Motivo |
|-------|--------|
| Valores hex em `semantic-tokens.css` | Definição canônica do token por tema |
| Fallbacks `rgba(...)` em `dashboardChartTheme.ts` | SSR / `document` indisponível no primeiro render |
| Hex em overrides `light-executive` pré-existentes em `index.css` | Padrão já estabelecido no arquivo; novos overrides `neutral/zinc` seguem o mesmo shim |
| Classes `text-amber-*` condicionais em `OperationMatrixMacroView.tsx` (linhas de texto da info row) | **Pré-existentes na base**; fora do escopo desta passagem (somente `matrixPreviewInfoRowClass` e `matrixPreviewInfoBadgeClass` foram corrigidos) |
| `!important` no shim `text-slate-500/600` | Necessário para vencer especificidade Tailwind em conteúdo legado sem refatorar cada componente |

---

## 9. Validação WCAG

| Item | Status |
|------|--------|
| Shim `text-slate-500/600` → `--semantic-text-muted` (temas escuros) | Implementado; comentário no CSS estima ~5.8:1 em painel `#121a26` |
| Tokens warning por tema | Definidos com pares superfície/texto distintos para escuro e `light-executive` |
| Auditoria automatizada (axe, Lighthouse, contrast checker) | **Não executada nesta sessão** |
| Validação visual manual nos 3 temas | **Pendente** |

---

## 10. Comandos executados

Pré-requisito: worktree sem `node_modules` — executado `npm install` antes dos comandos abaixo.

| Comando | Exit code | Resultado |
|---------|-----------|-----------|
| `npm run build` | **0** | `tsc -b && vite build` OK; bundle gerado em `dist/` |
| `npm test` | **0** | Vitest: **175** arquivos, **1059** testes passando |
| `npm run lint` | **1** | ESLint: **114** problemas (**92** erros, **22** warnings) |

### Detalhe do lint (exit 1)

- Erros concentrados em `server/`, `sgp-print-agent/` e diversos componentes React **não alterados** nesta branch.
- Nos arquivos alterados: apenas **warnings** pré-existentes (`react-hooks/exhaustive-deps` em AppSidebar e charts); **nenhum erro novo** introduzido pelo diff de tokens/contraste.
- **Classificação:** falha **pré-existente** no repositório na base `e5d0caf2`.
- **Bloqueia entrega desta branch?** Não para revisão do diff de tema/contraste (build + test OK). Corrigir lint global é escopo separado.

---

## 11. Riscos residuais

1. Shim global `!important` em `text-slate-500/600` pode afetar elementos que dependiam do tom mais escuro intencionalmente.
2. Classes utilitárias `bg-semantic-*` dependem do mapeamento em `theme.css` — regressão se token for renomeado sem atualizar `@theme`.
3. Amber condicional restante em `OperationMatrixMacroView.tsx` (texto de linhas informativas) permanece hardcoded.
4. Validação visual e WCAG automatizada ainda não realizadas.
5. Lint global do monorepo continua falhando independentemente desta branch.

---

## 12. Próximos pontos recomendados (fora desta branch)

1. Validação visual manual: login, sidebar, laboratório-esteiras, preview/macro matriz, pie charts — nos 3 temas.
2. Opcional: contrast checker nas telas tocadas.
3. Em passagem futura e com escopo aprovado: migrar amber condicional restante em `OperationMatrixMacroView.tsx`.
4. Não expandir varredura de hardcodes para o restante do repositório sem spec dedicada.
