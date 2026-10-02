# Pós-correção — Contraste Light Mode (`light-executive`)

Branch: `fix/light-mode-contrast-wcag` · Base: `origin/develop` @ `8e9fd062`
Método: medição computada em Chromium (Playwright) — cor do texto composta com a cadeia real de fundos e opacidades, nos 3 temas. Mais confiável que a auditoria estática de `index.md`, que ignorava overrides `!important` e seletores por atributo e superestimou falhas.

## Resultado

| Métrica (light-executive) | Antes | Depois |
|---|---|---|
| Tokens de texto com contraste < 4.5:1 em algum contexto | 68 | 0 |
| Medições reprovadas (1.681 literais de classe × contextos) | 851 | 1 (*) |
| Medições alteradas | — | 948, todas melhoradas, nenhuma piorada |
| Cards da Jornada (âmbar/rosa), sidebar, placeholder, poços `bg-black/N` | reprovados | todos ≥ 4.76:1 |
| Toast / InlineBanner / PriorityPill | já conformes (5.2–17:1) | inalterados |
| argos-dark / slate-dark | — | **0 medições alteradas** (2.122 comparadas) |

(*) `ProductionWorkQueuePage` botão `disabled ... opacity-50` (2.07:1). Componente inativo, isento pelo WCAG 1.4.3; não alterado.

## Causas-raiz corrigidas

| Id | Causa | Correção |
|---|---|---|
| RC-A | Overrides light cobriam só `*-50/100`; faltavam `*-200/300/400` (amber, yellow, rose, red, emerald, sky, blue) e violet | Blocos `:is(.text-x-N, [class*=" text-x-N/"], [class^="text-x-N/"])` em `src/index.css`, mesmo mapeamento dos `*-50/100` (`#92400e`, `#9f1239`, `#065f46`, `#1e3a5f`, `#5b21b6`). Seletores por token não capturam `hover:`/`focus:` |
| RC-A2 | Variantes com opacidade (`text-slate-200/90`, `/95`…) não casavam com `.text-slate-N` | Mesmos blocos, para slate 50–300 e 400/500 |
| RC-B | `bg-black/10–30`, `bg-{amber,yellow,red,rose}-950/N`, `bg-slate-900/60` viram cinza/marrom opaco no light | `rgba(15,23,42,.045)` para poços; `--semantic-ops-warning-bg`/`danger-bg` para 950; `slate-950/N` (scrims de drawer) intencionalmente fora |
| RC-C | Muted `#64748b` = 4.39:1 sobre `#f3f6fa` e 3.5:1 no topo da sidebar | `--color-text-muted` e `--semantic-ops-text-soft` (light) → `#566579`; `text-gray-400/500` incluídos; sidebar (`p` e links inativos) → `#475569` |
| RC-D | `text-white` em `bg-sky-600`/`bg-rose-600` (override global escurece o texto); `text-sgp-void` sobre `bg-sgp-gold`; `text-sgp-gold` em avatar `--void` escuro | Botões `bg-sky-600`→`#0369a1`, `bg-rose-600`→`#be123c` com texto branco; `bg-sgp-gold.text-sgp-void`→`#0f172a`; avatar mantém `#c9a227` |
| RC-E | `text-amber-600` 2.7:1 | Entra no mapeamento âmbar (`#92400e`) |
| RC-F | Placeholder `#94a3b8` = 2.8:1 | `#64748b` (4.76:1 sobre branco) em `::placeholder`, `.sgp-input-app` e `--semantic-login-field-placeholder` |
| RC-G | `text-sgp-blue-bright` (+`/70`, `/75`) 2.9–4.5:1 | `#265b82` (≥ 5.8:1) |

Regra morta removida: `#app-sidebar-nav a.border-transparent { color:#1e293b }` perdia para o `!important` global; passou a ser `:not(:hover)` com `#475569 !important`.

## Arquivos

- `src/index.css` — overrides do tema light (+132/−10)
- `src/styles/semantic-tokens.css` — 3 tokens light
- `src/styles/lightThemeContrast.test.ts` — novo; falha se algum `text-<cor>-(50..400)` usado no código não tiver override light (falha na base com 13 tokens faltando, passa agora) e se o placeholder voltar a `#94a3b8`

Nenhum TSX alterado. SgpToast, SgpInlineBanner, PriorityPill, StatusBadge e backlog badges não foram tocados (já conformes).

## Kiosk / Produção / Apontamento

Literais de `features/production`, `features/kiosk`, `domain/production`, `features/my-work-queue`, `features/colaborador` foram medidos também dentro de `[data-sgp-surface=production|pointing]`: 0 reprovações (exceto o botão desabilitado acima). As regras de superfície existentes têm maior especificidade e continuam valendo; os novos mapeamentos de `*-950/N` produzem os mesmos tokens ops (`warning-bg`/`danger-bg`). Tema escuro: sem diferença computada.

## Validação

- `tsc -b`: OK · `vite build`: OK
- `vitest run`: 1.362 passam, 9 falham em 4 arquivos (`ApontamentoPage`, `ApontamentoGestorPage`, `operationalPlanningApiService`, `operationalPlanningWeeklyViewApiService`). **As mesmas 9 falhas ocorrem na base sem minhas alterações** (pré-existentes, não relacionadas a CSS).
- Inspeção visual (light e argos-dark) dos cards da Jornada, pills de status, botão e toasts/banners.

## Pendências / riscos

- Mapeamentos `*-200/300/400` assumem que o elemento está sobre superfície clara no light. Se algum painel permanecer escuro no light (como o avatar `--void`, já tratado), texto âmbar/rosa ficará escuro sobre escuro. Não foi encontrado outro caso na varredura de `bg-*-800/900/950`, mas a validação foi sobre literais de classe, não sobre todas as telas autenticadas (exigem backend).
- `hover:bg-rose-950/45` e `hover:bg-sky-500` perdem o realce de hover no light (backgrounds `!important`); `bg-sky-600` tem hover próprio.
- Valores de texto `#566579`/`#265b82` são novos tons de apoio; revisar com design se desejado alinhar à paleta.
- Falhas pré-existentes de testes (9) merecem issue separada.
